<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller; 
use App\Models\Event;
use App\Models\Participant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ParticipantController extends Controller
{

    /**
     * PROTECTED — List participants for an event
     * Route: GET /api/staff/events/{eventId}/participants
     * Requires staff login (any staff account can view any event's
     * participants — not scoped to the event's creator)
     */
    public function index(Request $request, $eventId)
    {
        // Any logged-in staff member can view this event's participants,
        // regardless of which staff account created the event.
        $event = Event::where('id', $eventId)->firstOrFail();

        // withPivot('created_at') pulls the registration timestamp
        // from event_participant — when they joined THIS event
        // This is different from participant->created_at
        // which is when their account was first created
        $participants = $event->participants()
                              ->withPivot('created_at')
                              ->orderBy('event_participant.created_at', 'desc')
                              ->get()
                              ->map(function ($participant) {
                                  return [
                                      'id'             => $participant->id,
                                      'name'           => $participant->name,
                                      'email'          => $participant->email,
                                      'organization'   => $participant->organization,
                                      'contact_number' => $participant->contact_number,
                                      'created_at'     => $participant->pivot->created_at,
                                  ];
                              });

        return response()->json($participants);
    }
    /**
     * PUBLIC — Submit registration form
     * Route: POST /api/register/{token}
     * No auth required — anyone with the QR link can call this
     */
    public function store(Request $request, $token)
    {
        // Find the event by its QR token
        // firstOrFail() returns 404 automatically if token doesn't match any event
        $event = Event::where('token', $token)->firstOrFail();

        // Check if registration is open
        if (!$event->is_open) {
            return response()->json([
                'message' => 'Registration for this event is currently closed.'
            ], 403);
        }

        // Validate incoming form data
        // These rules run before any database work
        // If any rule fails, Laravel returns 422 with error details automatically
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'email'          => 'required|email|max:255',
            'password'       => 'required|string|min:6',
            'organization' => 'nullable|in:Employee,Student',
            'contact_number' => 'nullable|string|max:20',
        ]);

        // Check if this email already has a participant account
        $participant = Participant::where('email', $validated['email'])->first();

        if ($participant) {
            // ── EXISTING ACCOUNT ──────────────────────────────────────────────
            // This person registered before (different event or same event)
            // We verify their password to confirm it's really them
            // Hash::check('plain text', 'hashed value') → true or false
            if (!Hash::check($validated['password'], $participant->password)) {
                return response()->json([
                    'message' => 'This email is already registered. To join this event, please use the password you created during your first registration.'
                ], 401);
            }

            // Password correct — check if already in THIS specific event
            // This queries event_participant where participant_id = X AND event_id = Y
            $alreadyJoined = $participant->events()
                                         ->where('event_id', $event->id)
                                         ->exists();

            if ($alreadyJoined) {
                return response()->json([
                    'message' => 'You are already registered for this event.'
                ], 409);
            }

            // All good — link existing account to this new event
            // attach() inserts one row into event_participant:
            // { participant_id: X, event_id: Y, created_at: now() }
            $participant->events()->attach($event->id);

        } else {
            // ── NEW ACCOUNT ───────────────────────────────────────────────────
            // First time this email is seen — create a new participant account

            // Hash::make() converts plain text to bcrypt hash
            // 'password123' → '$2y$10$randomsalt...hashedvalue'
            // Original password is unrecoverable — but verifiable via Hash::check()
            $participant = Participant::create([
                'name'           => $validated['name'],
                'email'          => $validated['email'],
                'password'       => Hash::make($validated['password']),
                'organization'   => $validated['organization'] ?? null,
                'contact_number' => $validated['contact_number'] ?? null,
            ]);

            // Link new participant to this event via pivot table
            $participant->events()->attach($event->id);
        }

        return response()->json([
            'message'     => 'Registration successful! You can now log in to FireOps.',
            'participant' => [
                'id'    => $participant->id,
                'name'  => $participant->name,
                'email' => $participant->email,
            ]
        ], 201);
    }

   

    /**
     * PROTECTED — Remove participant from an event
     * Route: DELETE /api/staff/events/{eventId}/participants/{participantId}
     * Requires staff login (any staff account can manage any event's
     * participants — not scoped to the event's creator)
     */
    public function destroy(Request $request, $eventId, $participantId)
    {
        // Any logged-in staff member can manage this event, regardless
        // of which staff account created it.
        $event = Event::where('id', $eventId)->firstOrFail();

        // Verify participant exists in this event
        $participant = $event->participants()->findOrFail($participantId);

        // detach() removes ONLY the event_participant row
        // The participant account stays alive — other events + Unity login unaffected
        $event->participants()->detach($participantId);

        return response()->json([
            'message' => 'Participant removed from this event.'
        ]);
    }

     /**
     * PUBLIC — Unity game login
     * Route: POST /api/participant/login
     * No auth required — this IS the authentication step
     *
     * Unity sends: { email, password }
     * Laravel returns: { token, participant }
     */
    public function login(Request $request)
    {
        // Step 1: Validate the incoming data
        // Unity must send both fields — if either is missing,
        // Laravel automatically returns 422 with error details
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        // Step 2: Find the participant by email
        // We use first() not firstOrFail() because we want to control
        // the error message ourselves — firstOrFail() gives a generic 404
        $participant = Participant::where('email', $validated['email'])->first();

        // Step 3: Check if participant exists AND password matches
        // We combine both checks into one response intentionally
        // Why? Security — if we say "email not found" vs "wrong password"
        // separately, attackers can figure out which emails are registered
        // By saying the same message for both, we reveal nothing
        if (!$participant || !Hash::check($validated['password'], $participant->password)) {
            return response()->json([
                'message' => 'Invalid email or password.'
            ], 401); // 401 = Unauthorized
        }

        // Step 4: Delete any existing tokens for this participant
        // This ensures only ONE active session at a time
        // If Mark logs in on two phones, the first phone gets logged out
        // This is important for game integrity — no shared accounts
        $participant->tokens()->delete();

        // Step 5: Create a new Sanctum token
        // 'unity-login' is just a label — it helps identify what the token is for
        // if you ever look at the personal_access_tokens table
        // plainTextToken is the actual string Unity needs to store
        $token = $participant->createToken('unity-login')->plainTextToken;

        // Step 6: Return the token + participant info to Unity
        // Unity will store this token and send it with every future request
        // as: Authorization: Bearer <token>
        return response()->json([
            'token'       => $token,
            'participant' => [
                'id'           => $participant->id,
                'name'         => $participant->name,
                'email'        => $participant->email,
                'organization' => $participant->organization,
            ]
        ], 200);
    }
}