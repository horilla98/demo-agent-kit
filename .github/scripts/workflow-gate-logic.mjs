// Workflow gate — pure, IO-free logic.
//
// Builds the context text for the session-start STEP 0 (size computation) plus
// the mandatory chain for that size. The actual IO (reading the branch,
// fetching the ticket) is done by the thin `workflow-gate.mjs` shell.

import { CHAIN_BY_SIZE, chainForSize, spToSize } from './chain-table.mjs'
import { sizeLabelPattern } from './language-labels.mjs'
import { messages } from './messages.mjs'

// Single pattern source for branch shapes: `feat/<id>-…`, `fix/<id>-…`,
// `claude/<id>-…` (the latter is the Claude Code cloud-session platform's
// generated name).
const BRANCH_PATTERN = /^(?:feat|fix|claude)\/(\d+)-/

export function ticketIdFromBranch(branch) {
  if (typeof branch !== 'string') return null
  const m = branch.match(BRANCH_PATTERN)
  return m ? Number(m[1]) : null
}

// The ticket body's DIRECT "**Size:** S/M/L" field (Hungarian: "**Méret:**") —
// governance/chore tickets write this instead of an SP pre-estimate. `null` if
// there's no such field. The label's per-language shape comes from the
// `language-labels.mjs` single source of truth, not a hardcoded word.
export function sizeFromIssueBody(body) {
  const m = String(body ?? '').match(new RegExp(`\\*\\*(?:${sizeLabelPattern()}):\\*\\*\\s*(S|M|L)\\b`))
  return m ? m[1] : null
}

// The importer's SP field on story tickets. `null` if missing or not a number.
export function spFromIssueBody(body) {
  const m = String(body ?? '').match(/\*\*SP(?:-előbecslés)?:\*\*\s*(\d+)/)
  return m ? Number(m[1]) : null
}

// The role is printed NEXT TO the name (`reka (review)`) — the name is the
// machine key, the parenthetical is the translatable gloss. For an unknown
// agent (a custom profile in the target repo) the bare name stays, we don't
// print an empty parenthetical.
function chainLine(agents, m) {
  if (agents.length === 0) return m.chainNoTrace
  return agents.map((a) => (m.agentRoles[a] ? `${a} (${m.agentRoles[a]})` : a)).join(' → ')
}

// Branch-reuse signal. `priorPRs`: [{number, state, merged}] for this same
// branch. Only NON-open entries signal reuse — an open PR on the same branch
// isn't one.
export function branchReuseWarning(branch, priorPRs, language) {
  const m = messages(language)
  const closed = (priorPRs ?? []).filter((p) => p.state !== 'open')
  if (closed.length === 0) return null
  const list = closed
    .map((p) => `#${p.number} (${p.merged ? m.branchMerged : m.branchClosed})`)
    .join(', ')
  return m.branchReused(branch, list)
}

// The workflow-gate block written into the session context. `ticketId`/`sp`/
// `size` may be null. If the size is unknown, we print the strictest (L)
// branch — the same principle as in `spToSize`.
export function buildWorkflowGateBlock({ ticketId, sp, size, branch, priorPRs, project, test, language } = {}) {
  const m = messages(language)
  // The size's SOURCE is unambiguous: primarily the explicit "**Size:**"
  // field, secondarily the size derived from SP — the two must not mix in
  // the output.
  const explicitSize = size != null && CHAIN_BY_SIZE[size] ? size : null
  const computedSize = explicitSize == null && sp != null ? spToSize(sp) : null
  const knownSize = explicitSize ?? computedSize
  const effectiveSize = knownSize ?? 'L'
  const chain = chainForSize(effectiveSize)
  const reuseWarning = branchReuseWarning(branch, priorPRs, language)

  const lines = []
  if (reuseWarning) lines.push('', reuseWarning)
  lines.push('', m.gateTitle(project), '', m.step0)

  if (ticketId != null) lines.push(m.ticketIdentified(ticketId))
  else lines.push(m.ticketNotIdentifiable)

  if (explicitSize) lines.push(m.sizeExplicit(explicitSize))
  else if (computedSize) lines.push(m.sizeFromSp(computedSize, sp))
  else lines.push(m.sizeToClarify)

  lines.push(
    '',
    m.chainLine(
      effectiveSize,
      chainLine(chain.prTraces, m),
      chain.issueTraces.length > 0 ? chainLine(chain.issueTraces, m) : null,
    ),
    '',
    m.hardRule,
  )

  if (test) lines.push('', m.testMandatory(test))

  return lines.join('\n')
}
