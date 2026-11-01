import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as harness from '../../scripts/verify-harness.mjs';
const baseline = JSON.parse(readFileSync(new URL('../../feature_list.json', import.meta.url)));
const fixture = () => { const t = structuredClone(baseline); t.features.forEach((f,i) => { if(i) f.source = `feature_list.json#/features/${i}`; }); return t; };
const validate = t => harness.validateTracker(t, new Set(['docs/architecture/ARCHITECTURE.md', 'feature_list.json']));
test('tracker is import-safe and validates without an external feature specification', () => {
  assert.equal(typeof harness.validateTracker, 'function');
  assert.doesNotThrow(() => validate(fixture()));
});
test('rejects invalid identity, schema and contract types', () => {
  for (const mutate of [t=>t.features.pop(), t=>t.features[1].id='SETUP-001',t=>t.features[1].id='F-999',t=>t.schema_version=2,
    ...['name','description','priority'].map(k=>t=>t.features[1][k]=' '),t=>t.features[1].acceptance=[],t=>t.features[1].acceptance=[3],t=>t.features[1].dependencies='x',t=>t.features[1].evidence={}]) {
    const t=fixture(); mutate(t); assert.throws(()=>validate(t));
  }
});
test('rejects invalid sources and pointers including stale reorder', () => {
  for(const source of ['missing.md','feature_list.json#/features/999','feature_list.json#/features/2','feature_list.json#f-001']) {
    const t=fixture(); t.features[1].source=source; assert.throws(()=>validate(t));
  }
  const t=fixture(); [t.features[1],t.features[2]]=[t.features[2],t.features[1]]; assert.throws(()=>validate(t));
  t.features.forEach((f,i)=>{if(i)f.source=`feature_list.json#/features/${i}`;}); assert.doesNotThrow(()=>validate(t));
});
test('rejects dependency and lifecycle violations', () => {
  for(const mutate of [t=>t.features[1].dependencies=['F-999'],t=>t.features[1].dependencies=['F-001'],t=>{t.features[1].dependencies=['F-002'];t.features[2].dependencies=['F-001'];},t=>t.features[1].status='in-progress',t=>{t.features[0].status='not-started';t.features[1].status='in-progress';},t=>{t.features[0].status='done';t.features[0].evidence=[];},t=>{t.features[0].status='done';t.features[0].evidence=[{command:'x'}];},t=>t.features[1].status='blocked',t=>t.features[1].status='invalid']) {const t=fixture();mutate(t);assert.throws(()=>validate(t));}
});
