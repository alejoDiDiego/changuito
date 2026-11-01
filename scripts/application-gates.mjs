import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = [
  ['harness', 'node', ['scripts/verify-harness.mjs']],
  ['runner', 'node', ['--test', 'tests/runner/*.test.mjs']],
  ['composer-validate', 'composer', ['validate', '--strict']],
  ['platform', 'composer', ['check-platform-reqs']],
  ...['test:unit', 'test:feature', 'test:architecture', 'lint', 'analyse'].map(id => [`php:${id}`, 'composer', ['run', id]]),
  ...['lint', 'typecheck', 'build', 'build:ssr', 'test:e2e'].map(id => [`node:${id}`, 'npm', ['run', id]]),
];
export const gates = catalog.map(([id, command, args]) => ({ id, command, args }));
export function validateCatalog(candidate) {
  const ids = candidate.map(g => g.id);
  if (new Set(ids).size !== ids.length) throw Error('Duplicate gate');
  for (const gate of gates) {
    const item = candidate.find(g => g.id === gate.id);
    if (!item) throw Error(`Missing gate: ${gate.id}`);
    if (JSON.stringify(item) !== JSON.stringify(gate)) throw Error(`Changed required gate: ${gate.id}`);
  }
  if (ids.length !== gates.length) throw Error('Unexpected gate');
  return true;
}
export function runProcess(command, args, options = {}) {
  const windows = process.platform === 'win32' && ['npm', 'composer'].includes(command);
  const quote = value => `'${String(value).replaceAll("'", "''")}'`;
  // Scoop's composer.cmd drops exit codes; PowerShell's shim preserves them.
  const result = windows
    ? spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', `$ErrorActionPreference='Stop'; & ${[command, ...args].map(quote).join(' ')}; if ($null -eq $LASTEXITCODE) { exit 1 }; exit $LASTEXITCODE`], { cwd: root, stdio: 'inherit', ...options })
    : spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
  if (result.error || result.status !== 0) throw Error(`Gate command failed: ${command} (exit ${result.status ?? 'unavailable'})`, { cause: result.error });
}
export function assertSuite(directory, extension, pattern) {
  const files = readdirSync(directory, { recursive: true }).filter(name => name.endsWith(extension));
  if (!files.some(name => pattern.test(readFileSync(join(directory, name), 'utf8')))) throw Error(`Empty required suite: ${directory}`);
}
export function assertTestEnvironment(env) {
  if (env.APP_ENV !== 'testing' || env.DB_CONNECTION !== 'pgsql' || env.DB_DATABASE !== 'changuito_test' || env.DB_USERNAME !== 'changuito_test' || env.DB_URL) {
    throw Error('Unsafe test environment: dedicated PostgreSQL role/database and APP_ENV=testing required; DB_URL forbidden.');
  }
}
export function preflight() {
  for (const name of ['composer.lock', 'package-lock.json', 'vendor/autoload.php', 'vendor/bin/pest', 'vendor/bin/pint', 'vendor/bin/phpstan', 'node_modules/.bin/vite', 'node_modules/.bin/eslint', 'node_modules/.bin/tsc', 'node_modules/.bin/playwright', '.env.testing']) {
    if (!existsSync(join(root, name))) throw Error(`Missing required dependency/configuration: ${name}. Prepare explicitly; verifier never installs.`);
  }
  const testEnv = Object.fromEntries(readFileSync(join(root, '.env.testing'), 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
  assertTestEnvironment({ ...testEnv, ...process.env });
  if (existsSync(join(root, 'bootstrap/cache/config.php'))) throw Error('Cached configuration is forbidden for verification; clear explicitly.');
  if (existsSync(join(root, 'public/hot'))) throw Error('Vite hot file would bypass production artifacts; stop dev Vite and remove its stale hot file explicitly.');
  for (const suite of ['Unit', 'Feature', 'Architecture']) assertSuite(join(root, 'tests', suite), '.php', /\b(?:it|test|arch)\s*\(/);
  assertSuite(join(root, 'tests/e2e'), '.ts', /\btest\s*\(/);
}
export function runApplication() {
  validateCatalog(gates);
  preflight();
  const failed = [];
  for (const { id, command, args } of gates) {
    console.log(`\n=== REQUIRED GATE ${id} ===`);
    try {
      runProcess(command, args);
      if (id === 'node:build' && !existsSync(join(root, 'public/build/manifest.json'))) throw Error('Missing client artifact');
      if (id === 'node:build:ssr' && !existsSync(join(root, 'bootstrap/ssr/ssr.js'))) throw Error('Missing SSR artifact');
    } catch (error) { failed.push(id); console.error(error.message); }
  }
  if (failed.length) throw Error(`Required gates failed (${failed.join(', ')}); no acceptance claimed.`);
  console.log('All required application gates executed successfully. Independent acceptance still required.');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { runApplication(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
