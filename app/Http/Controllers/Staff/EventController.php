<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Participant;
use App\Models\GameSession;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class EventController extends Controller
{
    /**
     * Get all events.
     * Route: GET /api/staff/events
     */
    public function index(Request $request)
    {
        $events = Event::withCount('participants')
                    ->orderBy('date', 'desc')
                    ->get();

        return response()->json($events);
    }

    /**
     * Create a new event.
     * Route: POST /api/staff/events
     */
    
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'description'   => 'nullable|string',
            'date'          => 'required|date|after_or_equal:today',
            'location_name' => 'nullable|string|max:255',
            'latitude'      => 'nullable|numeric|between:-90,90',
            'longitude'     => 'nullable|numeric|between:-180,180',
            'radius_meters' => 'nullable|integer|min:50|max:1000',
        ]);

        $validated['user_id'] = $request->user()->id;

        $event = Event::create($validated);

        

        // Log after creation — event exists now so $event->name is safe
        ActivityLog::log(
            action: 'created',
            description: 'Created event "' . $event->name . '"',
            targetId: null,
            meta: ['event_id' => $event->id, 'date' => $event->date]
        );

        return response()->json([
            'message' => 'Event created successfully.',
            'event'   => $event,
        ], 201);
    }

    /**
     * Update an existing event.
     * Route: PUT /api/staff/events/{event}
     */
    public function update(Request $request, Event $event)
    {
        $validated = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'description'   => 'nullable|string',
            'date'          => 'sometimes|date',
            'location_name' => 'nullable|string|max:255',
            'latitude'      => 'nullable|numeric|between:-90,90',
            'longitude'     => 'nullable|numeric|between:-180,180',
            'radius_meters' => 'nullable|integer|min:50|max:1000',
        ]);

        // Save old values before updating — same pattern as StaffController
        $oldData = [
            'name'          => $event->name,
            'date'          => $event->date,
            'location_name' => $event->location_name,
        ];

        $event->update($validated);

        ActivityLog::log(
            action: 'edited',
            description: 'Edited event "' . $event->name . '"',
            targetId: null,
            meta: [
                'event_id' => $event->id,
                'before'   => $oldData,
                'after'    => [
                    'name'          => $event->name,
                    'date'          => $event->date,
                    'location_name' => $event->location_name,
                ],
            ]
        );

        return response()->json([
            'message' => 'Event updated successfully.',
            'event'   => $event,
        ]);
    }

    /**
     * Delete an event.
     * Route: DELETE /api/staff/events/{event}
     */
    public function destroy(Request $request, Event $event)
    {
        // Save name and id BEFORE deleting
        // Once deleted, we can no longer rely on the model
        $eventName = $event->name;
        $eventId   = $event->id;

        $event->delete();

        // Use saved values — not $event->name
        ActivityLog::log(
            action: 'deleted',
            description: 'Deleted event "' . $eventName . '"',
            targetId: null,
            meta: ['event_id' => $eventId]
        );

        return response()->json(['message' => 'Event deleted successfully.']);
    }

    /**
     * PUBLIC: Validate a QR token and return basic event info.
     * Route: GET /api/events/validate/{token}
     */
    public function validateToken(string $token)
    {
        $event = Event::where('token', $token)->first();

        if (!$event) {
            return response()->json([
                'valid'   => false,
                'message' => 'Invalid QR code.',
            ], 404);
        }

        if (!$event->is_open) {
            return response()->json([
                'valid'   => false,
                'message' => 'Registration for this event is closed.',
            ], 410);
        }

        return response()->json([
            'valid'          => true,
            'event_id'       => $event->id,
            'name'           => $event->name,
            'date'           => $event->date,
            'location_name'  => $event->location_name,
            'latitude'       => $event->latitude,
            'longitude'      => $event->longitude,
            'radius_meters'  => $event->radius_meters,
            'is_open'        => $event->is_open,
        ]);
    }

    /**
     * Toggle an event's registration open/closed.
     * Route: PATCH /api/staff/events/{event}/toggle
     */
    public function toggleRegistration(Request $request, Event $event)
    {
        $newValue = !$event->is_open;

        $event->update(['is_open' => $newValue]);

        // Log with clear description of what changed
        ActivityLog::log(
            action: 'toggled',
            description: ($newValue ? 'Opened' : 'Closed') . ' registration for event "' . $event->name . '"',
            targetId: null,
            meta: ['event_id' => $event->id, 'is_open' => $newValue]
        );

        return response()->json([
            'is_open' => $newValue,
            'message' => $newValue ? 'Registration opened.' : 'Registration closed.',
        ]);
    }

    /**
     * Dashboard stats.
     */
    public function dashboardStats(Request $request)
    {
        $events = Event::withCount('participants')->get();

        $totalEvents       = $events->count();
        $openEvents        = $events->where('is_open', true)->count();
        $closedEvents      = $events->where('is_open', false)->count();
        $totalParticipants = $events->sum('participants_count');

        return response()->json([
            'total_events'       => $totalEvents,
            'open_events'        => $openEvents,
            'closed_events'      => $closedEvents,
            'total_participants' => $totalParticipants,
        ]);
    }

    /**
     * GET /api/staff/events/{id}/results
     */
    public function getResults($id)
    {
        $event = Event::findOrFail($id);

        $sessions = GameSession::with(['participant', 'steps'])
            ->where('event_id', $id)
            ->orderBy('played_at', 'desc')
            ->get();

        $results = $sessions->map(function ($session) {
            return [
                'session_id'        => $session->id,
                'participant_name'  => $session->participant->name,
                'participant_email' => $session->participant->email,
                'environment'       => $session->environment,
                'phase2_score'      => $session->phase2_score,
                'total_penalties'   => $session->total_penalties,
                'percentage_score'  => $session->percentage_score,
                'score_label'       => $session->score_label,
                'phase2_passed'     => $session->phase2_passed,
                'played_at'         => $session->played_at,
                'steps'             => $session->steps->map(function ($step) {
                    return [
                        'step_name'       => $step->step_name,
                        'sub_step'        => $step->sub_step,
                        'chosen_action'   => $step->chosen_action,
                        'was_correct'     => $step->was_correct,
                        'penalty_seconds' => $step->penalty_seconds,
                    ];
                }),
            ];
        });

        return response()->json($results);
    }
}