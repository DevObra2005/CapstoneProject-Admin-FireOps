<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
//Admin Controllers
use App\Http\Controllers\SuperAdmin\DashboardController;
use App\Http\Controllers\SuperAdmin\StaffController;
use App\Http\Controllers\SuperAdmin\EventController as AdminEventController;
use App\Http\Controllers\Staff\CertificateController as AdminCertificateController;
//Staff Controllers
use App\Http\Controllers\Staff\StaffDashboardController;
use App\Http\Controllers\Staff\EventController;
use App\Http\Controllers\Staff\CertificateController;
use App\Http\Controllers\Staff\ReportController;
//Participant Controllers
use App\Http\Controllers\Staff\ParticipantController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\Participant\ParticipantGameController;
use App\Http\Controllers\Participant\ParticipantPasswordController;

// AUTH
Route::post('/login',  [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/me',      [AuthController::class, 'me'])->middleware('auth:sanctum');

// PUBLIC 
Route::get('/events/validate/{token}', [EventController::class, 'validateToken']);
Route::post('/register/{token}',       [ParticipantController::class, 'store']);
Route::post('/participant/login',      [ParticipantController::class, 'login']);
Route::post('/participant/change-password',[ParticipantPasswordController::class, 'changePassword'])->middleware('throttle:5,1');

// Password Reset
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
Route::post('/reset-password',  [PasswordResetController::class, 'resetPassword']);

// SUPER ADMIN 
Route::middleware(['auth:sanctum', 'role:superadmin'])->group(function () {

    Route::get('/superadmin/dashboard', [DashboardController::class, 'index']);

    Route::get('/superadmin/staff', [StaffController::class, 'index']);
    Route::post('/superadmin/staff', [StaffController::class, 'store']);
    Route::get('/superadmin/staff/{id}', [StaffController::class, 'show']);
    Route::put('/superadmin/staff/{id}', [StaffController::class, 'update']);
    Route::patch('/superadmin/staff/{id}/archive', [StaffController::class, 'archive']);
    Route::patch('/superadmin/staff/{id}/restore', [StaffController::class, 'restore']);
    Route::get('/superadmin/staff/{id}/logs', [StaffController::class, 'logs']);

    Route::get('/superadmin/events', [AdminEventController::class, 'index']);
    Route::get('/superadmin/events/{id}/participants', [AdminEventController::class, 'participants']);
    Route::get('/superadmin/events/{id}/results',      [AdminEventController::class, 'results']);
    
    Route::get('/superadmin/activity-logs', [StaffController::class, 'allLogs']);

    Route::get('/superadmin/certifications', [AdminCertificateController::class, 'index']);

});

// STAFF 
Route::middleware(['auth:sanctum', 'role:staff'])->group(function () {

    // Dashboard
    Route::get('/staff/dashboard', [StaffDashboardController::class, 'index']);

    // Events 
    Route::get('/staff/events',            [EventController::class, 'index']);
    Route::post('/staff/events',           [EventController::class, 'store']);
    Route::post('/staff/events/{eventId}/participants', [ParticipantController::class, 'storeManual']);
    Route::put('/staff/events/{event}',    [EventController::class, 'update']);
    Route::delete('/staff/events/{event}', [EventController::class, 'destroy']);
    Route::get('/staff/events/{id}/results', [EventController::class, 'getResults']);

    // Toggle event registration open/closed
    Route::patch('/staff/events/{event}/toggle', [EventController::class, 'toggleRegistration']);

    // Participants - scoped to a specific event
    Route::get('/staff/events/{eventId}/participants',                        [ParticipantController::class, 'index']);
    Route::delete('/staff/events/{eventId}/participants/{participantId}',     [ParticipantController::class, 'destroy']);
    Route::get('/staff/participants/import-template', [ParticipantController::class, 'importTemplate']);
    Route::post('/staff/events/{eventId}/participants/import/preview', [ParticipantController::class, 'previewImport']);
    Route::post('/staff/events/{eventId}/participants/import/commit', [ParticipantController::class, 'commitImport']);

    // Certificates
    Route::get('/staff/certifications', [CertificateController::class, 'index']);

    // Reports
    Route::get('/staff/reports/event/{eventId}',     [ReportController::class, 'eventSummary']);
    Route::get('/staff/reports/steps',               [ReportController::class, 'stepAnalysis']);
    Route::get('/staff/reports/follow-up/{eventId}', [ReportController::class, 'followUp']);
});

//Unity - Participant protected routes (requires Sanctum token)
Route::middleware(['auth:sanctum'])->group(function () {

    Route::get('/participant/events', [ParticipantGameController::class, 'getMyEvents']);
    Route::get('/participant/results', [ParticipantGameController::class, 'getMyResults']);
    Route::post('/participant/results', [ParticipantGameController::class, 'submitResult']);
});