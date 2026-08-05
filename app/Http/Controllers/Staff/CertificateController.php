<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CertificateController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->query('period', 'all');

        // Reusable period filter — same pattern as the dashboard
        $base = function () use ($period) {
            $q = Certificate::query();
            if ($period === '30days') {
                $q->where('issued_at', '>=', now()->subDays(30));
            }
            return $q;
        };

        // ── OVERVIEW ─────────────────────────────────────────
        $totalIssued = $base()->count();

        $participantsCertified = $base()
            ->distinct('participant_id')
            ->count('participant_id');

        // Participants who earned all three environments within the
        // SAME event — grouped by participant + event, keeping only
        // groups with 3 rows, then counted.
        $completedAll = DB::table('certificates')
            ->when($period === '30days', function ($q) {
                $q->where('issued_at', '>=', now()->subDays(30));
            })
            ->select('participant_id', 'event_id')
            ->groupBy('participant_id', 'event_id')
            ->havingRaw('COUNT(DISTINCT environment) = 3')
            ->get()
            ->count();

        // ── CERTIFICATE LIST ─────────────────────────────────
        // Joined so the frontend gets names and scores in one call
        // instead of N+1 lookups.
        $certificates = DB::table('certificates')
            ->join('participants', 'certificates.participant_id', '=', 'participants.id')
            ->join('events', 'certificates.event_id', '=', 'events.id')
            ->join('game_sessions', 'certificates.game_session_id', '=', 'game_sessions.id')
            ->when($period === '30days', function ($q) {
                $q->where('certificates.issued_at', '>=', now()->subDays(30));
            })
            ->select(
                'certificates.id',
                'certificates.participant_id',
                'participants.name as participant_name',
                'participants.email as participant_email',
                'certificates.event_id',
                'events.name as event_name',
                'certificates.environment',
                'game_sessions.percentage_score',
                'game_sessions.score_label',
                'certificates.issued_at'
            )
            ->orderByDesc('certificates.issued_at')
            ->get()
            ->map(function ($c) {
                return [
                    'id'                => $c->id,
                    'participant_id'    => $c->participant_id,
                    'participant_name'  => $c->participant_name,
                    'participant_email' => $c->participant_email,
                    'event_id'          => $c->event_id,
                    'event_name'        => $c->event_name,
                    'environment'       => $c->environment,
                    'percentage_score'  => (int) $c->percentage_score,
                    'score_label'       => $c->score_label,
                    'issued_at'         => date('Y-m-d', strtotime($c->issued_at)),
                ];
            });

        return response()->json([
            'overview' => [
                'total_issued'           => $totalIssued,
                'participants_certified' => $participantsCertified,
                'completed_all'          => $completedAll,
            ],
            'certificates' => $certificates,
        ]);
    }
}