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

    protected function buildEventSummary(Request $request, $eventId)
    {
        $event = DB::table('events')
            ->where('id', $eventId)
            ->select('id', 'name', 'description', 'date', 'location_name')
            ->first();

        if (!$event) {
            return null;
        }

        $sessions = DB::table('game_sessions')
            ->join('participants', 'game_sessions.participant_id', '=', 'participants.id')
            ->where('game_sessions.event_id', $eventId)
            ->select(
                'game_sessions.participant_id',
                'participants.name as participant_name',
                'game_sessions.environment',
                'game_sessions.attempt_number',
                'game_sessions.percentage_score',
                'game_sessions.score_label',
                'game_sessions.passed',
                'game_sessions.fail_reason'
            )
            ->get();

        // One row per participant-environment pair, keeping only the final
        // attempt. This is the unit everything below is measured against —
        // a participant who ran Office and Kitchen counts as two scenarios.
        $pairs = $sessions
            ->groupBy(fn($s) => $s->participant_id . '|' . $s->environment)
            ->map(fn($group) => $group->sortByDesc('attempt_number')->first())
            ->values();

        $participantsAttempted = $sessions->pluck('participant_id')->unique()->count();
        $scenariosAttempted    = $pairs->count();
        $scenariosPassed       = $pairs->where('passed', 1)->count();

        $byEnvironment = $pairs
            ->groupBy('environment')
            ->map(function ($group, $env) use ($sessions) {
                $attemptsForEnv = $sessions->where('environment', $env)->count();

                return array_merge(
                    [
                        'environment'    => $env,
                        'total_attempts' => $attemptsForEnv,
                    ],
                    $this->summarize($group)
                );
            })
            ->sortBy('environment')
            ->values();

        $participants = $pairs
            ->sortBy('participant_name')
            ->values()
            ->map(function ($s) {
                return [
                    'participant_name' => $s->participant_name,
                    'environment'      => $s->environment,
                    'attempts_made'    => (int) $s->attempt_number,
                    'score'            => (int) $s->percentage_score,
                    'score_label'      => $s->score_label,
                    'passed'           => (bool) $s->passed,
                ];
            });

        return [
            'event'        => $event,
            'generated_at' => now()->format('d M Y, g:i A'),
            'generated_by' => trim($request->user()->first_name . ' ' . $request->user()->last_name),
            'overview' => [
                'participants_attempted' => $participantsAttempted,
                'scenarios_attempted'    => $scenariosAttempted,
                'scenarios_passed'       => $scenariosPassed,
                'scenarios_failed'       => $scenariosAttempted - $scenariosPassed,
                'scenario_pass_rate'     => $scenariosAttempted > 0
                    ? round(($scenariosPassed / $scenariosAttempted) * 100)
                    : 0,
                'final_average_score'    => $scenariosAttempted > 0
                    ? round($pairs->avg('percentage_score'))
                    : 0,
                'total_attempts'         => $sessions->count(),
                'attempts_per_scenario'  => $scenariosAttempted > 0
                    ? round($sessions->count() / $scenariosAttempted, 1)
                    : 0,
            ],
            'by_environment' => $byEnvironment,
            'participants'   => $participants,
        ];
    }

    protected function summarize($pairs): array
    {
        $total  = $pairs->count();
        $passed = $pairs->where('passed', 1)->count();

        return [
            'scenarios'     => $total,
            'passed'        => $passed,
            'failed'        => $total - $passed,
            'pass_rate'     => $total > 0 ? round(($passed / $total) * 100) : 0,
            'average_score' => $total > 0 ? round($pairs->avg('percentage_score')) : 0,
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

        $worst = $byStep->first();

        return [
            'generated_at' => now()->format('d M Y, g:i A'),
            'generated_by' => trim($request->user()->first_name . ' ' . $request->user()->last_name),
            'range_from'   => $from,
            'range_to'     => $to,
            'total_steps'  => $steps->count(),
            'headline'     => $worst
                ? ucfirst($worst['step_name']) . ' was missed in ' . $worst['failure_rate']
                . '% of ' . ucfirst($worst['environment']) . ' attempts — the most common failure.'
                : null,
            'by_step'      => $byStep,
        ];
    }
}