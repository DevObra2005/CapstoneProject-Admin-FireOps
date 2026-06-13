<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Laravel's default behavior is to redirect to a "login" named route
     * when unauthenticated. For an API, we never redirect — we return JSON.
     * Returning null here tells Laravel to throw an AuthenticationException
     * which we then handle as JSON in bootstrap/app.php.
     */
    protected function redirectTo(Request $request): ?string
    {
        return null;
    }
}