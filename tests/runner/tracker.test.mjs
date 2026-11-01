import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as harness from '../../scripts/verify-harness.mjs';

const validate = tracker => harness.validateTracker(tracker, new Set(['docs/architecture/ARCHITECTURE.md', 'feature_list.json']));
const feature = (tracker, id) => tracker.features.find(entry => entry.id === id);
const completionEvidence = () => [{
  date: '2026-01-01', environment: 'Synthetic fixture only',
  command: 'synthetic-check', result: 'Synthetic completion evidence, not an executed gate',
}];

// Contract tests must not inherit lifecycle/dependency assumptions from the live backlog.
function fixture(bootstrapStatus = 'in-progress') {
  const ids = ['SETUP-001', ...Array.from({ length: 65 }, (_, i) => `F-${String(i + 1).padStart(3, '0')}`)];
  return {
    schema_version: 1,
    features: ids.map((id, index) => ({
      id, name: `Synthetic ${id}`, description: 'Synthetic contract', priority: 'P0',
      source: index ? `feature_list.json#/features/${index}` : 'docs/architecture/ARCHITECTURE.md',
      acceptance: ['Synthetic acceptance'], dependencies: index ? ['SETUP-001'] : [],
      status: index ? 'not-started' : bootstrapStatus,
      evidence: !index && bootstrapStatus === 'done' ? completionEvidence() : [],
    })),
  };
}

test('tracker is import-safe and live tracker satisfies its read-only smoke contract', () => {
  assert.equal(typeof harness.validateTracker, 'function');
  const tracker = JSON.parse(readFileSync(new URL('../../feature_list.json', import.meta.url)));
  assert.doesNotThrow(() => validate(tracker));
});

test('synthetic lifecycle bases and satisfied dependent activation are valid', () => {
  for (const status of ['in-progress', 'done']) assert.doesNotThrow(() => validate(fixture(status)));
  const tracker = fixture('done');
  feature(tracker, 'F-001').status = 'in-progress';
  assert.doesNotThrow(() => validate(tracker));
});

test('dependency and double-active negatives have explicit preconditions for either lifecycle base', () => {
  for (const status of ['in-progress', 'done']) {
    const base = fixture(status);
    const doubleActive = structuredClone(base);
    feature(doubleActive, 'SETUP-001').status = 'in-progress';
    feature(doubleActive, 'F-001').status = 'in-progress';
    assert.throws(() => validate(doubleActive), /Only one active feature allowed/);

    const unmet = structuredClone(base);
    feature(unmet, 'SETUP-001').status = 'not-started';
    feature(unmet, 'F-001').status = 'in-progress';
    feature(unmet, 'F-001').dependencies = ['SETUP-001'];
    assert.throws(() => validate(unmet), /Unmet dependency: F-001/);
    assert.doesNotThrow(() => validate(base));
  }
});

test('rejects invalid identity, schema and contract types', () => {
  const mutations = [
    t => t.features.pop(), t => feature(t, 'F-001').id = 'SETUP-001',
    t => feature(t, 'F-001').id = 'F-999', t => t.schema_version = 2,
    ...['name', 'description', 'priority'].map(key => t => feature(t, 'F-001')[key] = ' '),
    t => feature(t, 'F-001').acceptance = [], t => feature(t, 'F-001').acceptance = [3],
    t => feature(t, 'F-001').dependencies = 'x', t => feature(t, 'F-001').evidence = {},
  ];
  for (const mutate of mutations) {
    const tracker = fixture(); mutate(tracker); assert.throws(() => validate(tracker));
  }
});

test('rejects invalid sources and pointers including stale reorder', () => {
  for (const source of ['missing.md', 'feature_list.json#/features/999', 'feature_list.json#/features/2', 'feature_list.json#f-001']) {
    const tracker = fixture(); feature(tracker, 'F-001').source = source;
    assert.throws(() => validate(tracker));
  }
  const tracker = fixture();
  [tracker.features[1], tracker.features[2]] = [tracker.features[2], tracker.features[1]];
  assert.throws(() => validate(tracker), /Source pointer identity mismatch/);
  tracker.features.forEach((entry, index) => { if (entry.id !== 'SETUP-001') entry.source = `feature_list.json#/features/${index}`; });
  assert.doesNotThrow(() => validate(tracker));
});

test('rejects dependency graph and lifecycle violations with synthetic evidence', () => {
  const mutations = [
    t => feature(t, 'F-001').dependencies = ['F-999'],
    t => feature(t, 'F-001').dependencies = ['F-001'],
    t => { feature(t, 'F-001').dependencies = ['F-002']; feature(t, 'F-002').dependencies = ['F-001']; },
    t => { feature(t, 'SETUP-001').status = 'done'; feature(t, 'SETUP-001').evidence = []; },
    t => { feature(t, 'SETUP-001').status = 'done'; feature(t, 'SETUP-001').evidence = [{ command: 'synthetic' }]; },
    t => feature(t, 'F-001').status = 'blocked',
    t => feature(t, 'F-001').status = 'invalid',
  ];
  for (const mutate of mutations) {
    const tracker = fixture(); mutate(tracker); assert.throws(() => validate(tracker));
  }
});
