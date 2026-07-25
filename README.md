# ring-assessor

**Live:** [sjgant80-hub.github.io/ring-assessor](https://sjgant80-hub.github.io/ring-assessor/)

A **layered root-cause prioritiser**. When problems sit in layers — a deep/upstream layer and the
surface symptoms it drives — the cheapest fix is usually the *deepest significant one*: resolve the
root and the downstream noise often clears with it. Give it findings tagged with a layer and a
severity, and it tells you what to fix first.

- **root** — the deepest significant finding.
- **ranked** — fix-order, deep + severe first.
- **path** — the inward route from the outermost symptom down to the root.
- **distanceFromRoot** — how far downstream each finding sits.

## What this is NOT

- **Not medical, diagnostic, or health advice** of any kind. It knows nothing about bodies.
- **Not causal inference.** *You* declare the layering (which layer is upstream); it prioritises
  within the model you give it. It's a triage helper for any layered system — an incident stack, a
  data pipeline, a dependency chain, a set of KPIs you've ordered by how upstream they are.

## Use

```js
import { assess } from './ring.mjs';

assess([
  { id: 'db-latency',    layer: 0, severity: 0.7 },  // deepest / upstream
  { id: 'api-timeouts',  layer: 2, severity: 0.9 },
  { id: 'user-errors',   layer: 4, severity: 0.95 }, // loudest, but a symptom
]);
// → root: db-latency (fix this first), ranked fix-order, inward path, distances
```

Layer convention: **layer 0 = deepest / most upstream / root**; higher = more surface.

## Test

```
npm test
```

Zero dependencies. Deterministic.
