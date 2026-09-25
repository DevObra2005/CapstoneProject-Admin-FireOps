<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class StaffPasswordController extends Controller
{
    /**
     * PUBLIC — Staff member changes their own password
     * Route: POST /api/staff/change-password
     *
     * Mirrors ParticipantPasswordController::changePassword, but looks
     * in the users table instead of participants. Staff and participants
     * are separate models, so one endpoint cannot serve both.
     *
     * No auth token required. The staff member proves who they are by
     * supplying their CURRENT password, which is why this works from a
     * link in an email where no session exists.
     *
     * PASSWORD STRENGTH: the new password uses Password::defaults(), the
     * central rule in AppServiceProvider (8+ characters, uppercase,
     * lowercase, number, symbol).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'            => 'required|email',
            // Current password is only CHECKED, not created, so it keeps the
            // simple rule. An old weak password must still be accepted here,
            // otherwise the staff member could never change it.
            'current_password' => 'required|string',
            // 'confirmed' makes Laravel look for a matching
            // 'new_password_confirmation' field automatically.
            // Array form, because Password::defaults() is a rule OBJECT.
            'new_password'     => ['required', 'string', 'confirmed', Password::defaults()],
        ], [
            // The old 'new_password.min' message was removed: the Password
            // rule now writes its own messages for length, case, numbers,
            // and symbols.
            'new_password.confirmed' => 'The two new passwords do not match.',
        ]);

        // is_active is checked here as well as at login. An archived
        // staff member should not be able to set a new password and
        // quietly regain a working credential.
        $user = User::where('email', $validated['email'])
            ->where('is_active', 1)
            ->first();

        // ONE message for all three failure cases — no such email,
        // archived account, wrong password. Splitting them would let
        // anyone test which addresses are registered by watching which
        // error comes back.
        if (!$user || !Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'The email address or current password is incorrect.',
            ], 401);
        }

        // Reject a "change" that changes nothing — otherwise someone
        // follows the whole flow and ends up exactly where they started.
        if (Hash::check($validated['new_password'], $user->password)) {
            return response()->json([
                'message' => 'Your new password must be different from your current one.',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($validated['new_password']),
        ]);

        // Kill every existing Sanctum token. If they're still signed in
        // somewhere with the old password, that session must end.
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password changed. Please sign in with your new password.',
        ], 200);
    }
}