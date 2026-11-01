<?php

namespace App\Support;

use RuntimeException;

final class TestDatabaseGuard
{
    /** @param array<string, mixed> $connection */
    public static function assertSafe(array $connection): void
    {
        if (($connection['driver'] ?? null) !== 'pgsql' || ($connection['database'] ?? null) !== 'changuito_test' || ($connection['username'] ?? null) !== 'changuito_test' || ! empty($connection['url'])) {
            throw new RuntimeException('Unsafe test database: dedicated PostgreSQL changuito_test role/database required; DB_URL forbidden.');
        }
    }
}
