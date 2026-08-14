// Munkarend-kapu — tiszta, IO-mentes logika.
//
// A session-indítási STEP 0 (méret-számítás) + a méret szerinti kötelező lánc
// kontextus-szövegét építi fel. A tényleges IO-t (branch-olvasás, ticket-lekérés)
// a `munkarend-kapu.mjs` vékony héj végzi.

import { CHAIN_BY_SIZE, chainForSize, spToSize } from './lanc-tabla.mjs'
import { meretCimkeMinta } from './nyelv-cimkek.mjs'
import { uzenetek } from './uzenetek.mjs'

// Egyetlen mintaforrás a branch-alakokhoz: `feat/<id>-…`, `fix/<id>-…`,
// `claude/<id>-…` (az utóbbi a Claude Code cloud-session platform-generált neve).
const BRANCH_PATTERN = /^(?:feat|fix|claude)\/(\d+)-/

export function ticketIdFromBranch(branch) {
  if (typeof branch !== 'string') return null
  const m = branch.match(BRANCH_PATTERN)
  return m ? Number(m[1]) : null
}

// A ticket törzséből a KÖZVETLEN „**Méret:** S/M/L" (ill. angolul
// „**Size:** S/M/L") mezője — a governance/chore ticketek ezt írják, nem
// SP-előbecslést. `null`, ha nincs ilyen mező. A címke nyelvenkénti alakja a
// `nyelv-cimkek.mjs` egy-igazságforrásból jön, nem hardkódolt szó.
export function sizeFromIssueBody(body) {
  const m = String(body ?? '').match(new RegExp(`\\*\\*(?:${meretCimkeMinta()}):\\*\\*\\s*(S|M|L)\\b`))
  return m ? m[1] : null
}

// Az importer SP-mezője a sztori-ticketeken. `null`, ha nincs vagy nem szám.
export function spFromIssueBody(body) {
  const m = String(body ?? '').match(/\*\*SP(?:-előbecslés)?:\*\*\s*(\d+)/)
  return m ? Number(m[1]) : null
}

// A név MELLETT a szerep is kiíródik (`reka (review)`) — a név a gépi kulcs,
// a zárójeles rész a fordítható glossza. Ismeretlen agentnél (egyedi profil a
// cél-repóban) a puszta név marad, nem írunk oda üres zárójelet.
function chainLine(agents, u) {
  if (agents.length === 0) return u.lancNincsNyom
  return agents.map((a) => (u.agentSzerepek[a] ? `${a} (${u.agentSzerepek[a]})` : a)).join(' → ')
}

// Branch-újrafelhasználás jelzése. `priorPRs`: [{number, state, merged}] ugyanerre
// a branchre. Csak a NEM nyitott elemek jeleznek újrafelhasználást — egy nyitott
// PR ugyanezen a branchen nem az.
export function branchReuseWarning(branch, priorPRs, nyelv) {
  const u = uzenetek(nyelv)
  const zart = (priorPRs ?? []).filter((p) => p.state !== 'open')
  if (zart.length === 0) return null
  const lista = zart
    .map((p) => `#${p.number} (${p.merged ? u.branchMergelve : u.branchLezarva})`)
    .join(', ')
  return u.branchUjrafelhasznalas(branch, lista)
}

// A session-kontextusba írt munkarend-blokk. `ticketId`/`sp`/`size` lehet null.
// Ha a méret ismeretlen, a legszigorúbb (L) ágat írjuk ki — ugyanaz az elv,
// mint a `spToSize`-ban.
export function buildMunkarendBlock({ ticketId, sp, size, branch, priorPRs, projekt, teszt, nyelv } = {}) {
  const u = uzenetek(nyelv)
  // A méret FORRÁSA egyértelmű: elsődlegesen az explicit „**Méret:**" mező,
  // másodlagosan az SP-ből számolt méret — a kettő nem keveredhet a kiírásban.
  const explicitSize = size != null && CHAIN_BY_SIZE[size] ? size : null
  const computedSize = explicitSize == null && sp != null ? spToSize(sp) : null
  const knownSize = explicitSize ?? computedSize
  const effectiveSize = knownSize ?? 'L'
  const chain = chainForSize(effectiveSize)
  const reuseWarning = branchReuseWarning(branch, priorPRs, nyelv)

  const sorok = []
  if (reuseWarning) sorok.push('', reuseWarning)
  sorok.push('', u.kapuCim(projekt), '', u.step0)

  if (ticketId != null) sorok.push(u.ticketAzonositva(ticketId))
  else sorok.push(u.ticketNemAzonosithato)

  if (explicitSize) sorok.push(u.meretExplicit(explicitSize))
  else if (computedSize) sorok.push(u.meretSpBol(computedSize, sp))
  else sorok.push(u.meretTisztazando)

  sorok.push(
    '',
    u.lancSor(
      effectiveSize,
      chainLine(chain.prTraces, u),
      chain.issueTraces.length > 0 ? chainLine(chain.issueTraces, u) : null,
    ),
    '',
    u.kemenySzabaly,
  )

  if (teszt) sorok.push('', u.tesztKotelezo(teszt))

  return sorok.join('\n')
}
