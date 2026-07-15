<?php

namespace App\Http\Controllers\Participant;

use App\Http\Controllers\Controller;
use App\Models\GameSession;
use App\Models\SimulationStep;
use Illuminate\Http\Request;

class ParticipantGameController extends Controller
{
    /**
     * GET /api/participant/events
     * Returns all open events the logged-in participant has joined
     * Unity calls this to populate the EventSelectionScene
     */
    public function getMyEvents(Request $request)
    {
        $participant = $request->user();

        $events = $participant->events()
            ->where('is_open', true)
            ->select('events.id', 'events.name', 'events.date')
            ->get();

        $cleanEvents = $events->map(function ($event) {
            return [
                'id'   => $event->id,
                'name' => $event->name,
                'date' => $event->date,
            ];
        });

        return response()->json($cleanEvents);
    }

    /**
     * POST /api/participant/results
     *
     * Receives the result of a Phase 2 simulation run from Unity.
     * Only saves the FIRST passing attempt per participant + event + environment.
     *
     * Pass conditions (both must be true):
     *   1. timeRemaining > 0   — timer did not hit zero (Fail Type A handled in Unity)
     *   2. percentage >= 50%   — not too many wrong actions (Fail Type B handled here)
     *
     * Penalty system:
     *   Wrong object    → -20s (wrong alarm source, wrong extinguisher)
     *   Wrong technique → -10s (wrong TPASS or WCTL sub-step)
     *
     * Score formula:
     *   percentage = max(0, round(100 - (total_penalties × (100 / 90))))
     *
     * Score labels (only passing sessions are saved):
     *   90 - 100% → Excellent
     *   75 - 89%  → Good
     *   50 - 74%  → Passed
     */
    public function submitResult(Request $request)
    {
        // ── STEP 1 — VALIDATE ────────────────────────────────────────
        // Ensure Unity sent all required fields.
        // phase2_score     = seconds remaining when all steps completed
        // total_penalties  = total seconds deducted by wrong actions
        // phase2_passed    = true only when Unity confirms time > 0
        $validated = $request->validate([
            'event_id'                => 'required|integer|exists:events,id',
            'environment'             => 'required|string|in:office,classroom,kitchen',
            'phase2_score'            => 'required|integer|min:0',
            'total_penalties'         => 'required|integer|min:0',
            'phase2_passed'           => 'required|boolean',
            'steps'                   => 'required|array',
            'steps.*.step_name'       => 'required|string',
            'steps.*.sub_step'        => 'nullable|integer',
            'steps.*.chosen_action'   => 'required|string',
            'steps.*.was_correct'     => 'required|boolean',
            'steps.*.penalty_seconds' => 'required|integer|min:0',
        ]);

        // ── STEP 2 — GET THE PARTICIPANT ─────────────────────────────
        // Sanctum reads the Bearer token Unity sends in the header
        // and returns the authenticated participant model.
        $participant = $request->user();

        // ── STEP 3 — GATE 1: TIMER MUST NOT HAVE HIT ZERO ───────────
        // Unity only POSTs when timeRemaining > 0 (Fail Type A is
        // handled locally in Unity). This gate is a server-side
        // safety net in case Unity sends a bad request.
        if (!$validated['phase2_passed']) {
            return response()->json([
                'saved'   => false,
                'message' => 'Result not saved — simulation not passed.',
            ], 200);
        }

        // ── STEP 4 — GATE 2: NO EXISTING RECORD ─────────────────────
        // Only the first passing attempt is saved per
        // participant + event + environment combination.
        // If a record already exists, we keep it and reject this one.
        $existingSession = GameSession::where('participant_id', $participant->id)
            ->where('event_id', $validated['event_id'])
            ->where('environment', $validated['environment'])
            ->exists();

        if ($existingSession) {
            return response()->json([
                'saved'   => false,
                'message' => 'Session already recorded — first attempt kept.',
            ], 200);
        }

        // ── STEP 5 — CALCULATE SCORE ─────────────────────────────────
        // Convert total penalty seconds into a 0-100 percentage.
        // Each second of penalty = 100/90 = 1.11 points deducted.
        // max(0,...) prevents the score from going negative.
        $percentage = max(0, round(100 - ($validated['total_penalties'] * (100 / 90))));

        // ── STEP 6 — GATE 3: MINIMUM 50% SCORE ───────────────────────
        // Fail Type B — participant finished all steps but made too
        // many wrong actions, dropping their score below 50%.
        // Maximum allowed penalties to still pass = 45 seconds.
        // Unity reads 'retry: true' and shows the lose screen.
        if ($percentage < 50) {
            return response()->json([
                'saved'            => false,
                'retry'            => true,
                'message'          => 'Too many mistakes. Try again.',
                'percentage_score' => $percentage,
            ], 200);
        }

        // ── STEP 7 — DETERMINE SCORE LABEL ───────────────────────────
        // Every session that reaches this point is a passing session.
        // "Failed" label is never saved to the database.
        $label = match(true) {
            $percentage >= 90 => 'Excellent',
            $percentage >= 75 => 'Good',
            default           => 'Passed',
        };

        // ── STEP 8 — SAVE THE GAME SESSION ───────────────────────────
        // One row in game_sessions per passing attempt.
        // The UNIQUE constraint on participant_id + event_id +
        // environment is the final (Gate 4) backup safety net.
        $session = GameSession::create([
            'participant_id'   => $participant->id,
            'event_id'         => $validated['event_id'],
            'environment'      => $validated['environment'],
            'phase1_completed' => true,
            'phase2_score'     => $validated['phase2_score'],
            'total_penalties'  => $validated['total_penalties'],
            'percentage_score' => $percentage,
            'score_label'      => $label,
            'phase2_passed'    => true,
            'played_at'        => now(),
        ]);

        // ── STEP 9 — SAVE ALL SIMULATION STEPS ───────────────────────
        // One row per action the participant took during the simulation.
        // session_id links each step back to the session above.
        // Think of it like order items linked to an order.
        foreach ($validated['steps'] as $step) {
            SimulationStep::create([
                'session_id'      => $session->id,
                'step_name'       => $step['step_name'],
                'sub_step'        => $step['sub_step'] ?? null,
                'chosen_action'   => $step['chosen_action'],
                'was_correct'     => $step['was_correct'],
                'penalty_seconds' => $step['penalty_seconds'],
            ]);
        }

        // ── STEP 10 — RETURN SUCCESS ──────────────────────────────────
        // Unity reads this response to show the Win screen.
        // percentage_score and score_label drive the result display.
        return response()->json([
            'saved'            => true,
            'message'          => 'Session saved successfully.',
            'session_id'       => $session->id,
            'percentage_score' => $percentage,
            'score_label'      => $label,
            'time_remaining'   => $validated['phase2_score'],
        ], 201);
    }
}