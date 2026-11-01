import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gates, validateCatalog, assertTestEnvironment } from '../../scripts/application-gates.mjs';
test('required gates cannot disappear or be duplicated', () => {
  assert.deepEqual(gates.map(g => g.id), [
    'harness', 'runner', 'composer-validate', 'platform',
    'php:test:unit', 'php:test:feature', 'php:test:architecture', 'php:lint', 'php:analyse',
    'node:lint', 'node:typecheck', 'node:build', 'node:build:ssr', 'node:test:e2e',
  ]);
  assert.throws(() => validateCatalog([]), /Missing/);
  assert.throws(() => validateCatalog([...gates, gates[0]]), /Duplicate/);
  assert.equal(validateCatalog(gates), true);
});
test('unsafe database overrides fail before spawning any gate', () => {
  const safe = { APP_ENV: 'testing', DB_CONNECTION: 'pgsql', DB_DATABASE: 'changuito_test', DB_USERNAME: 'changuito_test' };
  assert.doesNotThrow(() => assertTestEnvironment(safe));
  for (const override of [{ APP_ENV: 'production' }, { DB_DATABASE: 'changuito_dev' }, { DB_USERNAME: 'postgres' }, { DB_URL: 'postgres://unsafe' }, { DB_CONNECTION: 'sqlite' }]) {
    assert.throws(() => assertTestEnvironment({ ...safe, ...override }), /Unsafe test environment/);
  }
});
