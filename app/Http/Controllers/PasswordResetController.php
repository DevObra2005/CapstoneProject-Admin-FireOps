<?php

namespace App\Http\Controllers;

use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    // ─── STEP 1: Receive email, generate token, send link ────────────
    // POST /api/forgot-password
    public function sendResetLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Stop here if email not found
        if (!$user) {
            return response()->json([
                'message' => 'We couldn\'t find an account associated with that email address.'
            ], 404);
        }

        // ← Only reaches here if user EXISTS
        // Delete any existing token for this email first
        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        // Generate a secure random token
        $token = Str::random(64);

        // Store token in the database
        DB::table('password_reset_tokens')->insert([
            'email'      => $request->email,
            'token'      => Hash::make($token),
            'created_at' => now(),
        ]);

        // Build the reset URL pointing to your React app
        $resetUrl = config('app.frontend_url') . '/reset-password?token=' . $token . '&email=' . urlencode($request->email);

        // Send the email
        Mail::to($user->email)->send(
            new PasswordResetMail($user->first_name, $resetUrl)
        );

        return response()->json([
            'message' => 'A password reset link has been sent to your email.'
        ]);
    }

    // ─── STEP 2: Receive token + new password, update user ───────────
    // POST /api/reset-password
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'token'    => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Find the token record
        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        // Check token exists and is valid
        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json([
                'message' => 'Invalid or expired reset link.'
            ], 422);
        }

        // Check token is not older than 60 minutes
        $createdAt = \Carbon\Carbon::parse($record->created_at);
        if ($createdAt->diffInMinutes(now()) > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'message' => 'Reset link has expired. Please request a new one.'
            ], 422);
        }

        // Update the password
        $user = User::where('email', $request->email)->first();
        $user->update(['password' => Hash::make($request->password)]);

        // Delete the used token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Password reset successfully. You can now log in.'
        ]);
    }
}