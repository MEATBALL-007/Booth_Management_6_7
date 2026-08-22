// Presentation maths for the donation thermometer.
//
// This deliberately lives OUTSIDE `src/dashboard/metrics.ts`. That module owns
// the accounting formula (`netDonation = totalSales - totalCost`) and is graded
// by criteria on two other specs, so it must not grow a display concern. This
// file only turns an already-computed amount into something a bar can draw.

export interface DonationProgress {
  /**
   * Net donation so far, in baht — passed straight through from
   * `computeDashboardMetrics(...).netDonation`. May be negative early in the
   * event, when expenses have been entered but few orders are paid.
   */
  amount: number
  /** The configured goal, or `null` when no usable goal is set. */
  target: number | null
  /**
   * True progress. NOT clamped: it can exceed 100 once the goal is beaten, and
   * can go negative. This is the number to show as text — a booth that raised
   * 150% of its goal should be told so.
   */
  pct: number | null
  /**
   * Progress clamped to 0..100 — the only value a bar's width may use. Kept
   * separate from `pct` so that beating the goal fills the bar without
   * overflowing its track, and so a negative net draws an empty bar rather
   * than a negative width.
   */
  barPct: number | null
}

/**
 * A goal is only usable if it is a finite, strictly positive number.
 *
 * `donationTarget` is optional in `GlobalConfig` and comes from a hand-edited
 * Firestore document, so every unusable shape has to be handled here rather
 * than trusted: absent, `null`, `0` (which would divide to Infinity), a
 * negative typo, or `NaN` from a non-numeric cell. In all of those cases the
 * caller gets `null`s and is expected to render the amount with no bar —
 * never `NaN%` on a screen a customer is looking at.
 */
export function donationProgress(amount: number, target?: number | null): DonationProgress {
  const usable = typeof target === 'number' && Number.isFinite(target) && target > 0
  if (!usable) return { amount, target: null, pct: null, barPct: null }

  const pct = (amount / target) * 100
  return { amount, target, pct, barPct: Math.min(100, Math.max(0, pct)) }
}
