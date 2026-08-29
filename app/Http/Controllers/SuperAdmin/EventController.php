<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index()
    {
        $events = Event::with('staff')
            ->orderBy('date', 'desc')
            ->get()
            ->map(function ($event) {
                return [
                    'id'             => $event->id,
                    'name'           => $event->name,
                    'description'    => $event->description,
                    'date'           => $event->date,
                    'location_name'  => $event->location_name,
                    'latitude'       => $event->latitude,
                    'longitude'      => $event->longitude,
                    'radius_meters'  => $event->radius_meters,
                    'is_open'        => $event->is_open,
                    'token'          => $event->token,
                    'created_at'     => $event->created_at,
                    'incharge_name'  => trim($event->staff->first_name . ' ' . $event->staff->last_name),
                    'incharge_email' => $event->staff->email,
                ];
            });

        return response()->json($events);
    }

    public function participants($id)
    {
        $event = Event::findOrFail($id);
        $participants = $event->participants()->get()->map(function ($p) {
            return [
                'id'               => $p->id,
                'name'             => $p->name,
                'email'            => $p->email,
                'organization'     => $p->organization,
                'contact_number'   => $p->contact_number,
                'created_at'       => $p->created_at,
            ];
        });
        return response()->json($participants);
    }

    /**
     * GET /api/superadmin/events/{id}/results
     * GET /api/superadmin/events/{id}/results?include_failed=1
     *
     * Defaults to PASSING sessions only — that is what the event
     * overview stats expect.
     *
     * With include_failed=1 it returns every attempt, pass and fail.
     * The participant detail view needs this to render attempt
     * history; the summary numbers do not, and filter it back down
     * on the frontend.
     */
    public function results($id, Request $request)
    {
        $includeFailed = $request->boolean('include_failed');

        $query = \App\Models\GameSession::with(['participant', 'steps'])
            ->where('event_id', $id);

        if (!$includeFailed) {
            $query->where('passed', true);
        }

        $sessions = $query
            ->orderBy('participant_id')
            ->orderBy('environment')
            ->orderBy('attempt_number')
            ->get()
            ->map(function ($session) {
                return [
                    'id'                => $session->id,
                    'session_id'        => $session->id,
                    'participant_name'  => $session->participant->name ?? '',
                    'participant_email' => $session->participant->email ?? '',
                    'environment'       => $session->environment,
                    'attempt_number'    => $session->attempt_number,
                    'phase2_score'      => $session->phase2_score,
                    'percentage_score'  => $session->percentage_score,
                    'score_label'       => $session->score_label,
                    'total_penalties'   => $session->total_penalties,
                    'phase2_passed'     => $session->phase2_passed,
                    'passed'            => $session->passed,
                    'fail_reason'       => $session->fail_reason,
                    'played_at'         => $session->played_at,
                    'steps'             => $session->steps->map(fn($s) => [
                        'step_name'       => $s->step_name,
                        'chosen_action'   => $s->chosen_action,
                        'was_correct'     => (bool) $s->was_correct,
                        'penalty_seconds' => $s->penalty_seconds,
                    ]),
                ];
            });

        return response()->json($sessions);
    }
}