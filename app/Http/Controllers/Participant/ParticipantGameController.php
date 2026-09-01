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
     * Returns all open events the logged-in participant has joined.
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
     * Receives the result of a Phase 2 run from Unity.
     *
     * RECORDING RULE — every attempt UP TO AND INCLUDING the first
     * pass is saved. After that the participant's record for this
     * event + environment is final: they can keep playing, they still
     * see a result screen, but nothing further is written.
     *
     * So a participant who fails twice then passes has three rows.
     * A fourth run saves nothing, whatever the outcome.
     *
     * Two independent flags describe the outcome:
     *   phase2_passed → the timer did NOT hit zero
     *   passed        → timer survived AND percentage >= 50
     *
     * fail_reason is null on a pass, otherwise one of:
     *   "timeout"        → ran out of time                    (inferred here)
     *   "low_score"      → finished in time, too many mistakes (inferred here)
     *   "wrong_decision" → Office: cleared the wrong fire      (SENT BY UNITY)
     *
     * The third one cannot be worked out from this payload — see the
     * note above the match block for why.
     */
    public function submitResult(Request $request)
    {
        // ── STEP 0 — NORMALISE THE EMPTY REASON ──────────────────────
        // Unity's JsonUtility cannot omit a field. A null C# string is
        // serialised as "", so a run with no reason to report still sends
        // 'fail_reason': "".
        //
        // Laravel's `nullable` rule treats NULL as absent — not an empty
        // string. Without this line the empty value reaches the `in:` rule
        // below and fails it, and EVERY normal submission would 422:
        // Kitchen, Classroom, and every Office run that did not end in a
        // wrong decision.
        //
        // Converting here rather than loosening the rule keeps the
        // whitelist meaningful: the column can still only ever hold one of
        // three known strings.
        if ($request->input('fail_reason') === '') {
            $request->merge(['fail_reason' => null]);
        }

        // ── STEP 1 — VALIDATE ────────────────────────────────────────
        $validated = $request->validate([
            'event_id'                => 'required|integer|exists:events,id',
            'environment'             => 'required|string|in:office,classroom,kitchen',
            'phase2_score'            => 'required|integer|min:0',
            'total_penalties'         => 'required|integer|min:0',
            'phase2_passed'           => 'required|boolean',

            // OPTIONAL. Only sent when Unity knows something this method
            // cannot work out for itself — see the match block below.
            // Whitelisted rather than free text so the column can only
            // ever hold a value the admin panel knows how to render.
            'fail_reason'             => 'nullable|string|in:timeout,low_score,wrong_decision',

            'steps'                   => 'required|array',
            'steps.*.step_name'       => 'required|string',

            // WAS 'nullable|integer', WHICH DISAGREED WITH UNITY.
            // The C# field is `public string sub_step`, so a non-null value
            // would arrive as text and be rejected with a 422 — taking the
            // whole submission with it, not just that one step.
            //
            // It never fired because nothing has ever set this: both
            // RegisterCorrectAction and RegisterWrongAction hardcode
            // sub_step = null. The field is a leftover from a design where
            // TPASS was ONE step with five sub-actions, before it became
            // five separate steps.
            //
            // Left in place rather than removed — pulling it would mean
            // touching ResultsModel, two call sites in SimulationManager,
            // this file and a migration, for a field that costs nothing.
            // But the types should agree, so that if it is ever used the
            // run still saves.
            'steps.*.sub_step'        => 'nullable|integer',

            'steps.*.chosen_action'   => 'required|string',
            'steps.*.was_correct'     => 'required|boolean',
            'steps.*.penalty_seconds' => 'required|integer|min:0',
        ]);

        $participant = $request->user();

        /// ── STEP 2 — CALCULATE SCORE ─────────────────────────────────
        // Penalties are clamped to the length of the run. A player only
        // ever has 90 seconds to lose, so a larger figure means the
        // client over-counted a hit that ran past the end of the clock.
        // Laravel is the source of truth for scoring, so it does not
        // trust the incoming number blindly.
        $totalTime  = 90;
        $penalties  = min($validated['total_penalties'], $totalTime);

        // Each penalty second costs 100/90 = 1.11 points.
        // max(0,...) stops the score going negative.
        $percentage = max(0, round(100 - ($penalties * (100 / $totalTime))));

        // ── STEP 3 — CLASSIFY THE OUTCOME ────────────────────────────
        // These used to be gates that returned early. Now they only
        // decide WHAT KIND of row we are about to save.
        $timerSurvived = $validated['phase2_passed'];
        $scoreEnough   = $percentage >= 50;
        $passed        = $timerSurvived && $scoreEnough;

        // ── WHY THE RUN ENDED ────────────────────────────────────────
        //
        // Two of the three reasons are worked out here, from data this
        // method already has: no time left means the clock ran out, time
        // left with a sub-50% score means too many mistakes.
        //
        // THE THIRD IS INVISIBLE TO THE SERVER. The Office decision
        // scenario ends a run early when the player clears the wrong fire
        // — that attempt can arrive with 67% and 26 seconds still on the
        // clock, and nothing in this payload says it should have ended at
        // all. Inferring gave "timeout", so the admin panel said "Ran out
        // of time" for a run whose own lose screen said WRONG DECISION.
        //
        // So when Unity names a reason, it wins. Only Unity was there.
        //
        // A PASS ALWAYS OVERRIDES IT. $passed is checked first, so a
        // client that sent a reason on a winning run cannot store one —
        // fail_reason stays null on every pass, as it always has.
        //
        // WHEN NOTHING IS SENT, nothing changes. The two inference arms
        // below are byte-for-byte what this method did before, which is
        // what keeps Kitchen, Classroom and every existing record working.
        $clientReason = $validated['fail_reason'] ?? null;

        $failReason = match (true) {
            $passed                => null,
            $clientReason !== null => $clientReason,
            !$timerSurvived        => 'timeout',
            !$scoreEnough          => 'low_score',
            default                => null,
        };

        // ── STEP 4 — SCORE LABEL ─────────────────────────────────────
        // "Failed" is a real stored value now, not just a column default.
        $label = match (true) {
            !$passed          => 'Failed',
            $percentage >= 90 => 'Excellent',
            $percentage >= 75 => 'Good',
            default           => 'Passed',
        };

        // ── STEP 4.5 — STOP RECORDING AFTER THE FIRST PASS ───────────
        // Once a participant has passed this environment for this event,
        // their record is final. Later runs are practice: they play, they
        // see a result, but nothing is written and the attempt count
        // stops growing.
        //
        // Placed AFTER the score is calculated so the response can still
        // report what they scored on this run, and BEFORE the attempt
        // number is worked out so the count freezes at the passing try.
        $alreadyPassed = GameSession::where('participant_id', $participant->id)
            ->where('event_id', $validated['event_id'])
            ->where('environment', $validated['environment'])
            ->where('passed', true)
            ->exists();

        if ($alreadyPassed) {
            return response()->json([
                'saved'            => false,
                'already_recorded' => true,
                'passed'           => $passed,
                'retry'            => false,   // nothing to retry — they're done
                'fail_reason'      => $failReason,
                'attempt_number'   => 0,       // not a recorded attempt
                'message'          => 'Practice run — your passing attempt is already recorded.',
                'session_id'       => 0,
                'percentage_score' => $percentage,
                'score_label'      => $label,
                'time_remaining'   => $validated['phase2_score'],
            ], 200);
        }

        // ── STEP 5 — WORK OUT THE ATTEMPT NUMBER ─────────────────────
        // Count every prior run for this participant + event +
        // environment, then add one. Attempt 1 is their first try,
        // pass or fail.
        $attemptNumber = GameSession::where('participant_id', $participant->id)
            ->where('event_id', $validated['event_id'])
            ->where('environment', $validated['environment'])
            ->count() + 1;

       // ── STEP 6 — SAVE THE SESSION ────────────────────────────────
        // The old unique constraint is gone, so this succeeds on every
        // attempt instead of only the first.
        //
        // Note total_penalties saves the CLAMPED $penalties, not the raw
        // value Unity sent. A player only ever has 90 seconds to lose, so
        // storing a larger figure would make the admin panel show more
        // penalty time than the run contained.
        $session = GameSession::create([
            'participant_id'   => $participant->id,
            'event_id'         => $validated['event_id'],
            'environment'      => $validated['environment'],
            'attempt_number'   => $attemptNumber,
            'phase1_completed' => true,
            'phase2_score'     => $validated['phase2_score'],
            'total_penalties'  => $penalties,
            'percentage_score' => $percentage,
            'score_label'      => $label,
            'phase2_passed'    => $timerSurvived,
            'passed'           => $passed,
            'fail_reason'      => $failReason,
            'played_at'        => now(),
        ]);

        // ── STEP 7 — SAVE THE STEPS ──────────────────────────────────
        // Saved for failures too — the step breakdown is exactly what
        // makes a failed attempt worth reviewing.
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

        // ── STEP 8 — CERTIFICATE (PASSES ONLY) ───────────────────────
        // Step 4.5 already blocks a second pass from reaching this
        // point, but the guard inside issueCertificate stays as a
        // second line of defence.
        if ($passed) {
            try {
                $this->issueCertificate($participant, $session, $percentage, $label);
            } catch (\Exception $e) {
                Log::error('Certificate issuing failed: ' . $e->getMessage());
            }
        }

        // ── STEP 9 — RESPOND ─────────────────────────────────────────
        // 'saved' is true whenever a row was written. Unity reads
        // 'passed' to choose Win or Lose, and 'already_recorded' to
        // know whether this run counted.
        return response()->json([
            'saved'            => true,
            'already_recorded' => false,
            'passed'           => $passed,
            'retry'            => !$passed,
            'fail_reason'      => $failReason,
            'attempt_number'   => $attemptNumber,
            'message'          => $passed
                                    ? 'Session saved successfully.'
                                    : 'Attempt recorded — not passed.',
            'session_id'       => $session->id,
            'percentage_score' => $percentage,
            'score_label'      => $label,
            'time_remaining'   => $validated['phase2_score'],
        ], 201);
    }

    /**
     * Creates a certificate record, renders the PDF, and emails it.
     * Called only for passing sessions.
     */
    private function issueCertificate($participant, GameSession $session, $percentage, string $label)
    {
        $event = Event::find($session->event_id);

        if (!$event) {
            Log::warning("Certificate skipped: event {$session->event_id} not found.");
            return;
        }

        $exists = Certificate::where('participant_id', $participant->id)
            ->where('event_id', $event->id)
            ->where('environment', $session->environment)
            ->exists();

        if ($exists) {
            return;
        }

        $verificationCode = Str::uuid()->toString();
        $verifyUrl        = url('/certificates/verify/' . $verificationCode);

        $qrCode = 'data:image/svg+xml;base64,' . base64_encode(
            QrCode::format('svg')->size(220)->margin(1)->generate($verifyUrl)
        );

        $embed = function ($relativePath) {
            $path = public_path($relativePath);
            if (!file_exists($path)) return null;
            $type = pathinfo($path, PATHINFO_EXTENSION);
            return 'data:image/' . $type . ';base64,' . base64_encode(file_get_contents($path));
        };

        $pdf = Pdf::loadView('certificates.certificate', [
            'participantName'  => $participant->name,
            'eventName'        => $event->name,
            'environment'      => $session->environment,
            'percentageScore'  => $percentage,
            'scoreLabel'       => $label,
            'issuedAt'         => now()
                                    ->setTimezone(config('app.display_timezone'))
                                    ->format('F j, Y'),
            'qrCode'           => $qrCode,
            'verificationCode' => $verificationCode,
            'bfpLogo'          => $embed('Images/BFP_Logo.png'),
            'fireopsLogo'      => $embed('Images/FireOps_Logo.png'),
        ])->setPaper('a4', 'landscape');

        Certificate::create([
            'participant_id'    => $participant->id,
            'event_id'          => $event->id,
            'game_session_id'   => $session->id,
            'environment'       => $session->environment,
            'verification_code' => $verificationCode,
            'issued_at'         => now(),
        ]);

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
     * Returns the participant's results for ONE event, one entry per
     * environment, for Unity's Performance Results screen.
     *
     * This used to call ->keyBy('environment'), which silently kept
     * whichever row happened to come last once multiple attempts
     * existed. It now picks the passing attempt explicitly and
     * reports how many tries it took to get there.
     */
    public function getMyResults(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|integer|exists:events,id',
        ]);

        $participant = $request->user();
        $eventId     = $validated['event_id'];

        $allEnvironments = ['office', 'kitchen', 'classroom'];

        // Every attempt, grouped by environment.
        // groupBy (not keyBy) keeps ALL rows per environment.
        $sessions = GameSession::with('steps')
            ->where('participant_id', $participant->id)
            ->where('event_id', $eventId)
            ->get()
            ->groupBy('environment');

        $environments = [];

        foreach ($allEnvironments as $env) {
            $attempts = $sessions->get($env);

            // Never played this environment.
            if (!$attempts || $attempts->isEmpty()) {
                $environments[] = [
                    'environment'    => $env,
                    'completed'      => false,
                    'attempt_count'  => 0,
                ];
                continue;
            }

            // The passing attempt. Recording stops at the first pass,
            // so there can only ever be one — but sortByDesc is kept
            // as a harmless safeguard against older data.
            $best = $attempts->where('passed', true)
                             ->sortByDesc('percentage_score')
                             ->first();

            // Tried but never passed — no score to show. The card stays
            // locked, but the attempt count is still reported.
            if (!$best) {
                $environments[] = [
                    'environment'   => $env,
                    'completed'     => false,
                    'attempt_count' => $attempts->count(),
                ];
                continue;
            }

            $steps = $best->steps->map(function ($step) {
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
                'attempt_count'    => $attempts->count(),
                'attempt_number'   => $best->attempt_number,
                'percentage_score' => $best->percentage_score,
                'score_label'      => $best->score_label,
                'time_remaining'   => $best->phase2_score,
                'total_penalties'  => $best->total_penalties,
                'played_at'        => $best->played_at
                                        ? $best->played_at
                                            ->setTimezone(config('app.display_timezone'))
                                            ->format('Y-m-d')
                                        : null,
                'steps'            => $steps,
            ];
        }

        $event = Event::find($eventId);

        return response()->json([
            'event_id'     => (int) $eventId,
            'event_name'   => $event ? $event->name : '',
            'environments' => $environments,
        ], 200);
    }
}