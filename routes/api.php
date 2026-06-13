<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SuperAdmin\StaffController;
use App\Http\Controllers\Staff\EventController;
use App\Http\Controllers\Staff\ParticipantController;

// ─── AUTH ────────────────────────────────────────────────────────────────────
Route::post('/login',  [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/me',      [AuthController::class, 'me'])->middleware('auth:sanctum');

// ─── PUBLIC ──────────────────────────────────────────────────────────────────
// QR code validation — called when Register page loads
Route::get('/events/validate/{token}',   [EventController::class, 'validateToken']);

// Participant self-registration
Route::post('/register-participant',     [ParticipantController::class, 'register']);

// ─── SUPER ADMIN ─────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'role:superadmin'])->group(function () {
    Route::get('/superadmin/staff',          [StaffController::class, 'index']);
    Route::post('/superadmin/staff',         [StaffController::class, 'store']);
    Route::put('/superadmin/staff/{user}',   [StaffController::class, 'update']);
    Route::delete('/superadmin/staff/{user}',[StaffController::class, 'destroy']);
});

// ─── STAFF ───────────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'role:staff'])->group(function () {

    //Dashboard
    Route::get('/staff/dashboard-stats', [EventController::class, 'dashboardStats']);

    
    // Events
    Route::get('/staff/events',             [EventController::class, 'index']);
    Route::post('/staff/events',            [EventController::class, 'store']);
    Route::put('/staff/events/{event}',     [EventController::class, 'update']);
    Route::delete('/staff/events/{event}',  [EventController::class, 'destroy']);

    // Participants per event
    Route::get('/staff/events/{event}/participants',                    [ParticipantController::class, 'index']);
    Route::delete('/staff/events/{event}/participants/{participant}',   [ParticipantController::class, 'destroy']);
    Route::patch('/staff/events/{event}/toggle',                        [EventController::class, 'toggleRegistration']);
});