<?php

namespace App\Http\Controllers\Participant;

use App\Http\Controllers\Controller;
use App\Models\GameSession;
use App\Models\SimulationStep;
use App\Models\Certificate;
use App\Models\Event;
use App\Mail\CertificateMail;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

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
     *
     * A certificate is issued and emailed automatically for every
     * passing session (see STEP 9.5).
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

        // ── STEP 9.5 — ISSUE CERTIFICATE ─────────────────────────────
        // Every session reaching this point is a passing session, so the
        // participant has earned a certificate. Wrapped in try/catch so a
        // PDF or mail failure never breaks the Unity response — the result
        // is already saved above, and the player still sees their win
        // screen. Failures are logged for staff to resend manually.
        try {
            $this->issueCertificate($participant, $session, $percentage, $label);
        } catch (\Exception $e) {
            Log::error('Certificate issuing failed: ' . $e->getMessage());
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

    /**
     * Creates a certificate record, renders the PDF, and emails it to
     * the participant. Called only for passing sessions.
     *
     * The record is saved BEFORE the email is sent, so that a mail
     * failure still leaves a certificate staff can resend later.
     */
    private function issueCertificate($participant, GameSession $session, $percentage, string $label)
    {
        $event = Event::find($session->event_id);

        // Guard — no event, no certificate
        if (!$event) {
            Log::warning("Certificate skipped: event {$session->event_id} not found.");
            return;
        }

        // Guard — never issue twice for the same
        // participant + event + environment combination
        $exists = Certificate::where('participant_id', $participant->id)
            ->where('event_id', $event->id)
            ->where('environment', $session->environment)
            ->exists();

        if ($exists) {
            return;
        }

        // ── 1. Verification code + QR ────────────────────────────
        // SVG rather than PNG — SVG needs no imagick extension and
        // stays sharp at any print size.
        $verificationCode = Str::uuid()->toString();
        $verifyUrl        = url('/certificates/verify/' . $verificationCode);

        $qrCode = 'data:image/svg+xml;base64,' . base64_encode(
            QrCode::format('svg')->size(220)->margin(1)->generate($verifyUrl)
        );

        // ── 2. Embed logos ───────────────────────────────────────
        // dompdf cannot fetch images over HTTP, so files are read
        // from disk and inlined as base64. Missing files return null
        // and the template simply skips that image.
        $embed = function ($relativePath) {
            $path = public_path($relativePath);
            if (!file_exists($path)) return null;
            $type = pathinfo($path, PATHINFO_EXTENSION);
            return 'data:image/' . $type . ';base64,' . base64_encode(file_get_contents($path));
        };

        // ── 3. Render the PDF ────────────────────────────────────
        $pdf = Pdf::loadView('certificates.certificate', [
            'participantName'  => $participant->name,
            'eventName'        => $event->name,
            'environment'      => $session->environment,
            'percentageScore'  => $percentage,
            'scoreLabel'       => $label,
            'issuedAt'         => now()->format('F j, Y'),
            'qrCode'           => $qrCode,
            'verificationCode' => $verificationCode,
            'bfpLogo'          => $embed('Images/BFP_Logo.png'),
            'fireopsLogo'      => $embed('Images/FireOps_Logo.png'),
        ])->setPaper('a4', 'landscape');

        // ── 4. Save the certificate record ───────────────────────
        Certificate::create([
            'participant_id'    => $participant->id,
            'event_id'          => $event->id,
            'game_session_id'   => $session->id,
            'environment'       => $session->environment,
            'verification_code' => $verificationCode,
            'issued_at'         => now(),
        ]);

        // ── 5. Email it to the participant ───────────────────────
        Mail::to($participant->email)->send(new CertificateMail(
            pdfContent:      $pdf->output(),
            participantName: $participant->name,
            environment:     $session->environment,
            eventName:       $event->name,
            percentageScore: $percentage,
            scoreLabel:      $label,
            verifyUrl:       $verifyUrl,
        ));
    }

    /**
     * GET /api/participant/results?event_id={id}
     *
     * Returns the logged-in participant's saved results for ONE event,
     * broken down by the three environments (office, kitchen, classroom).
     *
     * Performance Results in Unity is scoped to the currently-selected
     * event. It shows three environment cards; completed ones display a
     * score + label and open a full step breakdown, not-yet-done ones
     * show as "locked / not completed".
     *
     * For each environment we return either:
     *   - completed: true  + score, label, stats, and the step list, OR
     *   - completed: false (no session for that environment yet)
     *
     * One call returns everything both Unity screens need (cards + detail),
     * so tapping a card needs no second request.
     */
    public function getMyResults(Request $request)
    {
        // ── VALIDATE ─────────────────────────────────────────────────
        $validated = $request->validate([
            'event_id' => 'required|integer|exists:events,id',
        ]);

        $participant = $request->user();
        $eventId     = $validated['event_id'];

        // The three environments we always show, in display order.
        $allEnvironments = ['office', 'kitchen', 'classroom'];

        // ── FETCH THIS PARTICIPANT'S SESSIONS FOR THIS EVENT ─────────
        // Eager-load the steps so we don't run a query per session.
        // (Assumes GameSession has a `steps` relationship — see note below.)
        $sessions = GameSession::with('steps')
            ->where('participant_id', $participant->id)
            ->where('event_id', $eventId)
            ->get()
            ->keyBy('environment'); // index by environment for easy lookup

        // ── BUILD ONE ENTRY PER ENVIRONMENT ──────────────────────────
        $environments = [];

        foreach ($allEnvironments as $env) {
            $session = $sessions->get($env);

            if (!$session) {
                // No record yet — this environment is "not completed".
                $environments[] = [
                    'environment' => $env,
                    'completed'   => false,
                ];
                continue;
            }

            // Completed — include score, stats, and the full step breakdown.
            $steps = $session->steps->map(function ($step) {
                return [
                    'step_name'       => $step->step_name,
                    'sub_step'        => $step->sub_step,
                    'chosen_action'   => $step->chosen_action,
                    'was_correct'     => (bool) $step->was_correct,
                    'penalty_seconds' => $step->penalty_seconds,
                ];
            })->values();

            $environments[] = [
                'environment'      => $env,
                'completed'        => true,
                'percentage_score' => $session->percentage_score,
                'score_label'      => $session->score_label,
                'time_remaining'   => $session->phase2_score,
                'total_penalties'  => $session->total_penalties,
                'played_at'        => $session->played_at
                                        ? $session->played_at->format('Y-m-d')
                                        : null,
                'steps'            => $steps,
            ];
        }

        // Event name for the header pill (optional but nice).
        $event = Event::find($eventId);

        return response()->json([
            'event_id'     => (int) $eventId,
            'event_name'   => $event ? $event->name : '',
            'environments' => $environments,
        ], 200);
    }
}