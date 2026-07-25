# CLAUDE.md · ring-assessor

Instructions for any agent working in this repository. See `SPEC.md` for the contract.

## What this is

A layered root-cause prioritiser: findings tagged with layer + severity → the deepest significant
one to fix first, a fix-order, and the inward path. `ring.mjs` is the engine; `index.html` is a demo.

## Invariants to preserve — the scope ones are load-bearing

1. **NOT medical / diagnostic / health advice.** This is the reason the tool is framed generically.
   Do NOT add body-system mappings, biomarker semantics, symptom→diagnosis logic, or any "your health
   root cause" framing. That would be medical advice — prohibited and harmful. It is a triage helper
   for declared layered systems (incidents, pipelines, dependencies, KPIs), nothing more.
2. **No private cosmology.** Do NOT introduce the "9 rings" body/spine mapping, κ/θ/Ψ, elements, or
   dyad references. "Ring" here means an abstract layer index, full stop.
3. **Declared model, not inferred causation.** The layering is an input the user supplies. The tool
   never infers which layer is upstream from correlations — say so, don't claim otherwise.
4. **Deepest-significant is the root, not the loudest.** This is the core behaviour; the test guards it.
5. **Deterministic, robust, zero-dep.** Drop malformed findings, clamp severity. A change that reddens
   `npm test` does not ship.

## Run
```
npm test
```
CI runs `npm test` on every push.

## Seam

Public, general-purpose triage tool. Layer/severity/root-cause language only. The health/biometric and
9-ring-body framings are deliberately excluded (medical-advice + cosmology risk) — do not reintroduce them.
