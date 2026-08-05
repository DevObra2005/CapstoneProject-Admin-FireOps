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

        // Base query — reusable filter by period
        $base = function () use ($period) {
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
        // NOTE: total_staff intentionally removed — staff-management
        // numbers are Superadmin-only info.
        $totalEvents = Event::count();
        $totalSimulations = $base()->count();

        // ── SCORE DISTRIBUTION ────────────────────────────────
        $scoreDistribution = [
            'Excellent' => (clone $base())->where('score_label', 'Excellent')->count(),
            'Good'      => (clone $base())->where('score_label', 'Good')->count(),
            'Passed'    => (clone $base())->where('score_label', 'Passed')->count(),
        ];

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
        $mostFailedSteps = DB::table('simulation_steps')
            ->join('game_sessions', 'simulation_steps.session_id', '=', 'game_sessions.id')
            ->where('simulation_steps.was_correct', false)
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
                // total_staff removed — see note above
            ],
            'score_distribution' => $scoreDistribution,
            'environments'       => $environments,
            'recent_events'      => $recentEvents,
            'most_failed_steps'  => $mostFailedSteps,
        ]);
    }
}