<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // When served over HTTPS (like through ngrok), force all generated
        // links and asset URLs to use https:// so the browser doesn't block
        // them as "mixed content". Only kicks in when APP_URL is https,
        // so normal http://localhost testing is unaffected.
        if (str_starts_with(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}