// Chain-trace signal — pure, IO-free logic.
//
// Compares the agent traces EXPECTED by size on a PR (`[agent:<name>]`
// comments) against the ones actually present, and writes the bot comment's
// text.
//
// PHILOSOPHY: this is a **signal, not a blocking gate**. It makes the gap
// visible, but it doesn't stop the merge — human approval is what decides.
// A silent gap, however, must never happen: whatever's missing gets surfaced
// on the PR.

import { chainForSize, spToSize } from './chain-table.mjs'
import { sizeLabelPattern } from './language-labels.mjs'
import { messages } from './messages.mjs'

export const MARKER = '<!-- lanc-nyom-jelzo -->'

// The PR body's mandatory "Size: S/M/L" field (Hungarian: "Méret: S/M/L"),
// (required by the PR template) — the label's per-language shape comes from
// the `language-labels.mjs` single source of truth, not a hardcoded word.
export function sizeFromPrBody(body) {
  const m = String(body ?? '').match(new RegExp(`^\\s*(?:\\*\\*)?(?:${sizeLabelPattern()})(?:\\*\\*)?:\\s*\\**\\s*(S|M|L)\\b`, 'im'))
  return m ? m[1].toUpperCase() : null
}

// `Closes/Fixes/Resolves #N` — the linked tickets' numbers.
export function linkedTickets(body) {
  const numbers = new Set()
  const re = /\b(?:closes|fixes|resolves)\s+#(\d+)/gi
  for (const m of String(body ?? '').matchAll(re)) numbers.add(Number(m[1]))
  return [...numbers]
}

// The set of `[agent:<name>]` traces found in a comment list.
//
// The marker must be at the start of the line (matching the `pr-gates`
// source repo's convention) — without this, an `[agent:reka]` merely QUOTED
// in a prose sentence would also count as a real gate trace, which caused a
// false "satisfied" status in production: a case measured/observed in the
// kit's source project (not in the target project) — a missing review
// disappeared from the `missingPr` list because the text only *mentioned*
// the marker, it didn't issue it as a verdict.
export function tracesFromComments(comments) {
  const found = new Set()
  for (const c of comments ?? []) {
    for (const m of String(c?.body ?? '').matchAll(/^\[agent:([a-zíáéúőóüöű]+)\]/gim)) {
      found.add(m[1].toLowerCase())
    }
  }
  return found
}

// The evaluation. Input:
//   size          — 'S'|'M'|'L'|null (null → the strictest L, the same
//                   principle as in spToSize)
//   sp            — optional, if the size isn't in the PR body but the
//                   ticket has an SP
//   prComments    — [{body}] on the PR (comments + reviews)
//   ticketComments — [{body}] on the linked ticket(s); pass `null` if there's
//                    no resolvable link: in that case the ticket traces are
//                    also looked for on the PR, so the gap can't disappear.
export function evaluate({ size, sp, prComments, ticketComments, language }) {
  const m = messages(language)
  const effectiveSize = size ?? (sp != null ? spToSize(sp) : 'L')
  const chain = chainForSize(effectiveSize)
  const prTraces = tracesFromComments(prComments)
  const ticketHasLink = Array.isArray(ticketComments)
  const ticketTraces = ticketHasLink ? tracesFromComments(ticketComments) : prTraces

  const missingPr = chain.prTraces.filter((a) => !prTraces.has(a))
  const missingTicket = chain.issueTraces.filter((a) => !ticketTraces.has(a))

  return {
    size: effectiveSize,
    language,
    sizeSource: size ? m.sourcePrBody : sp != null ? m.sourceTicketSp : m.sourceUnknown,
    ticketHasLink,
    expectedPr: chain.prTraces,
    expectedTicket: chain.issueTraces,
    missingPr,
    missingTicket,
    complete: missingPr.length === 0 && missingTicket.length === 0,
  }
}

// The bot comment's text. The marker is on the first line, so the shell can
// find the previous comment and UPDATE it, instead of piling up new ones.
export function commentText(result, language = result?.language) {
  const m = messages(language)
  const tag = (a) => `\`[agent:${a}]\``
  const lines = [MARKER, '', m.commentHeader(result.size, result.sizeSource), '']

  if (result.complete) {
    lines.push(m.commentComplete)
  } else {
    lines.push(m.commentIncomplete)
    lines.push('')
    if (result.missingPr.length > 0) {
      lines.push(m.commentMissingPr(result.missingPr.map(tag).join(', ')))
    }
    if (result.missingTicket.length > 0) {
      const where = result.ticketHasLink ? m.commentWhereTicket : m.commentWherePr
      lines.push(m.commentMissingTicket(where, result.missingTicket.map(tag).join(', ')))
    }
  }

  // The footer's expectation list also comes with the role gloss: the bot
  // comment is often the FIRST thing a new contributor sees of the workflow.
  const withRole = (a) => (m.agentRoles[a] ? `${a} (${m.agentRoles[a]})` : a)
  lines.push(
    '',
    m.commentFooter(
      result.expectedPr.map(withRole).join(', '),
      result.expectedTicket.map(withRole).join(', '),
    ),
  )
  return lines.join('\n')
}
