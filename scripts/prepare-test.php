<?php

use App\Support\TestDatabaseGuard;
use Illuminate\Contracts\Console\Kernel;

// Explicit, non-destructive test-only migrations; never called by verification.
require __DIR__.'/../vendor/autoload.php';
try {
    if (getenv('APP_ENV') !== 'testing') {
        throw new RuntimeException('Explicit APP_ENV=testing is required.');
    }
    $app = require __DIR__.'/../bootstrap/app.php';
    $kernel = $app->make(Kernel::class);
    $kernel->bootstrap();
    TestDatabaseGuard::assertSafe(config('database.connections.pgsql', []));
    $status = $kernel->call('migrate', ['--force' => true]);
    fwrite(STDOUT, $kernel->output());
    exit($status);
} catch (Throwable $error) {
    fwrite(STDERR, 'Test preparation refused or failed: '.$error->getMessage().PHP_EOL);
    exit(1);
}
