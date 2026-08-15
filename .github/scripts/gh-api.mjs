// Shared, dependency-free GitHub REST client for the workflow scripts.
// Env: GITHUB_TOKEN (or GH_TOKEN), GITHUB_REPOSITORY (owner/repo).
//
// Loading this module NEVER exits the process for a missing token — the
// caller decides what to do (session hooks silently move on, workflows fail
// loudly). `ensureAuth()` is the point where the gap becomes an error.

import { messages } from './messages.mjs'
import { projectConfig } from './project-config.mjs'

const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? ''
export const [OWNER, REPO] = (process.env.GITHUB_REPOSITORY ?? '').split('/')

export function hasAuth() {
  return Boolean(TOKEN && OWNER && REPO)
}

export function ensureAuth() {
  if (!hasAuth()) {
    throw new Error(messages(projectConfig().nyelv).ghNoAuth)
  }
}

export async function gh(method, path, body) {
  ensureAuth()
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${data?.message ?? ''}`)
    err.status = res.status
    throw err
  }
  return data
}

// Paginated listing (issues, pulls, comments…).
export async function ghAll(path) {
  const sep = path.includes('?') ? '&' : '?'
  const all = []
  for (let page = 1; ; page++) {
    const batch = await gh('GET', `${path}${sep}per_page=100&page=${page}`)
    if (!Array.isArray(batch)) return all
    all.push(...batch)
    if (batch.length < 100) return all
  }
}

// The PR number read from the running workflow event (or a manual
// `workflow_dispatch` input). One place, so callers don't duplicate it.
export async function eventPrNumber() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (eventPath) {
    try {
      const { readFileSync, existsSync } = await import('node:fs')
      if (existsSync(eventPath)) {
        const event = JSON.parse(readFileSync(eventPath, 'utf8'))
        if (event.pull_request?.number) return event.pull_request.number
        // issue_comment event: only a PR comment if the payload says so.
        if (event.issue?.pull_request && event.issue?.number) return event.issue.number
      }
    } catch {
      // silent: the `PR_NUMBER_INPUT` fallback may still yield a number
    }
  }
  const input = process.env.PR_NUMBER_INPUT?.trim()
  return input ? Number(input) : null
}
