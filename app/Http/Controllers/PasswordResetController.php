<?php

namespace App\Http\Controllers;

use App\Mail\PasswordResetMail;
use App\Models\Participant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

// -------------------------------------------------------
// TWO SEPARATE FLOWS, ONE CONTROLLER.
//
// users        → superadmin and staff, who log into the React panel
// participants → BFP trainees, who log into the Unity game
//
// They are different tables holding different people, so each flow
// searches exactly one of them. Nothing checks both and nothing has
// to guess which account a reset belongs to.
//
// The token table is shared and keyed by email. That is fine while
// an address only ever belongs to one table — which is the case here,
// since staff use BFP addresses and participants enrol with their own.
// -------------------------------------------------------
class PasswordResetController extends Controller
{
    // ═══════════════════════════════════════════════════════════════
    // STAFF AND ADMIN — used by the React admin panel
    // ═══════════════════════════════════════════════════════════════

    // POST /api/forgot-password
    public function sendResetLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'We couldn\'t find an account associated with that email address.'
            ], 404);
        }

        $token = $this->issueToken($request->email);

        // type=user tells the React reset page which endpoint to post to.
        // Without it the page cannot tell a staff link from a participant one.
        $resetUrl = config('app.frontend_url')
            . '/reset-password?token=' . $token
            . '&email=' . urlencode($request->email)
            . '&type=user';

        Mail::to($user->email)->send(
            new PasswordResetMail($user->first_name, $resetUrl)
        );

        return response()->json([
            'message' => 'A password reset link has been sent to your email.'
        ]);
    }

    // POST /api/reset-password
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'token'    => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $error = $this->verifyToken($request->email, $request->token);
        if ($error) return $error;

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'Invalid or expired reset link.'
            ], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Password reset successfully. You can now log in.'
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // PARTICIPANTS — used by the Unity game
    // ═══════════════════════════════════════════════════════════════

    // POST /api/participant/forgot-password
    public function sendParticipantResetLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $participant = Participant::where('email', $request->email)->first();

        if (!$participant) {
            return response()->json([
                'message' => 'We couldn\'t find an account associated with that email address.'
            ], 404);
        }

        $token = $this->issueToken($request->email);

        $resetUrl = config('app.frontend_url')
            . '/reset-password?token=' . $token
            . '&email=' . urlencode($request->email)
            . '&type=participant';

        // Participant has `name`, not `first_name` — the Mailable takes a
        // display name string either way.
        Mail::to($participant->email)->send(
            new PasswordResetMail($participant->name, $resetUrl)
        );

        return response()->json([
            'message' => 'A password reset link has been sent to your email.'
        ]);
    }

    // POST /api/participant/reset-password
    public function resetParticipantPassword(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'token'    => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $error = $this->verifyToken($request->email, $request->token);
        if ($error) return $error;

        $participant = Participant::where('email', $request->email)->first();

        if (!$participant) {
            return response()->json([
                'message' => 'Invalid or expired reset link.'
            ], 422);
        }

        $participant->update(['password' => Hash::make($request->password)]);

        // Kill every existing Sanctum token. If the phone is still logged in
        // with the old password, that session must end — otherwise resetting
        // the password wouldn't actually lock anyone out. Same rule as
        // ParticipantPasswordController::changePassword.
        $participant->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Password reset successfully. You can now log in to the FireOps app.'
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // SHARED HELPERS
    // Both flows do the same thing with tokens, so the logic lives once.
    // ═══════════════════════════════════════════════════════════════

    /**
     * Creates a fresh reset token for an email and returns the plain
     * version to put in the link. Only the HASH is stored, so a leaked
     * database still doesn't hand anyone a working reset link.
     */
    private function issueToken(string $email): string
    {
        // Any earlier token for this address stops working. Requesting a
        // second link invalidates the first, so an old email left sitting
        // in an inbox can't be used later.
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        $token = Str::random(64);

        DB::table('password_reset_tokens')->insert([
            'email'      => $email,
            'token'      => Hash::make($token),
            'created_at' => now(),
        ]);

        return $token;
    }

    /**
     * Checks a token exists, matches, and is under 60 minutes old.
     * Returns null when everything is fine, or the error response to
     * send back when it isn't.
     */
    private function verifyToken(string $email, string $token)
    {
        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        if (!$record || !Hash::check($token, $record->token)) {
            return response()->json([
                'message' => 'Invalid or expired reset link.'
            ], 422);
        }

        $createdAt = \Carbon\Carbon::parse($record->created_at);

        if ($createdAt->diffInMinutes(now()) > 60) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();

            return response()->json([
                'message' => 'Reset link has expired. Please request a new one.'
            ], 422);
        }

        return null;
    }
}