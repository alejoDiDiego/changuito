<?php

namespace App\Providers;

use App\Support\TestDatabaseGuard;
use Illuminate\Support\ServiceProvider;

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
        if ($this->app->environment('testing')) {
            TestDatabaseGuard::assertSafe(config('database.connections.pgsql', []));
            if (config('database.default') !== 'pgsql') {
                throw new \RuntimeException('Testing requires PostgreSQL.');
            }
        }
    }
}
