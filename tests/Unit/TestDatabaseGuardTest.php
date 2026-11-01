<?php

use App\Support\TestDatabaseGuard;
use Symfony\Component\Process\Process;

it('rejects development database before any connection', function () {
    expect(fn () => TestDatabaseGuard::assertSafe(['driver' => 'pgsql', 'database' => 'changuito_dev', 'username' => 'changuito_dev']))->toThrow(RuntimeException::class, 'Unsafe test database');
});
it('rejects unsafe application bootstrap before explicit migration', function () {
    $process = new Process([PHP_BINARY, 'scripts/prepare-test.php'], dirname(__DIR__, 2), [
        'APP_ENV' => 'testing',
        'DB_DATABASE' => 'changuito_dev',
        'DB_USERNAME' => 'changuito_dev',
        'DB_HOST' => 'invalid.invalid',
    ]);
    $process->run();
    expect($process->isSuccessful())->toBeFalse();
    expect($process->getOutput().$process->getErrorOutput())->toContain('Unsafe test database');
});
it('rejects URL overrides and accepts only dedicated PostgreSQL', function () {
    $safe = ['driver' => 'pgsql', 'database' => 'changuito_test', 'username' => 'changuito_test'];
    TestDatabaseGuard::assertSafe($safe);
    expect(fn () => TestDatabaseGuard::assertSafe([...$safe, 'url' => 'postgres://unsafe']))->toThrow(RuntimeException::class);
    expect(fn () => TestDatabaseGuard::assertSafe([...$safe, 'driver' => 'sqlite']))->toThrow(RuntimeException::class);
});
