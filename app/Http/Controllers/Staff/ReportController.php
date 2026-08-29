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
}