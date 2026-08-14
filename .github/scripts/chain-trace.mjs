// Chain-trace signal — thin IO shell on top of `chain-trace-logic.mjs`.
//
// Started by the PR-signals workflow. Compares the agent traces expected by
// size against what's actually present, and leaves a single, UPDATED bot
// comment on the PR (doesn't pile up new ones). A signal, not a gate: never
// returns a failing exit code just because a trace is missing.

import { gh, ghAll, OWNER, REPO, eventPrNumber, ensureAuth } from './gh-api.mjs'
import { evaluate, commentText, sizeFromPrBody, linkedTickets, MARKER } from './chain-trace-logic.mjs'
import { spFromIssueBody, sizeFromIssueBody } from './workflow-gate-logic.mjs'
import { projectConfig } from './project-config.mjs'
import { messages } from './messages.mjs'

async function main() {
  const language = projectConfig().nyelv
  const m = messages(language)
  ensureAuth()
  const prNumber = await eventPrNumber()
  if (prNumber == null) {
    console.log(m.signalNoPr)
    return
  }

  const pr = await gh('GET', `/repos/${OWNER}/${REPO}/pulls/${prNumber}`)
  const comments = await ghAll(`/repos/${OWNER}/${REPO}/issues/${prNumber}/comments`)
  const reviews = await ghAll(`/repos/${OWNER}/${REPO}/pulls/${prNumber}/reviews`)
  const prComments = [...comments, ...reviews]

  // Size: primarily from the PR body's mandatory field; if absent, from the
  // linked ticket's **Size:**/**SP:** field; if that's absent too, L (the
  // strictest).
  let size = sizeFromPrBody(pr.body)
  let sp = null
  const ticketNumbers = linkedTickets(pr.body)
  let ticketComments = null

  if (ticketNumbers.length > 0) {
    ticketComments = []
    for (const num of ticketNumbers) {
      try {
        const issue = await gh('GET', `/repos/${OWNER}/${REPO}/issues/${num}`)
        size ??= sizeFromIssueBody(issue?.body)
        sp ??= spFromIssueBody(issue?.body)
        ticketComments.push(...(await ghAll(`/repos/${OWNER}/${REPO}/issues/${num}/comments`)))
      } catch {
        // Unresolvable reference: the logic treats this as if there were no
        // link — it looks for the ticket traces on the PR instead.
      }
    }
    if (ticketComments.length === 0) ticketComments = null
  }

  const result = evaluate({ size, sp, prComments, ticketComments, language })
  const text = commentText(result, language)

  const existing = comments.find((c) => String(c.body ?? '').startsWith(MARKER))
  if (existing) {
    if (String(existing.body).trim() === text.trim()) {
      console.log(m.signalUnchanged)
    } else {
      await gh('PATCH', `/repos/${OWNER}/${REPO}/issues/comments/${existing.id}`, { body: text })
      console.log(m.signalUpdated)
    }
  } else {
    await gh('POST', `/repos/${OWNER}/${REPO}/issues/${prNumber}/comments`, { body: text })
    console.log(m.signalCreated)
  }

  console.log(m.signalSummary(result.size, result.complete))
}

main().catch((err) => {
  // Signal, not a gate: we print the error, but the workflow doesn't fail
  // because of it.
  console.error(messages(projectConfig().nyelv).signalError(err.message))
})
