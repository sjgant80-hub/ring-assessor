// ════════════════════════════════════════════════════════════════
// ring-assessor · a layered root-cause prioritiser
//
// When problems sit in layers — a deep/upstream layer and the surface symptoms it drives — the
// cheapest fix is usually the DEEPEST significant one: resolve the root and the downstream noise
// often clears with it. This tool takes findings tagged with a layer and a severity and tells you:
//   • the ROOT — the deepest significant finding (what to look at first),
//   • a fix-order — findings ranked so deep + severe come first,
//   • the inward PATH — from the outermost symptom down to the root,
//   • each finding's distance from the root.
//
// HONEST SCOPE — what this is NOT:
//   • It is NOT medical, diagnostic, or health advice of any kind. It knows nothing about bodies.
//   • It does NOT infer causation from data. YOU declare the layering (which layer is upstream); it
//     prioritises within the model you gave it. Garbage layering in, garbage priority out.
//   It is a triage helper for any layered system — an incident stack, a data pipeline, a dependency
//   chain, a set of KPIs you've ordered by how upstream they are.
//
// Layer convention: layer 0 = deepest / most upstream / root. Higher layer = more surface / downstream.
// Zero dependencies, pure and deterministic.
// ════════════════════════════════════════════════════════════════

const DEFAULTS = { threshold: 0.3 }; // severities below this are "quiet", not significant

// findings: [{ id, layer:Number>=0, severity:0..1, note? }]
export function assess(findings = [], opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const clean = (Array.isArray(findings) ? findings : [])
    .filter(f => f && Number.isFinite(f.layer) && f.layer >= 0 && Number.isFinite(f.severity))
    .map(f => ({ id: f.id != null ? f.id : `L${f.layer}`, layer: f.layer, severity: clamp01(f.severity), note: f.note || null }));

  const active = clean.filter(f => f.severity >= o.threshold);
  if (active.length === 0) {
    return { healthy: true, root: null, ranked: [], path: [], distanceFromRoot: {}, considered: clean.length };
  }

  const maxLayer = Math.max(...active.map(f => f.layer));

  // ROOT = the deepest significant finding (lowest layer); tie-break by higher severity.
  const root = active.reduce((a, b) => (b.layer < a.layer || (b.layer === a.layer && b.severity > a.severity)) ? b : a);

  // Fix-order: deeper + more severe first. Weight amplifies depth so a deep root outranks a louder
  // surface symptom, but severity still separates findings at the same depth.
  const priority = f => f.severity * (1 + (maxLayer - f.layer));
  const ranked = [...active]
    .map(f => ({ ...f, priority: r4(priority(f)) }))
    .sort((a, b) => b.priority - a.priority || a.layer - b.layer);

  // Inward path: from the outermost active symptom down to the root.
  const path = [...active].sort((a, b) => b.layer - a.layer).map(f => ({ layer: f.layer, id: f.id }));

  const distanceFromRoot = Object.fromEntries(active.map(f => [f.id, f.layer - root.layer]));

  return {
    healthy: false,
    root: { id: root.id, layer: root.layer, severity: root.severity },
    ranked,
    path,
    distanceFromRoot,
    considered: clean.length,
    advice: `Start at the root (${root.id}, layer ${root.layer}). Fixing the deepest significant finding first often clears the ${active.length - 1} downstream symptom(s).`,
  };
}

function clamp01(x) { return Math.max(0, Math.min(1, Number(x))); }
function r4(x) { return Math.round(x * 10000) / 10000; }

export default assess;
