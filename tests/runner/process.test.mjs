import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { runProcess, assertSuite } from '../../scripts/application-gates.mjs';
test('propagates child failure and absent executable; never reports success', () => {
  assert.throws(() => runProcess(process.execPath, ['-e', 'process.exit(7)']), /exit 7/);
  assert.throws(() => runProcess('changuito-nonexistent-gate', []), /unavailable/);
  assert.doesNotThrow(() => runProcess(process.execPath, ['-e', 'process.exit(0)']));
});
test('actual package-manager shims preserve nonzero failures', () => {
  assert.doesNotThrow(() => runProcess('composer', ['--version']));
  assert.doesNotThrow(() => runProcess('npm', ['--version']));
  assert.throws(() => runProcess('composer', ['run', 'changuito-nonexistent-gate']), /exit [1-9]\d*/);
  assert.throws(() => runProcess('npm', ['run', 'changuito-nonexistent-gate']), /exit [1-9]\d*/);
});
test('empty suite is rejected rather than silently skipped', () => {
  const directory = mkdtempSync(join(process.cwd(), '.changuito-suite-'));
  try {
    writeFileSync(join(directory, 'Empty.php'), '<?php // no tests');
    assert.throws(() => assertSuite(directory, '.php', /\bit\s*\(/), /Empty required suite/);
    writeFileSync(join(directory, 'Actual.php'), "<?php it('real', fn () => true);");
    assert.doesNotThrow(() => assertSuite(directory, '.php', /\bit\s*\(/));
  } finally { rmSync(directory, { recursive: true }); }
});
