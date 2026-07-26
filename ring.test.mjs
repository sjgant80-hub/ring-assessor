#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess } from './ring.mjs';

test('all-quiet findings report healthy with no root', () => {
  const r = assess([{ id: 'a', layer: 0, severity: 0.1 }, { id: 'b', layer: 2, severity: 0.2 }]);
  assert.equal(r.healthy, true);
  assert.equal(r.root, null);
  assert.equal(r.ranked.length, 0);
});

test('the ROOT is the deepest significant finding, not the loudest', () => {
  const r = assess([
    { id: 'surface-loud', layer: 3, severity: 0.95 },
    { id: 'deep-root', layer: 0, severity: 0.5 },
    { id: 'mid', layer: 1, severity: 0.6 },
  ]);
  assert.equal(r.root.id, 'deep-root', 'deepest significant wins even though surface is more severe');
  assert.equal(r.root.layer, 0);
});

test('fix-order puts deep + severe first', () => {
  const r = assess([
    { id: 'surface', layer: 3, severity: 0.9 },
    { id: 'root', layer: 0, severity: 0.8 },
  ]);
  assert.equal(r.ranked[0].id, 'root', 'the deep finding is prioritised over a slightly louder surface one');
});

test('at equal depth, severity breaks the tie', () => {
  const r = assess([
    { id: 'x', layer: 1, severity: 0.5 },
    { id: 'y', layer: 1, severity: 0.9 },
  ]);
  assert.equal(r.root.id, 'y');
  assert.equal(r.ranked[0].id, 'y');
});

test('distance-from-root is the layer gap', () => {
  const r = assess([
    { id: 'root', layer: 1, severity: 0.7 },
    { id: 'sym', layer: 4, severity: 0.7 },
  ]);
  assert.equal(r.distanceFromRoot['root'], 0);
  assert.equal(r.distanceFromRoot['sym'], 3);
});

test('the inward path runs from the outermost symptom down to the root', () => {
  const r = assess([
    { id: 'root', layer: 0, severity: 0.6 },
    { id: 'mid', layer: 2, severity: 0.6 },
    { id: 'edge', layer: 5, severity: 0.6 },
  ]);
  assert.deepEqual(r.path.map(p => p.id), ['edge', 'mid', 'root']);
});

test('the threshold filters quiet findings out of the assessment', () => {
  const r = assess([
    { id: 'quiet', layer: 0, severity: 0.2 },
    { id: 'loud', layer: 2, severity: 0.8 },
  ], { threshold: 0.3 });
  assert.equal(r.root.id, 'loud', 'the quiet deep finding is below threshold, so the loud one is the root');
  assert.equal(r.ranked.length, 1);
});

test('severity is clamped and malformed findings are dropped, not crashed on', () => {
  const r = assess([
    { id: 'ok', layer: 1, severity: 1.5 },        // clamped to 1
    { id: 'bad-layer', layer: -1, severity: 0.9 }, // dropped
    { layer: 'x', severity: 0.9 },                 // dropped
    null,                                          // dropped
  ]);
  assert.equal(r.considered, 1);
  assert.equal(r.root.severity, 1);
});

test('advice names the actual root id and its layer (not just the literal word "root")', () => {
  const r = assess([{ id: 'db-latency', layer: 0, severity: 0.9 }, { id: 'ui', layer: 3, severity: 0.8 }]);
  assert.ok(r.advice.includes('db-latency'), 'advice references the real root id');
  assert.ok(r.advice.includes('layer 0'));
});

test('ranked[0] is ALWAYS the root — the tool never names two different things to fix first', () => {
  // a much louder shallow symptom must NOT outrank the deep root in the fix-order
  const r = assess([
    { id: 'root', layer: 0, severity: 0.31 },
    { id: 'loud-symptom', layer: 1, severity: 0.99 },
  ]);
  assert.equal(r.root.id, 'root');
  assert.equal(r.ranked[0].id, 'root', 'fix-order agrees with the declared root');
});

test('a NaN threshold does NOT declare a severe system healthy (falls back to default)', () => {
  const r = assess([{ id: 'x', layer: 0, severity: 0.95 }], { threshold: NaN });
  assert.equal(r.healthy, false, 'a severe finding must not be silently ignored on a corrupt threshold');
  assert.equal(r.root.id, 'x');
});

test('id-less findings at the same layer do not collide in the distance map', () => {
  const r = assess([{ layer: 2, severity: 0.6 }, { layer: 2, severity: 0.7 }, { layer: 0, severity: 0.5 }]);
  // three active findings ⇒ three distinct distance entries (no silent overwrite from a shared L2 id)
  assert.equal(Object.keys(r.distanceFromRoot).length, 3);
});

test('duplicate EXPLICIT ids are disambiguated — the root distance is not overwritten', () => {
  const r = assess([{ id: 'x', layer: 0, severity: 0.9 }, { id: 'x', layer: 4, severity: 0.8 }]);
  const ids = Object.keys(r.distanceFromRoot);
  assert.equal(ids.length, 2, 'both findings keep a distinct distance entry');
  assert.ok(ids.includes('x') && ids.some(k => k !== 'x'), 'the second "x" was renamed, not merged');
  assert.equal(r.distanceFromRoot[r.root.id], 0, 'the root distance is intact, not clobbered');
});

test('a finding with a throwing getter is dropped, not crashing the assessment', () => {
  const good = { id: 'g', layer: 0, severity: 0.9 };
  const poison = { get layer() { throw new Error('layer getter blew up'); }, severity: 0.9 };
  const r = assess([good, poison, { id: 'h', layer: 2, severity: 0.8 }]);
  assert.equal(r.considered, 2, 'the poison finding is dropped; the two good ones remain');
  assert.equal(r.root.id, 'g');
});

test('an explicit null opts falls back to defaults instead of crashing', () => {
  const r = assess([{ id: 'a', layer: 0, severity: 0.9 }], null);
  assert.equal(r.healthy, false);
  assert.equal(r.root.id, 'a');
});

test('deterministic — same findings, same assessment', () => {
  const f = [{ id: 'a', layer: 0, severity: 0.7 }, { id: 'b', layer: 2, severity: 0.5 }];
  assert.deepEqual(assess(f), assess(f));
});

// ── boundary/branch pins added to kill witness mutation survivors ──

test('a severity exactly equal to the threshold is significant, not filtered out', () => {
  // pins `severity >= threshold` at the boundary — `>` would silently call a severe-at-cutoff system healthy
  const r = assess([{ id: 'edge', layer: 0, severity: 0.3 }], { threshold: 0.3 });
  assert.equal(r.healthy, false, 'severity == threshold counts as active');
  assert.equal(r.root.id, 'edge');
});

test('at equal depth AND equal severity, the first finding stays the root (stable tie-break)', () => {
  // pins the reduce tie-break `b.severity > a.severity`: a non-strict `>=` would flip to the later finding
  const r = assess([{ id: 'a', layer: 1, severity: 0.5 }, { id: 'b', layer: 1, severity: 0.5 }]);
  assert.equal(r.root.id, 'a', 'equal layer + equal severity keeps the earlier finding as root');
});

test('at equal depth, the more severe finding is the root even when listed first', () => {
  // pins `b.layer < a.layer`: a `<=` would pick the later finding at equal layer, ignoring severity
  const r = assess([{ id: 'y', layer: 1, severity: 0.9 }, { id: 'x', layer: 1, severity: 0.5 }]);
  assert.equal(r.root.id, 'y', 'higher severity wins the tie regardless of order');
});

test("a finding's note is preserved on the ranked entry, not nulled out", () => {
  // pins `note || null`: an `&&` would replace every real note with null
  const r = assess([{ id: 'x', layer: 0, severity: 0.9, note: 'db slow' }]);
  assert.equal(r.ranked[0].note, 'db slow', 'the supplied note survives into the ranked output');
});

test('the inward path is ordered by LAYER (outermost first), not by severity', () => {
  // pins the first `||` in the path comparator: `&&` would reorder by severity when layers differ
  const r = assess([
    { id: 'edge', layer: 5, severity: 0.5 },
    { id: 'mid', layer: 2, severity: 0.9 },
    { id: 'root', layer: 0, severity: 0.7 },
  ]);
  assert.deepEqual(r.path.map(p => p.id), ['edge', 'mid', 'root'], 'deepest-last by layer, ignoring severity magnitude');
});

test('within one layer the path breaks ties by severity (quietest first), not by id', () => {
  // pins the second `||` in the path comparator: `&&` would collapse the severity tie-break into an id sort
  const r = assess([
    { id: 'a1', layer: 1, severity: 0.9 },
    { id: 'z9', layer: 1, severity: 0.4 },
  ]);
  assert.deepEqual(r.path.map(p => p.id), ['z9', 'a1'], 'lower severity comes first at equal layer, id order (a1<z9) does not win');
});

test('advice reports the correct number of downstream symptoms (active - 1)', () => {
  // pins `active.length - 1`: a `+ 1` would overstate the downstream count
  const r = assess([{ id: 'root', layer: 0, severity: 0.9 }, { id: 'sym', layer: 2, severity: 0.8 }]);
  assert.ok(r.advice.includes('the 1 downstream symptom'), 'two active findings ⇒ exactly one downstream symptom');
});
