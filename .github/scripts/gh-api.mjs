// Közös, függőség-mentes GitHub REST kliens a workflow-scriptekhez.
// Env: GITHUB_TOKEN (vagy GH_TOKEN), GITHUB_REPOSITORY (tulaj/repo).
//
// A modul betöltése SOSEM lép ki a folyamatból hiányzó token miatt — a hívó
// dönti el, mit tesz (a session-hookok némán továbbmennek, a workflow-k
// hangosan buknak). Az `ensureAuth()` az a pont, ahol a hiány hibává válik.

import { uzenetek } from './uzenetek.mjs'
import { projektConfig } from './projekt-config.mjs'

const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? ''
export const [OWNER, REPO] = (process.env.GITHUB_REPOSITORY ?? '').split('/')

export function vanAuth() {
  return Boolean(TOKEN && OWNER && REPO)
}

export function ensureAuth() {
  if (!vanAuth()) {
    throw new Error(uzenetek(projektConfig().nyelv).ghNincsAuth)
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

// Lapozott listázás (issues, pulls, comments…).
export async function ghAll(path) {
  const sep = path.includes('?') ? '&' : '?'
  const mind = []
  for (let oldal = 1; ; oldal++) {
    const adag = await gh('GET', `${path}${sep}per_page=100&page=${oldal}`)
    if (!Array.isArray(adag)) return mind
    mind.push(...adag)
    if (adag.length < 100) return mind
  }
}

// A futó workflow-eseményből (vagy kézi `workflow_dispatch` inputból) kiolvasott
// PR-szám. Egy helyen, hogy a hívók ne másolják el.
export async function esemenyPrSzam() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (eventPath) {
    try {
      const { readFileSync, existsSync } = await import('node:fs')
      if (existsSync(eventPath)) {
        const event = JSON.parse(readFileSync(eventPath, 'utf8'))
        if (event.pull_request?.number) return event.pull_request.number
        // issue_comment esemény: csak akkor PR-komment, ha a payload jelzi.
        if (event.issue?.pull_request && event.issue?.number) return event.issue.number
      }
    } catch {
      // néma: a `PR_NUMBER_INPUT` fallback még adhat számot
    }
  }
  const input = process.env.PR_NUMBER_INPUT?.trim()
  return input ? Number(input) : null
}
