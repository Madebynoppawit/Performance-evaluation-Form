/* ── Canonical 1–5 score scale ──────────────────────────────────────────────
   Single source of truth for tier boundaries, labels, colors, and badge class.
   Tier ranges == label thresholds, so a score's histogram bucket and its
   rating label always agree (e.g. 3.6 is "Exceeds" in both). */

export interface ScoreTier {
  min: number
  max: number          // exclusive upper bound
  label: string        // full label
  short: string        // compact label (chart axes)
  range: string        // display range, e.g. "3.5–4.4"
  color: string        // hex for charts/SVG (must be literal)
  cls: string          // kbt badge class
}

export const SCORE_TIERS: ScoreTier[] = [
  { min: 1.0, max: 1.5,  label: 'Unsatisfactory',      short: 'Unsat.',   range: '1.0–1.4', color: '#ed1c24', cls: 'kbt-badge-error' },
  { min: 1.5, max: 2.5,  label: 'Needs Improvement',   short: 'Needs',    range: '1.5–2.4', color: '#f59e0b', cls: 'kbt-badge-warning' },
  { min: 2.5, max: 3.5,  label: 'Meets Expectation',   short: 'Meets',    range: '2.5–3.4', color: '#0a6ed1', cls: 'kbt-badge-info' },
  { min: 3.5, max: 4.5,  label: 'Exceeds Expectation', short: 'Exceeds',  range: '3.5–4.4', color: '#81c4ff', cls: 'kbt-badge-success' },
  { min: 4.5, max: 5.01, label: 'Role Model',          short: 'Role',     range: '4.5–5.0', color: '#22c55e', cls: 'kbt-badge-success' },
]

export function scoreTier(score: number): ScoreTier {
  if (score < SCORE_TIERS[0].min) return SCORE_TIERS[0]
  return SCORE_TIERS.find(t => score >= t.min && score < t.max) ?? SCORE_TIERS[SCORE_TIERS.length - 1]
}

/* Final grades display GPA-style on a 0–4 scale (raw 1–5 score − 1). Per-item
   and per-section ratings stay 1–5; only the aggregated grade is shown as GPA. */
export const toGpa = (score: number) => score - 1
export const formatGpa = (score: number | null | undefined) =>
  score == null ? '—' : (score - 1).toFixed(2)
