<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class StaffController extends Controller
{
    // GET /api/staff — Get all staff accounts
    public function index()
    {
        $staff = User::where('role', 'staff')
                     ->select('id', 'name', 'email', 'created_at')
                     ->orderBy('created_at', 'desc')
                     ->get();

        return response()->json($staff);
    }

    // POST /api/staff — Create a new staff account
    public function store(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $staff = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role'     => 'staff',
        ]);

        return response()->json([
            'message' => 'Staff created successfully',
            'staff'   => $staff
        ], 201);
    }

    // PUT /api/staff/{id} — Update a staff account
    public function update(Request $request, $id)
    {
        $staff = User::where('role', 'staff')->findOrFail($id);

        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
        ]);

        $staff->name  = $request->name;
        $staff->email = $request->email;

        if ($request->filled('password')) {
            $staff->password = Hash::make($request->password);
        }

        $staff->save();

        return response()->json([
            'message' => 'Staff updated successfully',
            'staff'   => $staff
        ]);
    }

    // DELETE /api/staff/{id} — Delete a staff account
    public function destroy($id)
    {
        $staff = User::where('role', 'staff')->findOrFail($id);
        $staff->delete();

        return response()->json([
            'message' => 'Staff deleted successfully'
        ]);
    }

    // PATCH /api/staff/{id}/toggle — Toggle active/inactive
    public function toggle($id)
    {
        $staff = User::where('role', 'staff')->findOrFail($id);
        $staff->is_active = !$staff->is_active;
        $staff->save();

        return response()->json([
            'message'   => 'Status updated',
            'is_active' => $staff->is_active
        ]);
    }
}