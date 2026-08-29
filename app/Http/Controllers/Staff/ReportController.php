<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function eventSummary(Request $request, $eventId)
    {
        $data = $this->buildEventSummary($request, $eventId);

        if (!$data) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        if ($request->query('format') === 'pdf') {
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
            ->map(function ($group, $env) use ($sessions) {
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

    public function stepAnalysis(Request $request)
    {
        $data = $this->buildStepAnalysis($request);

        if ($request->query('format') === 'pdf') {
            $pdf = Pdf::loadView('reports.step_analysis', $data)
                    ->setPaper('a4', 'portrait');

            return $request->query('preview')
                ? $pdf->stream('training-analysis.pdf')
                : $pdf->download('training-analysis.pdf');
        }

        return response()->json($data);
    }
     /**
     * Turns a raw step key into something a BFP reader recognises.
     * The database stores 'TPASS_Aim'; a printed report should say
     * 'TPASS — Aim'. Mirrors the map used on the dashboard.
     */
    protected function formatStepName(string $name): string
    {
        return [
            'SoundAlarm'       => 'Sound alarm',
            'GrabExtinguisher' => 'Grab extinguisher',
            'GrabWetBlanket'   => 'Grab wet blanket',
            'GrabTowel'        => 'Grab towel',
            'TPASS_Twist'      => 'TPASS — Twist',
            'TPASS_Pull'       => 'TPASS — Pull',
            'TPASS_Aim'        => 'TPASS — Aim',
            'TPASS_Squeeze'    => 'TPASS — Squeeze',
            'TPASS_Sweep'      => 'TPASS — Sweep',
            'WCTL_Wet'         => 'WCTL — Wet',
            'WCTL_Cover'       => 'WCTL — Cover',
            'WCTL_TurnOff'     => 'WCTL — Turn off',
            'WCTL_Leave'       => 'WCTL — Leave',
            'Evacuate'         => 'Evacuate',
        ][$name] ?? $name;
    }

    protected function buildStepAnalysis(Request $request)
    {
        $from = $request->query('from');
        $to   = $request->query('to');

        $steps = DB::table('simulation_steps')
            ->join('game_sessions', 'simulation_steps.session_id', '=', 'game_sessions.id')
            ->when($from, fn($q) => $q->whereDate('game_sessions.played_at', '>=', $from))
            ->when($to,   fn($q) => $q->whereDate('game_sessions.played_at', '<=', $to))
            ->select(
                'simulation_steps.step_name',
                'simulation_steps.sub_step',
                'simulation_steps.was_correct',
                'simulation_steps.penalty_seconds',
                'game_sessions.environment'
            )
            ->get();

        $byStep = $steps
            ->groupBy(fn($s) => $s->environment . '|' . $s->step_name)
            ->map(function ($group) {
                $total  = $group->count();
                $missed = $group->where('was_correct', 0)->count();
                $first  = $group->first();

                return [
                    'environment'   => $first->environment,
                    'step_name'     => $first->step_name,
                    'step_label'    => $this->formatStepName($first->step_name),
                    'times_run'     => $total,
                    'times_missed'  => $missed,
                    'failure_rate'  => $total > 0 ? round(($missed / $total) * 100) : 0,
                    'avg_penalty'   => $missed > 0
                        ? round($group->where('was_correct', 0)->avg('penalty_seconds'))
                        : 0,
                ];
            })
            ->sortByDesc('failure_rate')
            ->values();

        $worst        = $byStep->first();
        $totalMissed  = $steps->where('was_correct', 0)->count();

        // A readable description of the period, used in the report's
        // meta block. Both bounds are optional, so there are four cases.
        $fmt = fn($d) => \Carbon\Carbon::parse($d)->format('d F Y');

        $periodLabel = match (true) {
            $from && $to => $fmt($from) . ' – ' . $fmt($to),
            (bool) $from => $fmt($from) . ' onward',
            (bool) $to   => 'Up to ' . $fmt($to),
            default      => 'All recorded simulations',
        };

        return [
            'generated_at' => $this->displayTime(),
            'generated_by' => trim($request->user()->first_name . ' ' . $request->user()->last_name),
            'range_from'   => $from,
            'range_to'     => $to,
            'period_label' => $periodLabel,
            'total_steps'  => $steps->count(),
            'overall_failure_rate' => $steps->count() > 0
                ? round(($totalMissed / $steps->count()) * 100)
                : 0,
            'headline'     => $worst
                ? $worst['step_label'] . ' was missed in ' . $worst['failure_rate']
                . '% of ' . ucfirst($worst['environment']) . ' attempts — the most common failure.'
                : null,
            'by_step'      => $byStep,
        ];
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

            // Why the runs ended. A person who keeps running out of time
            // needs different help from one who finishes but scores low.
            $timeouts  = $attempts->where('fail_reason', 'timeout')->count();
            $lowScores = $attempts->where('fail_reason', 'low_score')->count();

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
                'main_barrier'     => $timeouts > $lowScores
                                        ? 'Ran out of time'
                                        : 'Too many wrong actions',
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