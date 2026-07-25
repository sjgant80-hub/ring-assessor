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

test('every non-healthy assessment carries plain advice', () => {
  const r = assess([{ id: 'r', layer: 0, severity: 0.9 }]);
  assert.match(r.advice, /root/);
});

test('deterministic — same findings, same assessment', () => {
  const f = [{ id: 'a', layer: 0, severity: 0.7 }, { id: 'b', layer: 2, severity: 0.5 }];
  assert.deepEqual(assess(f), assess(f));
});
