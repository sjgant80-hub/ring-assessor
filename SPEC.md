# ring-assessor · design note

> Spec: **ring-assessor-spec-v1**. The engineering + scope contract of the root-cause prioritiser.

## Surface

`ring.mjs` exports `assess(findings, opts?)`:

- `findings`: `[{ id?, layer:Number≥0, severity:0..1, note? }]` — layer 0 = deepest/upstream.
- `opts.threshold` (default 0.3) — severities below this are "quiet", excluded.
- returns `{ healthy, root, ranked, path, distanceFromRoot, considered, advice }`.

## The logic

1. Drop malformed findings; clamp severity to [0,1].
2. Keep the significant ones (severity ≥ threshold). None ⇒ `healthy:true`.
3. **root** = deepest significant finding (lowest layer), tie-broken by higher severity.
4. **ranked** — DEEPEST-first (layer ascending), severity breaking ties at a layer. This is consistent
   with `root` by construction: the root is always `ranked[0]`, so the tool never names two different
   things to fix first.
5. **path** = active findings ordered outermost→root. **distanceFromRoot** = layer − root.layer.

## Invariants

1. **Deepest-significant is the root** — not the loudest. Verified.
2. **Declared model, not inferred causation.** The layering is an input; the tool never infers which
   layer is upstream from data. It prioritises within the user's model.
3. **Not health/medical.** No body mapping, no biomarker semantics, no diagnostic claim anywhere.
4. **Robust + deterministic.** Malformed findings dropped, severity clamped, no RNG/clock.
5. **Zero dependencies.**

## Verification

`npm test` — deepest-not-loudest root, fix-order, equal-depth tie-break, distance, inward path,
threshold filtering, malformed-input handling, determinism. CI runs it on push.
