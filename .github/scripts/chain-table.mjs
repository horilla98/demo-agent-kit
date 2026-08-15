// Size → mandatory chain: SINGLE SOURCE OF TRUTH.
//
// The `.claude/agents/README.md` "Task size and chain" table is this module's
// human-readable mirror — in case of a discrepancy, THIS is authoritative. Both
// the session-start hook (`workflow-gate.mjs`) and the merge-side signal
// (`chain-trace.mjs`) work from here, so the two can't drift apart.
//
// Izsak (the implementer) is DELIBERATELY absent from every chain list (INV-1:
// whoever writes the code doesn't gate it) — he must not appear in either
// `prTraces` or `issueTraces`.

// SP → size:
//   1-2 SP → S · 3-7 SP → M · 8+ SP → L
// 6-7 SP (a non-standard Fibonacci value) falls into M under the "round up"
// principle. Unknown/missing/non-numeric SP, AS WELL AS 0 or negative SP → L:
// 0/negative isn't a legitimate S, it's bad data, which would land on the
// least strict chain if we returned S.
export function spToSize(sp) {
  const n = Number(sp)
  if (!Number.isFinite(n) || n <= 0) return 'L'
  if (n <= 2) return 'S'
  if (n < 8) return 'M'
  return 'L'
}

export const SIZE_ORDER = ['S', 'M', 'L']

// The chain traces expected per size.
//   `prTraces`    — agent traces expected on the PR (comment/review).
//   `issueTraces` — traces expected on the linked ticket (at L, the sara/bence
//                   planning-phase step happens on the ticket, not the PR).
// If there's no resolvable `Closes/Fixes/Resolves #N` link, `chain-trace-logic`
// looks for `issueTraces` on the PR too (the gap must not disappear just
// because there's nowhere else to look).
export const CHAIN_BY_SIZE = {
  S: { prTraces: ['reka'], issueTraces: [] },
  M: { prTraces: ['tibor', 'reka'], issueTraces: [] },
  L: { prTraces: ['tibor', 'reka', 'zsofi', 'columbo'], issueTraces: ['sara', 'bence'] },
}

// The chain expectation for a size, or L (the strictest) for an unknown size —
// the same "round up when in doubt" principle as in `spToSize`.
export function chainForSize(size) {
  return CHAIN_BY_SIZE[size] ?? CHAIN_BY_SIZE.L
}

// Every agent who can ever leave a gate trace — comment scanning builds the
// `[agent:<name>]` pattern from this.
export const GATE_AGENTS = ['sara', 'bence', 'marci', 'tibor', 'reka', 'gergo', 'zsofi', 'columbo', 'petra', 'devops']
