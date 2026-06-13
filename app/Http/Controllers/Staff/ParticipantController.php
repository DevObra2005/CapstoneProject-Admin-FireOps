<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Participant;
use App\Models\Event;
use Illuminate\Http\Request;

class ParticipantController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'event_id'       => 'required|exists:events,id',
            'name'           => 'required|string|max:255',
            'email'          => 'required|email|max:255',
            'department'     => 'nullable|string|max:255',
            'contact_number' => 'nullable|string|max:50',
            'latitude'       => 'required|numeric',
            'longitude'      => 'required|numeric',
        ]);

        $event = Event::findOrFail($validated['event_id']);

        // Layer 2: Check if registration is open
        if (!$event->is_open) {
            return response()->json([
                'message' => 'Registration for this event is currently closed.'
            ], 403);
        }

        // Layer 3: Geolocation check
        if ($event->latitude && $event->longitude) {
            $distance = $this->calculateDistance(
                $validated['latitude'], $validated['longitude'],
                $event->latitude, $event->longitude
            );
            if ($distance > $event->radius_meters) {
                return response()->json([
                    'message' => "You must be at the venue to register. You are {$distance}m away.",
                ], 403);
            }
        }

        // Layer 4: Duplicate check
        if (Participant::where('event_id', $event->id)->where('email', $validated['email'])->exists()) {
            return response()->json(['message' => 'This email is already registered for this event.'], 409);
        }

        $participant = Participant::create([
            'event_id'       => $event->id,
            'name'           => $validated['name'],
            'email'          => $validated['email'],
            'department'     => $validated['department'] ?? null,
            'contact_number' => $validated['contact_number'] ?? null,
        ]);

        return response()->json(['message' => 'Registration successful!', 'participant' => $participant], 201);
    }

    public function index(Request $request, Event $event)
    {
        if ($event->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        return response()->json($event->participants()->orderBy('created_at', 'desc')->get());
    }

    public function destroy(Request $request, Event $event, Participant $participant)
    {
        if ($event->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($participant->event_id !== $event->id) {
            return response()->json(['message' => 'Participant not found in this event.'], 404);
        }
        $participant->delete();
        return response()->json(['message' => 'Participant removed.']);
    }

    private function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000;
        $lat1Rad  = deg2rad($lat1); $lat2Rad  = deg2rad($lat2);
        $deltaLat = deg2rad($lat2 - $lat1);
        $deltaLon = deg2rad($lon2 - $lon1);
        $a = sin($deltaLat/2) * sin($deltaLat/2) +
             cos($lat1Rad) * cos($lat2Rad) *
             sin($deltaLon/2) * sin($deltaLon/2);
        return round($earthRadius * 2 * atan2(sqrt($a), sqrt(1-$a)));
    }
}