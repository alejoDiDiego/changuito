import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFile(path.join(root, name), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const text = value => typeof value === 'string' && value.trim().length > 0;

// Pure validation: callers supply the existing source paths; no process or filesystem effects.
export function validateTracker(tracker, sourcePaths) {
  assert(tracker?.schema_version === 1, 'Invalid schema_version');
  const features = tracker.features;
  const expected = new Set(['SETUP-001', ...Array.from({length: 65}, (_, i) => `F-${String(i+1).padStart(3, '0')}`)]);
  assert(Array.isArray(features) && features.length === expected.size, 'Expected exactly 66 tracker entries');
  const byId = new Map();
  for (const f of features) {
    assert(f && expected.has(f.id) && !byId.has(f.id), 'Missing, unknown or duplicate feature ID');
    byId.set(f.id, f);
  }
  assert(features.filter(f => f.status === 'in-progress').length <= 1, 'Only one active feature allowed');
  for (const f of features) {
    assert(text(f.name) && text(f.description) && ['P0','P1','P2'].includes(f.priority), `Invalid contract: ${f.id}`);
    assert(['not-started','in-progress','blocked','done'].includes(f.status), `Invalid status: ${f.id}`);
    assert(Array.isArray(f.acceptance) && f.acceptance.length && f.acceptance.every(text), `Missing acceptance: ${f.id}`);
    assert(Array.isArray(f.dependencies) && f.dependencies.every(text) && new Set(f.dependencies).size === f.dependencies.length && !f.dependencies.includes(f.id), `Invalid dependencies: ${f.id}`);
    assert(Array.isArray(f.evidence), `Invalid evidence: ${f.id}`);
    assert(text(f.source), `Missing source: ${f.id}`);
    const [file, pointer, ...extra] = f.source.split('#');
    assert(!extra.length && sourcePaths.has(file), `Missing source file: ${f.id}`);
    if (f.id !== 'SETUP-001') {
      assert(file === 'feature_list.json' && /^\/features\/(0|[1-9]\d*)$/.test(pointer ?? ''), `Invalid JSON Pointer: ${f.id}`);
      assert(features[Number(pointer.split('/')[2])]?.id === f.id, `Source pointer identity mismatch: ${f.id}`);
    } else assert(file === 'docs/architecture/ARCHITECTURE.md' && pointer === undefined, 'Invalid bootstrap source');
    for (const dep of f.dependencies) {
      assert(byId.has(dep), `Unknown dependency: ${f.id}`);
      if (['in-progress','done'].includes(f.status)) assert(byId.get(dep).status === 'done', `Unmet dependency: ${f.id}`);
    }
    if (f.status === 'done') assert(f.evidence.length && f.evidence.every(e => e && ['command','result','date','environment'].every(k=>text(e[k]))), `Missing completion evidence: ${f.id}`);
    if (f.status === 'blocked') assert(text(f.blocker), `Missing blocker: ${f.id}`);
  }
  const visiting = new Set(), visited = new Set();
  function visit(id) {
    assert(!visiting.has(id), `Dependency cycle: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id); byId.get(id).dependencies.forEach(visit);
    visiting.delete(id); visited.add(id);
  }
  features.forEach(f=>visit(f.id));
}

async function main() {
  if (process.argv.includes('--application')) { (await import('./application-gates.mjs')).runApplication(); return; }
  const required = ['AGENTS.md','progress.md','session-handoff.md','init.sh','docs/verification.md',
    'docs/product/PRODUCT.md','docs/product/DOMAIN.md','docs/architecture/ARCHITECTURE.md','feature_list.json'];
  for (const name of required) assert((await read(name)).trim(), `Empty file: ${name}`);
  const tracker = JSON.parse(await read('feature_list.json'));
  const paths = new Set(required);
  for (const f of tracker.features ?? []) {
    if (text(f.source)) {
      const file = f.source.split('#')[0];
      assert(!path.isAbsolute(file) && !file.split(/[\\/]/).includes('..'), 'Source outside repository');
      assert((await read(file)).trim(), `Empty source: ${file}`); paths.add(file);
    }
  }
  validateTracker(tracker, paths);
  console.log('PASS: harness files, exact 66 tracker contracts, source pointers, dependencies, status and evidence');
  console.log('HARNESS ONLY: application verification requires --application');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); } catch(error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1; }
}
