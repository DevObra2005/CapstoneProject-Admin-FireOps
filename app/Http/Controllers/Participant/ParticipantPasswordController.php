<?php

namespace App\Http\Controllers\Participant;

use App\Http\Controllers\Controller;
use App\Models\Participant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ParticipantPasswordController extends Controller
{
    /**
     * PUBLIC — Participant changes their own password
     * Route: POST /api/participant/change-password
     *
     * No auth token required. The participant proves who they are by
     * supplying their CURRENT password, which is why this works from a
     * link in an email where no session exists.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'            => 'required|email',
            'current_password' => 'required|string',
            // 'confirmed' makes Laravel look for a matching
            // 'new_password_confirmation' field automatically.
            'new_password'     => 'required|string|min:8|confirmed',
        ], [
            'new_password.min'       => 'Your new password must be at least 8 characters.',
            'new_password.confirmed' => 'The two new passwords do not match.',
        ]);

        $participant = Participant::where('email', $validated['email'])->first();

        // ONE message for both "no such email" and "wrong password".
        // Splitting them would let anyone test which email addresses are
        // registered by watching which error comes back.
        if (!$participant || !Hash::check($validated['current_password'], $participant->password)) {
            return response()->json([
                'message' => 'The email address or current password is incorrect.',
            ], 401);
        }

        // Reject a "change" that changes nothing — otherwise someone
        // follows the whole flow and ends up exactly where they started.
        if (Hash::check($validated['new_password'], $participant->password)) {
            return response()->json([
                'message' => 'Your new password must be different from your current one.',
            ], 422);
        }

        $participant->update([
            'password' => Hash::make($validated['new_password']),
        ]);

        // Kill every existing Sanctum token. If the phone is still logged
        // in with the old password, that session must end — otherwise
        // changing the password wouldn't actually lock anyone out.
        $participant->tokens()->delete();

        return response()->json([
            'message' => 'Password changed. Please sign in to the FireOps app with your new password.',
        ], 200);
    }
}