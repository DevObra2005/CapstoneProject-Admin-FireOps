<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Mail\StaffCredentialsMail;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Http\JsonResponse;

class StaffController extends Controller
{
    // ─── INDEX — Get all staff ────────────────────────────────────────
    // GET /api/superadmin/staff
    public function index(): JsonResponse
    {
        $staff = User::where('role', 'staff')
            ->orderBy('last_name')
            ->get()
            ->map(function ($user) {
                return [
                    'id'          => $user->id,
                    'full_name'   => $user->full_name,
                    'first_name'  => $user->first_name,
                    'last_name'   => $user->last_name,
                    'middle_name' => $user->middle_name,
                    'email'       => $user->email,
                    'is_active'   => $user->is_active,
                    'created_at'  => $user->created_at,
                ];
            });

        return response()->json($staff);
    }

    // ─── STORE — Create new staff account ────────────────────────────
    // POST /api/superadmin/staff
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name'  => 'required|string|max:100',
            'last_name'   => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'email'       => 'required|email|unique:users,email',
        ]);

        $plainPassword = Str::random(8);

        $staff = User::create([
            'first_name'  => $validated['first_name'],
            'last_name'   => $validated['last_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'email'       => $validated['email'],
            'password'    => Hash::make($plainPassword),
            'role'        => 'staff',
            'is_active'   => true,
        ]);

        Mail::to($staff->email)->send(
            new StaffCredentialsMail($staff->full_name, $staff->email, $plainPassword)
        );

        ActivityLog::log(
            action: 'created',
            description: 'Created staff account for ' . $staff->full_name,
            targetId: $staff->id,
            meta: ['email' => $staff->email]
        );

        return response()->json([
            'message' => 'Staff account created and credentials sent to ' . $staff->email,
            'staff'   => [
                'id'        => $staff->id,
                'full_name' => $staff->full_name,
                'email'     => $staff->email,
            ]
        ], 201);
    }

    // ─── SHOW — Get single staff ──────────────────────────────────────
    // GET /api/superadmin/staff/{id}
    public function show(int $id): JsonResponse
    {
        $staff = User::where('role', 'staff')->findOrFail($id);

        // Only log "viewed" once every 5 minutes to avoid spam
        $recentView = ActivityLog::where('target_user_id', $id)
            ->where('action', 'viewed')
            ->where('performed_by', auth()->id())
            ->where('created_at', '>=', now()->subMinutes(5))
            ->exists();

        if (!$recentView) {
            ActivityLog::log(
                action: 'viewed',
                description: 'Viewed staff account of ' . $staff->full_name,
                targetId: $staff->id
            );
        }

        return response()->json([
            'id'          => $staff->id,
            'full_name'   => $staff->full_name,
            'first_name'  => $staff->first_name,
            'last_name'   => $staff->last_name,
            'middle_name' => $staff->middle_name,
            'email'       => $staff->email,
            'is_active'   => $staff->is_active,
            'created_at'  => $staff->created_at,
        ]);
    }

    // ─── UPDATE — Edit staff info ─────────────────────────────────────
    // PUT /api/superadmin/staff/{id}
    public function update(Request $request, int $id): JsonResponse
    {
        $staff = User::where('role', 'staff')->findOrFail($id);

        $validated = $request->validate([
            'first_name'  => 'required|string|max:100',
            'last_name'   => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'email'       => 'required|email|unique:users,email,' . $id,
        ]);

        $oldData = [
            'first_name'  => $staff->first_name,
            'last_name'   => $staff->last_name,
            'middle_name' => $staff->middle_name,
            'email'       => $staff->email,
        ];

        $staff->update($validated);

        ActivityLog::log(
            action: 'edited',
            description: 'Edited staff account of ' . $staff->full_name,
            targetId: $staff->id,
            meta: [
                'before' => $oldData,
                'after'  => $validated,
            ]
        );

        return response()->json([
            'message' => 'Staff account updated successfully.',
            'staff'   => [
                'id'        => $staff->id,
                'full_name' => $staff->full_name,
                'email'     => $staff->email,
            ]
        ]);
    }

    // ─── ARCHIVE — Deactivate staff ───────────────────────────────────
    // PATCH /api/superadmin/staff/{id}/archive
    public function archive(int $id): JsonResponse
    {
        $staff = User::where('role', 'staff')->findOrFail($id);

        if (!$staff->is_active) {
            return response()->json(['message' => 'Staff account is already archived.'], 422);
        }

        $staff->update(['is_active' => false]);

        ActivityLog::log(
            action: 'archived',
            description: 'Archived the account of ' . $staff->full_name,
            targetId: $staff->id
        );

        return response()->json(['message' => $staff->full_name . '\'s account has been archived.']);
    }

    // ─── RESTORE — Reactivate archived staff ─────────────────────────
    // PATCH /api/superadmin/staff/{id}/restore
    public function restore(int $id): JsonResponse
    {
        $staff = User::where('role', 'staff')->findOrFail($id);

        if ($staff->is_active) {
            return response()->json(['message' => 'Staff account is already active.'], 422);
        }

        $staff->update(['is_active' => true]);

        ActivityLog::log(
            action: 'restored',
            description: 'Restored the account of ' . $staff->full_name,
            targetId: $staff->id
        );

        return response()->json(['message' => $staff->full_name . '\'s account has been restored.']);
    }

    // ─── LOGS — Get logs for a specific staff ────────────────────────
    // GET /api/superadmin/staff/{id}/logs
    public function logs(int $id): JsonResponse
    {
        $staff = User::where('role', 'staff')->findOrFail($id);

        $logs = ActivityLog::where(function($query) use ($id) {
                // Fetch logs where staff was the TARGET (actions done TO them)
                // OR where staff was the PERFORMER (actions done BY them)
                $query->where('target_user_id', $id)
                    ->orWhere('performed_by', $id);
            })
            ->with('performer')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($log) {
                return [
                    'id'           => $log->id,
                    'action'       => $log->action,
                    'description'  => $log->description,
                    'performed_by' => $log->performer->full_name ?? 'Unknown',
                    'meta'         => $log->meta,
                    'created_at'   => $log->created_at,
                ];
            });

        return response()->json([
            'staff' => $staff->full_name,
            'logs'  => $logs,
        ]);
    }

    // ─── ALL LOGS — Get all activity logs ────────────────────────────
    // GET /api/superadmin/activity-logs
    public function allLogs(): JsonResponse
    {
        $logs = ActivityLog::with(['performer', 'target'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($log) {
                return [
                    'id'           => $log->id,
                    'action'       => $log->action,
                    'description'  => $log->description,
                    'performed_by' => $log->performer->full_name ?? 'Unknown',
                    'target'       => $log->target->full_name ?? 'N/A',
                    'meta'         => $log->meta,
                    'created_at'   => $log->created_at,
                ];
            });

        return response()->json($logs);
    }
}