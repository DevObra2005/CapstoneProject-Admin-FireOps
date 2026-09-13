<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use App\Models\ActivityLog;

class ReportController extends Controller
{

    /**
     * GET /api/staff/reports/history/{eventId}
     *
     * What has already been produced for this event, and by whom. Reads the
     * reports table rather than recomputing anything — this is the one view
     * that asks about the act of generating, not about the training data.
     */
    public function history(Request $request, $eventId)
    {
        $event = DB::table('events')->where('id', $eventId)->first();

        if (!$event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $rows = DB::table('reports')
            ->join('users', 'reports.user_id', '=', 'users.id')
            ->where('reports.event_id', $eventId)
            ->select(
                'reports.id',
                'reports.report_type',
                'reports.generated_at',
                'users.first_name',
                'users.last_name'
            )
            ->orderByDesc('reports.generated_at')
            ->get();

        // Same wording as the report cards on the page, so a staff member
        // reading the history sees the name they clicked.
        $labels = [
            'event_summary'       => 'Event summary',
            'simulation_analysis' => 'Simulation analysis',
            'follow_up'           => 'Needs more training',
        ];

        return response()->json([
            'total'  => $rows->count(),
            'counts' => [
                'event_summary'       => $rows->where('report_type', 'event_summary')->count(),
                'simulation_analysis' => $rows->where('report_type', 'simulation_analysis')->count(),
                'follow_up'           => $rows->where('report_type', 'follow_up')->count(),
            ],
            // Capped — the panel is a sidebar, not an archive.
            'entries' => $rows->take(8)->map(fn($r) => [
                'id'   => $r->id,
                'type' => $labels[$r->report_type] ?? $r->report_type,
                'by'   => trim($r->first_name . ' ' . $r->last_name),
                'at'   => Carbon::parse($r->generated_at)
                            ->setTimezone(config('app.display_timezone'))
                            ->format('d M Y, g:i A'),
            ])->values(),
        ]);
    }

    /**
     * Records that a report document was produced.
     *
     * Two writes, deliberately: the reports row is the queryable history,
     * the activity log entry is what the Administrator reads. Kept together
     * here so a new report type can't add one and forget the other.
     */
    protected function recordGeneration(
        Request $request,
        int $eventId,
        string $type,
        string $eventName
    ): void {
        DB::table('reports')->insert([
            'user_id'      => $request->user()->id,
            'event_id'     => $eventId,
            'report_type'  => $type,
            'generated_at' => now(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        $label = [
            'event_summary'       => 'Event Summary',
            'simulation_analysis' => 'Simulation Analysis',
            'follow_up'           => 'Follow-Up',
        ][$type] ?? $type;

        ActivityLog::log(
            action: 'generated',
            description: 'Generated ' . $label . ' report for ' . $eventName,
            meta: ['event_id' => $eventId, 'report_type' => $type]
        );
    }

    /**
     * PHRASES THAT IDENTIFY THE OFFICE TWO-FIRE DECISION.
     *
     * That mistake arrives as an ordinary wrong step — step_name
     * "TPASS_Squeeze", was_correct 0 — and the only thing distinguishing
     * it from a mis-tapped button is the chosen_action text Unity sent.
     *
     * THIS IS A REAL COUPLING AND IT SHOULD BE VISIBLE. The text comes
     * from the Far Fire Action Name field on TwoFireDecision, which is an
     * Inspector string somebody can edit. If it is reworded so it contains
     * none of the phrases below, this report silently reclassifies the
     * mistake and prints the wrong advice — no error, just bad guidance.
     *
     * Anyone editing that field should either keep one of these phrases or
     * add the new wording here.
     */
    protected const DECISION_MARKERS = ['wrong fire', 'far fire'];

    public function eventSummary(Request $request, $eventId)
    {
        $data = $this->buildEventSummary($request, $eventId);

        if (!$data) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        if ($request->query('format') === 'pdf') {
            $this->recordGeneration($request, $eventId, 'event_summary', $data['event']->name);

            $pdf = Pdf::loadView('reports.event_summary', $data)
                    ->setPaper('a4', 'portrait');

            $filename = 'event-summary-' . $eventId . '.pdf';

            return $request->query('preview')
                ? $pdf->stream($filename)
                : $pdf->download($filename);
        }

        return response()->json($data);
    }

    /**
     * Current time formatted for a human reader.
     *
     * The app stores everything in UTC so timestamps stay directly
     * comparable regardless of where the server runs. Anything a person
     * READS — reports, emails, PDFs — has to be converted to local time
     * first, or a report generated at 1:09 PM in Natividad prints 5:09 AM.
     */
    protected function displayTime(): string
    {
        return now()
            ->setTimezone(config('app.display_timezone'))
            ->format('d M Y, g:i A');
    }

    protected function buildEventSummary(Request $request, $eventId)
    {
        $event = DB::table('events')
            ->where('id', $eventId)
            ->select('id', 'name', 'description', 'date', 'location_name')
            ->first();

        if (!$event) {
            return null;
        }

        // ── EVERYONE REGISTERED ──────────────────────────────────────
        // Read from the pivot, not from game_sessions. Counting only
        // people who played meant an event where six registered and two
        // showed up reported "2 participants" — the attendance gap
        // disappeared entirely.
        $registered = DB::table('event_participant')
            ->join('participants', 'event_participant.participant_id', '=', 'participants.id')
            ->where('event_participant.event_id', $eventId)
            ->select('participants.id', 'participants.name', 'participants.organization')
            ->orderBy('participants.name')
            ->get();

        $sessions = DB::table('game_sessions')
            ->join('participants', 'game_sessions.participant_id', '=', 'participants.id')
            ->where('game_sessions.event_id', $eventId)
            ->select(
                'game_sessions.participant_id',
                'participants.name as participant_name',
                'participants.organization',
                'game_sessions.environment',
                'game_sessions.attempt_number',
                'game_sessions.percentage_score',
                'game_sessions.score_label',
                'game_sessions.passed'
            )
            ->get();

        // One row per participant-environment pair, keeping only the final
        // attempt. This is the unit everything below is measured against —
        // a participant who ran Office and Kitchen counts as two simulations.
        $pairs = $sessions
            ->groupBy(fn($s) => $s->participant_id . '|' . $s->environment)
            ->map(fn($group) => $group->sortByDesc('attempt_number')->first())
            ->values();

        // All three environments, always — including any not yet playable.
        // Classroom shows as a column of zeros until it ships, then fills
        // with real data on its own. No code change needed at that point.
        $environments = collect(['classroom', 'kitchen', 'office']);

        $playedIds   = $sessions->pluck('participant_id')->unique();
        $playedCount = $playedIds->count();

        $passedIds   = $pairs->where('passed', 1)->pluck('participant_id')->unique();
        $passedCount = $passedIds->count();

        // Participants who passed ALL THREE environments. Reads 0 until
        // Classroom is playable, which is accurate — nobody has completed
        // all three yet — and it keeps the metric consistent with the
        // three columns shown below it.
        $completedAll = $passedIds->filter(function ($pid) use ($pairs, $environments) {
            $theirPasses = $pairs
                ->where('participant_id', $pid)
                ->where('passed', 1)
                ->pluck('environment')
                ->unique();

            return $environments->diff($theirPasses)->isEmpty();
        })->count();

        // Average across passing simulations only. Including failures would
        // drag the figure down and make a good session look mediocre.
        $passedPairs  = $pairs->where('passed', 1);
        $averageScore = $passedPairs->isNotEmpty()
            ? round($passedPairs->avg('percentage_score'))
            : 0;

        // ── SCORE BREAKDOWN, PER ENVIRONMENT ─────────────────────────
        // One column per environment rather than one combined count.
        // Combined, "Excellent: 2" read as two people when it actually
        // meant two simulations — a participant who passed Office and
        // failed Kitchen landed in two different rows. Split this way,
        // each column counts participants in that one environment and
        // the four ratings add up to its total.
        $breakdown = [];

        foreach ($environments as $env) {
            $envPairs = $pairs->where('environment', $env);

            $breakdown[$env] = [
                'total'     => $envPairs->count(),
                'excellent' => $envPairs->where('score_label', 'Excellent')->count(),
                'good'      => $envPairs->where('score_label', 'Good')->count(),
                'passed'    => $envPairs->where('score_label', 'Passed')->count(),
                'not_yet'   => $envPairs->where('passed', 0)->count(),
            ];
        }

        // ── BY ENVIRONMENT ───────────────────────────────────────────
        // Built from the data, so an environment with no sessions is
        // absent rather than showing a row of zeros and a 0% pass rate,
        // which would read as failure instead of absence.
        $byEnvironment = $pairs
            ->groupBy('environment')
            ->map(function ($group, $env) {
                $total     = $group->count();
                $passed    = $group->where('passed', 1)->count();
                $envPasses = $group->where('passed', 1);
                return [
                    'environment'   => $env,
                    'simulations'   => $total,
                    'passed'        => $passed,
                    'average_score' => $envPasses->isNotEmpty()
                                        ? round($envPasses->avg('percentage_score'))
                                        : 0,
                ];
            })
            ->sortBy('environment')
            ->values();

        // ── BY ORGANIZATION ──────────────────────────────────────────
        // Employee vs Student. Collected on every participant and never
        // reported until now. If one group passes at 55% and the other at
        // 90%, the training material is pitched wrong for one of them.
        $byOrganization = collect(['Employee', 'Student'])
            ->map(function ($org) use ($registered, $pairs) {
                $orgIds = $registered->where('organization', $org)->pluck('id');

                $orgPairs  = $pairs->whereIn('participant_id', $orgIds);
                $orgPassed = $orgPairs->where('passed', 1);

                return [
                    'organization'  => $org,
                    'registered'    => $orgIds->count(),
                    'played'        => $orgPairs->pluck('participant_id')->unique()->count(),
                    'passed'        => $orgPassed->pluck('participant_id')->unique()->count(),
                    'simulations'   => $orgPairs->count(),
                    'pass_rate'     => $orgPairs->count() > 0
                                        ? round(($orgPassed->count() / $orgPairs->count()) * 100)
                                        : 0,
                    'average_score' => $orgPassed->isNotEmpty()
                                        ? round($orgPassed->avg('percentage_score'))
                                        : 0,
                ];
            })
            // Only show the section when both groups are actually present.
            // A table with one row and one empty row is noise.
            ->filter(fn($row) => $row['registered'] > 0)
            ->values();

        // ── PARTICIPANT RESULTS ──────────────────────────────────────
        // One row per PERSON, not per person-per-environment. The old
        // version listed someone twice if they played two environments,
        // which made "who finished everything" impossible to see.
        $participants = $registered
            ->filter(fn($p) => $playedIds->contains($p->id))
            ->map(function ($p) use ($pairs, $environments) {
                $theirs = $pairs->where('participant_id', $p->id);

                // Keyed by environment so the template can look up each
                // column directly, filling blanks for ones they skipped.
                $results = [];
                foreach ($environments as $env) {
                    $row = $theirs->firstWhere('environment', $env);

                    $results[$env] = $row ? [
                        'score'  => (int) $row->percentage_score,
                        'label'  => $row->passed ? $row->score_label : 'Not yet',
                        'passed' => (bool) $row->passed,
                    ] : null;
                }

                return [
                    'name'         => $p->name,
                    'organization' => $p->organization,
                    'results'      => $results,
                    'passed_all'   => $environments
                                        ->diff($theirs->where('passed', 1)->pluck('environment'))
                                        ->isEmpty(),
                ];
            })
            ->values();

        // ── DID NOT PLAY ─────────────────────────────────────────────
        $didNotPlay = $registered
            ->filter(fn($p) => !$playedIds->contains($p->id))
            ->map(fn($p) => ['name' => $p->name, 'organization' => $p->organization])
            ->values();

        // ── FOLLOW-UP COUNT ──────────────────────────────────────────
        // Same rule as the Needs More Training report: three or more
        // attempts in one environment with no pass. Reported here as a
        // single line so the officer knows that report has entries,
        // without this document becoming that document.
        $followUpCount = $sessions
            ->groupBy(fn($s) => $s->participant_id . '|' . $s->environment)
            ->filter(fn($attempts) => $attempts->count() >= 3
                                   && $attempts->where('passed', 1)->isEmpty())
            ->map(fn($attempts) => $attempts->first()->participant_id)
            ->unique()
            ->count();

        return [
            'event'        => $event,
            'generated_at' => $this->displayTime(),
            'generated_by' => trim($request->user()->first_name . ' ' . $request->user()->last_name),
            'environments' => $environments,
            'overview' => [
                'registered'         => $registered->count(),
                'played'             => $playedCount,
                'passed'             => $passedCount,
                'completed_all'      => $completedAll,
                'environments_count' => $environments->count(),
                'average_score'      => $averageScore,
                'total_simulations'  => $pairs->count(),
                'total_attempts'     => $sessions->count(),
            ],
            'breakdown'       => $breakdown,
            'by_environment'  => $byEnvironment,
            'by_organization' => $byOrganization,
            'participants'    => $participants,
            'did_not_play'    => $didNotPlay,
            'follow_up_count' => $followUpCount,
        ];
    }

     /**
     * Turns a raw step key into something a BFP reader recognises.
     * The database stores 'TPASS_Aim'; a printed report should say 'Aim'.
     */
    protected function formatStepName(string $name): string
    {
        return [
            // Objects a participant can reach for. These arrive from Unity's
            // Action Name field on the interactable, not from the GameObject
            // name — so renaming a prop in the scene does not change them.
            'ExitDoor'         => 'The exit door',
            'FireAlarm'        => 'The fire alarm',
            'FireExtinguisher' => 'The fire extinguisher',
            'Towel'            => 'The towel',

            // Office and Classroom — TPASS
            'SoundAlarm'       => 'Sound alarm',
            'GrabExtinguisher' => 'Grab extinguisher',
            'TPASS_Twist'      => 'Twist',
            'TPASS_Pull'       => 'Pull',
            'TPASS_Aim'        => 'Aim',
            'TPASS_Squeeze'    => 'Squeeze',
            'TPASS_Sweep'      => 'Sweep',

            // Kitchen
            'GrabTowel'        => 'Grab towel',
            'WCTL_Wet'         => 'Wet',
            'WCTL_Cover'       => 'Cover',
            'WCTL_TurnOff'     => 'Turn off',

            // Shared — the final step in both sequences
            'Evacuate'         => 'Evacuate',
        ][$name] ?? $name;
    }

    /**
     * Was this wrong action the Office two-fire decision?
     *
     * See DECISION_MARKERS at the top of this class for why the check is
     * a phrase match and what that costs.
     */
    protected function isWrongFireChoice(?string $chosenAction): bool
    {
        if (!$chosenAction) {
            return false;
        }

        foreach (self::DECISION_MARKERS as $marker) {
            if (stripos($chosenAction, $marker) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * GET /api/staff/reports/simulation/{eventId}
     *
     * Where participants went wrong during one event's simulations, and
     * what they did instead. The point is not the failure count — it is
     * the pattern behind it, which is what an instructor can act on.
     */
    public function simulationAnalysis(Request $request, $eventId)
    {
        $data = $this->buildSimulationAnalysis($request, $eventId);

        if (!$data) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        if ($request->query('format') === 'pdf') {
           $this->recordGeneration($request, $eventId, 'simulation_analysis', $data['event']->name);

            $pdf = Pdf::loadView('reports.simulation_analysis', $data)
                    ->setPaper('a4', 'portrait');

            $filename = 'simulation-analysis-' . $eventId . '.pdf';

            return $request->query('preview')
                ? $pdf->stream($filename)
                : $pdf->download($filename);
        }

        return response()->json($data);
    }

    /**
     * Sorts a wrong action into one of four behaviours.
     *
     * Phase 1 teaches participants where every object is before they
     * reach Phase 2, so these are not people who could not find the
     * alarm panel. They are people who knew and did something else,
     * which makes each pattern a genuine training finding.
     */
    protected function classifyMistake(string $stepName, ?string $chosenAction): string
    {
        if (!$chosenAction) {
            return 'other';
        }

        // ── THE OFFICE TWO-FIRE DECISION ─────────────────────────────
        //
        // THIS CHECK MUST COME BEFORE THE EXIT ONE BELOW, and the reason
        // is worth spelling out because it produced advice that was not
        // merely vague but backwards.
        //
        // The action text reads "...instead of the one blocking the
        // exit". That contains the word "exit", so the next check caught
        // it and filed the mistake as left_procedure — whose advice is
        // "participants keep going to the exit instead of finishing the
        // step".
        //
        // The player did the OPPOSITE. They walked AWAY from the fire at
        // the exit to reach the far one. An officer reading that report
        // would drill the wrong lesson, and nothing would have flagged it.
        if ($this->isWrongFireChoice($chosenAction)) {
            return 'wrong_priority';
        }

        // Anything involving the exit means they broke off the procedure
        // and headed out. The most common mistake in the data, and the
        // one fire safety training exists to correct.
        if (stripos($chosenAction, 'exit') !== false
            || stripos($chosenAction, 'door') !== false) {
            return 'left_procedure';
        }

        // A valid step from the same mnemonic, performed out of turn —
        // TPASS_Aim when Squeeze was next. They know the actions, not
        // the order.
        $stepPrefix   = strtok($stepName, '_');
        $choicePrefix = strtok($chosenAction, '_');

        if ($stepPrefix === $choicePrefix && str_contains($stepName, '_')) {
            return 'wrong_order';
        }

        // Reached for the wrong thing entirely — the extinguisher when
        // the alarm was next, for instance.
        return 'wrong_action';
    }

    protected function buildSimulationAnalysis(Request $request, $eventId)
    {
        $event = DB::table('events')
            ->where('id', $eventId)
            ->select('id', 'name', 'date', 'location_name')
            ->first();

        if (!$event) {
            return null;
        }

        // Every step from every attempt, passed runs included. A person
        // can pass a run while still tapping the wrong thing twice along
        // the way, and those taps are real training gaps — excluding them
        // because the run ended well would hide the thing this report
        // exists to find.
        $steps = DB::table('simulation_steps')
            ->join('game_sessions', 'simulation_steps.session_id', '=', 'game_sessions.id')
            ->where('game_sessions.event_id', $eventId)
            ->select(
                'simulation_steps.step_name',
                'simulation_steps.chosen_action',
                'simulation_steps.was_correct',
                'game_sessions.environment',
                'game_sessions.participant_id',
                'game_sessions.id as session_id'
            )
            ->get();

        // Fixed list so Classroom is accounted for now and fills in on
        // its own once it ships. Environments with no sessions are
        // dropped below rather than shown as empty sections.
        $allEnvironments = collect(['office', 'kitchen', 'classroom']);

        $environments = $allEnvironments
            ->map(function ($env) use ($steps) {
                $envSteps = $steps->where('environment', $env);

                if ($envSteps->isEmpty()) {
                    return null;
                }

                $mistakes = $envSteps->where('was_correct', 0);

                // ── STEPS THAT WENT WRONG ────────────────────────────
                // A plain count of wrong taps, worst first. An earlier
                // version showed "15 of 20", but that denominator counted
                // taps rather than runs or people, so nobody could tell
                // what it meant. One number, sorted, is enough to say
                // which step needs attention.
                $problemSteps = $mistakes
                    ->groupBy('step_name')
                    ->map(function ($group, $stepName) {
                        // What they reached for instead, most often.
                        // This is what turns a count into a lesson.
                        $topChoice = $group
                            ->groupBy('chosen_action')
                            ->map->count()
                            ->sortDesc()
                            ->keys()
                            ->first();

                        return [
                            'step_label'  => $this->formatStepName($stepName),
                            // Count SIMULATIONS that had this mistake, not
                            // individual wrong taps. Two runs contributed
                            // five wrong taps each at Sound alarm, which
                            // made a tap count read 15 against 7 runs —
                            // a number larger than the total it sits
                            // beside, and one that reflects two bad runs
                            // rather than a widespread problem.
                            'times_wrong' => $group->pluck('session_id')->unique()->count(),
                            'instead'     => $topChoice
                                                ? $this->describeChoice($topChoice)
                                                : null,
                        ];
                    })
                    ->sortByDesc('times_wrong')
                    ->values();

                // Steps attempted in this environment that were never
                // missed. Reported as a single line, not a table — nine
                // rows of zeros buried the rows that mattered.
                $wrongStepNames = $mistakes->pluck('step_name')->unique();

                $cleanSteps = $envSteps
                    ->pluck('step_name')
                    ->unique()
                    ->diff($wrongStepNames)
                    ->map(fn($s) => $this->formatStepName($s))
                    ->sort()
                    ->values();

                // ── WHAT TO TEACH ────────────────────────────────────
                // Derived per environment, not once for the whole event.
                // Office might be dominated by people leaving the
                // procedure while Kitchen is dominated by sequence
                // errors — one combined recommendation would give the
                // wrong advice for one of them.
                $topPattern = $mistakes
                    ->map(fn($s) => $this->classifyMistake($s->step_name, $s->chosen_action))
                    ->countBy()
                    ->sortDesc()
                    ->keys()
                    ->first();

                $advice = match ($topPattern) {
                    'left_procedure' => 'Participants keep going to the exit instead of '
                                      . 'finishing the step. Remind them that leaving is '
                                      . 'the last step, not the first.',
                    'wrong_order'    => 'Participants know the actions but perform them out '
                                      . 'of order. Drill the sequence itself rather than '
                                      . 're-teaching each action.',
                    'wrong_action'   => 'Participants are reaching for the wrong equipment. '
                                      . 'Re-cover which action each situation calls for.',

                    // OFFICE ONLY, and a different KIND of finding from the
                    // three above. Those are procedural — the right actions
                    // in the wrong order, or the wrong equipment.
                    //
                    // This one is about JUDGEMENT. The participants performed
                    // TPASS correctly; they simply chose the wrong fire to
                    // point it at, and left the one blocking their exit to
                    // spread. The technique was never the problem, so drilling
                    // technique would not fix it.
                    'wrong_priority' => 'Participants are using the extinguisher correctly '
                                      . 'but on the wrong fire. Teach them to clear whatever '
                                      . 'threatens the escape route first — a fire between '
                                      . 'them and the exit is the one that has to go, '
                                      . 'whatever else is burning.',

                    default          => null,
                };

                return [
                    'environment'  => $env,
                    'label'        => ucfirst($env),
                    'procedure'    => $env === 'kitchen' ? 'WCTL' : 'TPASS',
                    'participants' => $envSteps->pluck('participant_id')->unique()->count(),
                    'simulations'  => $envSteps->pluck('session_id')->unique()->count(),
                    'mistakes'     => $mistakes->count(),
                    'steps'        => $problemSteps,
                    'clean_steps'  => $cleanSteps,
                    'advice'       => $advice,
                ];
            })
            ->filter()
            ->values();

        return [
            'event'        => $event,
            'generated_at' => $this->displayTime(),
            'generated_by' => trim($request->user()->first_name . ' ' . $request->user()->last_name),
            'environments' => $environments,
        ];
    }

    /**
     * Describes what a participant reached for, as something a BFP reader
     * would say out loud.
     *
     * Kept separate from formatStepName() because the phrasing differs: a
     * step is named ("Aim") but a choice is described ("Went to the exit
     * door"). Mixing the two produced rows reading "Chose ExitDoor".
     */
    protected function describeChoice(string $action): string
    {
        $known = [
            'ExitDoor'         => 'Went to the exit door',
            'FireAlarm'        => 'Sounded the fire alarm',
            'FireExtinguisher' => 'Grabbed the fire extinguisher',
            'Towel'            => 'Grabbed the towel',
        ];

        if (isset($known[$action])) {
            return $known[$action];
        }

        // ── ALREADY A SENTENCE ───────────────────────────────────────
        // Everything this method has ever received was a single token —
        // an object key like "ExitDoor" or a step key like "TPASS_Aim".
        // The fallback below prefixes "Did ", which reads correctly for
        // those: "Did Aim".
        //
        // The Office two-fire decision breaks that assumption. It sends a
        // whole phrase describing what happened, and the fallback turned
        // it into "Did Attacked the far fire instead of..." — visibly
        // broken English in a document going to a station officer.
        //
        // A space is the tell. Keys never contain one; descriptions
        // always do. So anything with a space is already the sentence
        // this method exists to produce, and is returned untouched.
        if (str_contains(trim($action), ' ')) {
            return $action;
        }

        return 'Did ' . $this->formatStepName($action);
    }

    
        /**
     * GET /api/staff/reports/follow-up/{eventId}
     *
     * Lists participants who attempted an environment three or more
     * times without ever passing it.
     *
     * The system certifies people who succeed. This report surfaces the
     * opposite group — the people who tried repeatedly and still cannot
     * perform the procedure. They are the ones who would freeze in a
     * real fire, and nothing else in the system points at them.
     */
    public function followUp(Request $request, $eventId)
    {
        $data = $this->buildFollowUp($request, $eventId);

        if (!$data) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        if ($request->query('format') === 'pdf') {
            $this->recordGeneration($request, $eventId, 'follow_up', $data['event']->name);
            $pdf = Pdf::loadView('reports.follow_up', $data)
                    ->setPaper('a4', 'portrait');

            $filename = 'follow-up-' . $eventId . '.pdf';

            return $request->query('preview')
                ? $pdf->stream($filename)
                : $pdf->download($filename);
        }

        return response()->json($data);
    }

    protected function buildFollowUp(Request $request, $eventId)
    {
        // Three attempts, not two. Someone who failed twice may well
        // pass on their next try; someone who has failed three times
        // has genuinely tried and still cannot do it. Two would pad the
        // list with people who don't need intervention, which makes
        // the whole report easier to ignore.
        $threshold = 3;

        $event = DB::table('events')
            ->where('id', $eventId)
            ->select('id', 'name', 'date', 'location_name')
            ->first();

        if (!$event) {
            return null;
        }

        $sessions = DB::table('game_sessions')
            ->join('participants', 'game_sessions.participant_id', '=', 'participants.id')
            ->where('game_sessions.event_id', $eventId)
            ->select(
                'game_sessions.id as session_id',
                'game_sessions.participant_id',
                'participants.name as participant_name',
                'participants.organization',
                'game_sessions.environment',
                'game_sessions.percentage_score',
                'game_sessions.passed',
                'game_sessions.fail_reason'
            )
            ->get();

        // Group by participant + environment. A person who struggles in
        // Kitchen but passes Office needs help with Kitchen only, so the
        // pair is the right unit — not the person.
        $groups = $sessions->groupBy(fn($s) => $s->participant_id . '|' . $s->environment);

        $struggling = $groups->filter(function ($attempts) use ($threshold) {
            return $attempts->count() >= $threshold
                && $attempts->where('passed', 1)->isEmpty();
        });

        // Pull the step records for every struggling attempt in one query
        // rather than one per row. Keyed by session_id for lookup below.
        $sessionIds = $struggling->flatten()->pluck('session_id')->all();

        $stepsBySession = empty($sessionIds)
            ? collect()
            : DB::table('simulation_steps')
                ->whereIn('session_id', $sessionIds)
                ->where('was_correct', 0)
                ->select('session_id', 'step_name', 'chosen_action')
                ->get()
                ->groupBy('session_id');

        $rows = $struggling->map(function ($attempts) use ($stepsBySession) {
            $first = $attempts->first();

            // Every wrong action this person made across all their
            // attempts in this environment, flattened into one list.
            $allMistakes = $attempts->flatMap(
                fn($a) => $stepsBySession->get($a->session_id, collect())
            );

            // The step they got wrong most often. That is what an
            // instructor should work on with them — not a generic
            // "needs help" note.
            $dominantStep = $allMistakes
                ->groupBy('step_name')
                ->map->count()
                ->sortDesc()
                ->keys()
                ->first();

            // What they chose instead, most often, on that step.
            $dominantChoice = $dominantStep
                ? $allMistakes
                    ->where('step_name', $dominantStep)
                    ->groupBy('chosen_action')
                    ->map->count()
                    ->sortDesc()
                    ->keys()
                    ->first()
                : null;

            // ── WHY THE RUNS ENDED ───────────────────────────────────
            // A person who keeps running out of time needs different help
            // from one who finishes but scores low — and both need
            // different help again from one who keeps choosing the wrong
            // fire.
            //
            // wrong_decision USED TO COUNT AS NEITHER. Someone who failed
            // three times on that choice had timeouts 0 and lowScores 0,
            // and `0 > 0` is false — so the report told the officer they
            // made too many wrong actions, when their technique was fine
            // and their judgement was the problem. Silently wrong, on the
            // one report whose entire purpose is deciding who to sit down
            // with.
            $timeouts   = $attempts->where('fail_reason', 'timeout')->count();
            $lowScores  = $attempts->where('fail_reason', 'low_score')->count();
            $decisions  = $attempts->where('fail_reason', 'wrong_decision')->count();

            $barriers = [
                'Ran out of time'          => $timeouts,
                'Too many wrong actions'   => $lowScores,
                'Chose the wrong priority' => $decisions,
            ];

            // Highest count wins. arsort keeps insertion order on ties, so
            // a tie falls back to the order above — which puts the two
            // long-standing reasons ahead of the new one rather than
            // letting a single decision failure outrank three timeouts.
            arsort($barriers);
            $mainBarrier = array_key_first($barriers);

            return [
                'participant_name' => $first->participant_name,
                'organization'     => $first->organization,
                'environment'      => $first->environment,
                'attempts'         => $attempts->count(),
                'best_score'       => (int) $attempts->max('percentage_score'),
                'dominant_step'    => $dominantStep
                                        ? $this->formatStepName($dominantStep)
                                        : null,
                'dominant_choice'  => $dominantChoice
                                        ? $this->formatStepName($dominantChoice)
                                        : null,
                'main_barrier'     => $mainBarrier,
            ];
        })
        ->sortByDesc('attempts')
        ->values();

        // How many distinct people, not pairs — one person appearing for
        // both Kitchen and Office is one person needing help.
        $peopleCount = $struggling
            ->map(fn($attempts) => $attempts->first()->participant_id)
            ->unique()
            ->count();

        // Which environment produces the most struggling participants.
        // Named in the summary so the officer knows where to focus.
        $worstEnvironment = $rows->groupBy('environment')
            ->map->count()
            ->sortDesc()
            ->keys()
            ->first();

        return [
            'event'        => $event,
            'generated_at' => $this->displayTime(),
            'generated_by' => trim($request->user()->first_name . ' ' . $request->user()->last_name),
            'threshold'    => $threshold,
            'summary' => [
                'people_needing_followup' => $peopleCount,
                'cases'                   => $rows->count(),
                'total_participants'      => $sessions->pluck('participant_id')->unique()->count(),
                'worst_environment'       => $worstEnvironment,
            ],
            'rows' => $rows,
        ];
    }
}