<?php

use Illuminate\Support\Facades\Route;
use App\Models\Certificate;

/*
|--------------------------------------------------------------------------
| Public certificate verification — no auth required.
| This is the URL encoded in each certificate's QR code, so anyone
| scanning a printed certificate can confirm it is genuine.
|
| Must stay ABOVE the SPA catch-all below, or React would swallow it.
|--------------------------------------------------------------------------
*/
Route::get('/certificates/verify/{code}', function ($code) {
    $certificate = Certificate::with(['participant', 'event', 'gameSession'])
        ->where('verification_code', $code)
        ->first();

    return view('certificates.verify', ['certificate' => $certificate]);
})->name('certificates.verify');

/*
|--------------------------------------------------------------------------
| SPA catch-all — hands every other URL to the React router.
| Keep this LAST.
|--------------------------------------------------------------------------
*/
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');