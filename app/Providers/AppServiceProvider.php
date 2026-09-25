<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Central password rule for superadmin, staff, and participants.
        // Every controller uses Password::defaults(), so changing the rule
        // here updates register, change password, and forgot password at once.
        // Placed BEFORE the console check so Artisan/Tinker/seeders use it too.
        Password::defaults(function () {
            return Password::min(8)   // at least 8 characters
                ->mixedCase()         // at least one uppercase and one lowercase
                ->numbers()           // at least one number
                ->symbols();          // at least one special character (@, #, !, etc.)
        });

        // Artisan commands have no incoming request, so there's no host to
        // read. Fall back to APP_URL in that case by doing nothing here.
        if ($this->app->runningInConsole()) {
            return;
        }

        $request = request();

        // Generate every URL (assets, certificate links, QR codes, reset
        // links) from the host the browser actually used. Works on
        // 127.0.0.1, a LAN IP, or a tunnel with no config change.
        URL::forceRootUrl($request->getSchemeAndHttpHost());

        // Only force https when the request genuinely arrived over https.
        if ($request->isSecure()) {
            URL::forceScheme('https');
        }
    }
}