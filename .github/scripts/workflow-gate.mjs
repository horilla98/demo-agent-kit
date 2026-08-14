// Workflow gate — SessionStart hook.
//
// WHY: every session start should begin, by default, with the STEP 0 size
// computation and the mandatory chain for that size, instead of the
// dispatcher sliding straight into direct implementation at size M/L.
//
// WHAT: reads the current branch name, derives the ticket number from it (if
// `feat|fix|claude/<id>-…`), fetches the ticket body (`**Size:**` or `**SP:**`
// field), and writes `buildWorkflowGateBlock`'s output into the session
// context (stdout).
//
// HARD RULE: on a network error / missing token / a ticket-less branch the
// error is SILENT, but the block is ALWAYS written — the STEP 0 reminder is
// needed on every session start, not only with live GitHub access. The hook
// NEVER throws and NEVER blocks the session from starting.

import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { buildWorkflowGateBlock, ticketIdFromBranch, sizeFromIssueBody, spFromIssueBody } from './workflow-gate-logic.mjs'
import { projectConfig, repoParts } from './project-config.mjs'

// `git branch --show-current` deliberately instead of `rev-parse --abbrev-ref
// HEAD`: it also gives the name on a commit-less (unborn) branch, whereas
// rev-parse would write an error to stderr in that case — which would litter
// the session context. stderr is swallowed either way (`ignore`): the hook's
// output may only ever be the workflow-gate block.
function currentBranch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function hasGhEnv() {
  return Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN)
}

async function ticketSize(ticketId, owner, repo) {
  if (ticketId == null || !owner || !hasGhEnv()) return { ticketId, sp: null, size: null }
  try {
    const { gh } = await import('./gh-api.mjs')
    const issue = await gh('GET', `/repos/${owner}/${repo}/issues/${ticketId}`)
    return { ticketId, size: sizeFromIssueBody(issue?.body), sp: spFromIssueBody(issue?.body) }
  } catch {
    return { ticketId, sp: null, size: null }
  }
}

async function fetchPriorPRs(branch, owner, repo) {
  if (!branch || !owner || !hasGhEnv()) return []
  try {
    const { gh } = await import('./gh-api.mjs')
    const prs = await gh('GET', `/repos/${owner}/${repo}/pulls?head=${owner}:${encodeURIComponent(branch)}&state=all`)
    return prs.map((p) => ({ number: p.number, state: p.state, merged: Boolean(p.merged_at) }))
  } catch {
    return []
  }
}

async function main() {
  const config = projectConfig()
  const [owner, repo] = repoParts(config)
  const branch = currentBranch()
  const ticketId = ticketIdFromBranch(branch)
  const info = await ticketSize(ticketId, owner, repo).catch(() => ({ ticketId, sp: null, size: null }))
  const priorPRs = await fetchPriorPRs(branch, owner, repo).catch(() => [])
  process.stdout.write(
    buildWorkflowGateBlock({
      ...info,
      branch,
      priorPRs,
      project: config.projekt,
      test: config.teszt,
      language: config.nyelv,
    }),
  )
}

// Only runs on direct execution (hook); not on import (test).
let isMain = false
try {
  isMain = import.meta.url === pathToFileURL(realpathSync(process.argv[1] ?? '')).href
} catch {
  isMain = false
}

if (isMain) {
  main().catch(() => {
    // Hard rule: any error → generic block; session start never gets stuck.
    process.stdout.write(buildWorkflowGateBlock({}))
  })
}
