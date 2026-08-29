<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\GameSession;
use App\Models\Event;
use App\Models\Participant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffDashboardController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->query('period', 'all');

        // ── BASE QUERY — PASSING RUNS ONLY ────────────────────
        // game_sessions now stores failed attempts too, so every
        // quality metric below MUST filter on passed = true.
        // Without this, a participant's three failed attempts
        // count as three completions and drag the average down.
        $base = function () use ($period) {
            $q = GameSession::query()->where('passed', true);
            if ($period === '30days') {
                $q->where('played_at', '>=', now()->subDays(30));
            }
            return $q;
        };

        // ── ALL ATTEMPTS — passes AND failures ────────────────
        // Separate closure for activity/volume metrics, which are
        // about how much the simulation was used, not how well.
        $allAttempts = function () use ($period) {
            $q = GameSession::query();
            if ($period === '30days') {
                $q->where('played_at', '>=', now()->subDays(30));
            }
            return $q;
        };

        // ── OVERVIEW STATS ────────────────────────────────────
        $totalParticipants = Participant::count();

        $played = $base()
            ->distinct('participant_id')
            ->count('participant_id');

        $avgScore = round($base()->avg('percentage_score') ?? 0, 1);

        // ── ACTIVITY STATS ────────────────────────────────────
        $totalEvents      = Event::count();
        $totalSimulations = $base()->count();

        // ── SCORE DISTRIBUTION ────────────────────────────────
        // "Failed" rows are excluded automatically by the passed
        // filter, so the donut keeps its existing three slices.
        $scoreDistribution = [
            'Excellent' => (clone $base())->where('score_label', 'Excellent')->count(),
            'Good'      => (clone $base())->where('score_label', 'Good')->count(),
            'Passed'    => (clone $base())->where('score_label', 'Passed')->count(),
        ];

        // ── ATTEMPT STATS (NEW) ───────────────────────────────
        // Additive only — nothing on the current dashboard reads
        // these yet. They exist so the frontend can show retry
        // behaviour without another backend change.
        $totalAttempts = $allAttempts()->count();

        $attemptedParticipants = $allAttempts()
            ->distinct('participant_id')
            ->count('participant_id');

        $failBreakdown = [
            'timeout'   => (clone $allAttempts())->where('fail_reason', 'timeout')->count(),
            'low_score' => (clone $allAttempts())->where('fail_reason', 'low_score')->count(),
        ];

        // Average tries needed before a participant finally passed.
        // Reads attempt_number on passing rows — a pass on attempt 3
        // means it took them 3 goes.
        $avgAttemptsToPass = round($base()->avg('attempt_number') ?? 0, 1);

        // ── ENVIRONMENTS ──────────────────────────────────────
        $environments = [];
        foreach (['office', 'classroom', 'kitchen'] as $env) {
            $passed = $base()
                ->where('environment', $env)
                ->distinct('participant_id')
                ->count('participant_id');

            $avg = round(
                $base()->where('environment', $env)
                       ->avg('percentage_score') ?? 0,
                1
            );

            $environments[$env] = [
                'passed'    => $passed,
                'avg_score' => $avg,
            ];
        }

        // ── RECENT EVENTS ─────────────────────────────────────
        $recentEvents = Event::orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($event) {
                $participantCount = DB::table('event_participant')
                    ->where('event_id', $event->id)
                    ->count();
                return [
                    'id'                => $event->id,
                    'name'              => $event->name,
                    'location'          => $event->location,
                    'created_at'        => $event->created_at->toDateString(),
                    'is_open'           => $event->is_open,
                    'participant_count' => $participantCount,
                ];
            });

        // ── MOST FAILED STEPS ─────────────────────────────────
        // Filtered to passing sessions so this chart keeps its
        // current meaning: "mistakes made by people who still
        // passed". See note below — worth revisiting once the
        // attempt data has built up.
        $mostFailedSteps = DB::table('simulation_steps')
            ->join('game_sessions', 'simulation_steps.session_id', '=', 'game_sessions.id')
            ->where('simulation_steps.was_correct', false)
            ->where('game_sessions.passed', true)
            ->when($period === '30days', function ($q) {
                $q->where('game_sessions.played_at', '>=', now()->subDays(30));
            })
            ->select(
                'simulation_steps.step_name',
                DB::raw('COUNT(*) as fail_count')
            )
            ->groupBy('simulation_steps.step_name')
            ->orderByDesc('fail_count')
            ->take(5)
            ->get();

        return response()->json([
            'overview' => [
                'total_participants' => $totalParticipants,
                'played'            => $played,
                'avg_score'         => $avgScore,
            ],
            'activity' => [
                'total_events'      => $totalEvents,
                'total_simulations' => $totalSimulations,
            ],
            'attempts' => [
                'total_attempts'         => $totalAttempts,
                'attempted_participants' => $attemptedParticipants,
                'avg_attempts_to_pass'   => $avgAttemptsToPass,
                'fail_breakdown'         => $failBreakdown,
            ],
            'score_distribution' => $scoreDistribution,
            'environments'       => $environments,
            'recent_events'      => $recentEvents,
            'most_failed_steps'  => $mostFailedSteps,
        ]);
    }
}