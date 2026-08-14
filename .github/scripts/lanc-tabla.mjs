// Méret → kötelező lánc: EGY-IGAZSÁGFORRÁS.
//
// A `.claude/agents/README.md` „Feladatméret és lánc" táblája ennek a modulnak a
// human-olvasható tükre — eltérés esetén EZ a mérvadó. A session-indító hook
// (`munkarend-kapu.mjs`) és a merge-oldali jelző (`lanc-nyom.mjs`) egyaránt innen
// dolgozik, hogy a kettő ne tudjon széttartani.
//
// Izsák (a végrehajtó) SZÁNDÉKOSAN nincs egyik lánc-listán sem (INV-1: aki ír,
// nem kapuz) — ő a `prTraces`/`issueTraces` egyikén sem szerepelhet.

// SP → méret:
//   1-2 SP → S · 3-7 SP → M · 8+ SP → L
// A 6-7 SP (nem szabványos Fibonacci-érték) a „felfelé kerekítés" elve alapján
// M-be esik. Ismeretlen/hiányzó/nem-szám SP, VALAMINT 0 vagy negatív SP → L:
// a 0/negatív nem legitim S, hanem hibás adat, ami a legkevésbé szigorú láncra
// esne, ha S-t adnánk vissza.
export function spToSize(sp) {
  const n = Number(sp)
  if (!Number.isFinite(n) || n <= 0) return 'L'
  if (n <= 2) return 'S'
  if (n < 8) return 'M'
  return 'L'
}

export const SIZE_ORDER = ['S', 'M', 'L']

// A méret szerint elvárt lánc-nyomok.
//   `prTraces`    — a PR-en (komment/review) elvárt agent-nyomok.
//   `issueTraces` — a kapcsolt ticketen elvárt nyomok (L-nél a tervezési fázis
//                   sara/bence lépése a ticketen zajlik, nem a PR-en).
// Ha nincs feloldható `Closes/Fixes/Resolves #N` kapcsolat, a `lanc-nyom-logic`
// az `issueTraces`-t is a PR-en keresi (a hiány nem tűnhet el amiatt, hogy
// nincs hova nézni).
export const CHAIN_BY_SIZE = {
  S: { prTraces: ['reka'], issueTraces: [] },
  M: { prTraces: ['tibor', 'reka'], issueTraces: [] },
  L: { prTraces: ['tibor', 'reka', 'zsofi', 'columbo'], issueTraces: ['sara', 'bence'] },
}

// A méret szerinti lánc-elvárás, vagy L (a legszigorúbb) ismeretlen méretre —
// ugyanaz a „kétség esetén felfelé kerekítünk" elv, mint a `spToSize`-ban.
export function chainForSize(size) {
  return CHAIN_BY_SIZE[size] ?? CHAIN_BY_SIZE.L
}

// Minden agent, aki valaha kapu-nyomot hagyhat — a komment-szkennelés ebből
// építi a `[agent:<név>]` mintát.
export const KAPU_AGENTEK = ['sara', 'bence', 'marci', 'tibor', 'reka', 'gergo', 'zsofi', 'columbo', 'petra', 'devops']
