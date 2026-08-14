// Munkarend-kapu — SessionStart-hook.
//
// MIÉRT: minden session-indítás alapból a STEP 0 méret-számítással és a méret
// szerinti kötelező lánccal induljon, ne csússzon bele a dispatcher közvetlen
// implementációba M/L méretnél.
//
// MIT: kiolvassa a jelen branch nevét, abból (ha `feat|fix|claude/<id>-…`) a
// ticket-számot, lekéri a ticket törzsét (`**Méret:**` vagy `**SP:**` mező), és a
// `buildMunkarendBlock` kimenetét írja a session kontextusába (stdout).
//
// VASSZABÁLY: hálózat-hiba / hiányzó token / branch nélküli ticket esetén NÉMA a
// hiba, de a blokk MINDIG kiíródik — a STEP 0 emlékeztető minden session-indításkor
// kell, nem csak élő GitHub-hozzáféréssel. A hook SOSEM dob és SOSEM blokkolja a
// session indulását.

import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { buildMunkarendBlock, ticketIdFromBranch, sizeFromIssueBody, spFromIssueBody } from './munkarend-kapu-logic.mjs'
import { projektConfig, repoResz } from './projekt-config.mjs'

// `git branch --show-current` szándékosan a `rev-parse --abbrev-ref HEAD` helyett:
// commit nélküli (unborn) branchen is a nevet adja, míg a rev-parse ilyenkor hibát
// ír a stderr-re — az pedig a session kontextusába szemetelne. A stderr így is
// elnyelve (`ignore`): a hook kimenete kizárólag a munkarend-blokk lehet.
function jelenlegiBranch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

function vanGhEnv() {
  return Boolean(process.env.GITHUB_TOKEN || process.env.GH_TOKEN)
}

async function ticketMeret(ticketId, tulaj, repo) {
  if (ticketId == null || !tulaj || !vanGhEnv()) return { ticketId, sp: null, size: null }
  try {
    const { gh } = await import('./gh-api.mjs')
    const issue = await gh('GET', `/repos/${tulaj}/${repo}/issues/${ticketId}`)
    return { ticketId, size: sizeFromIssueBody(issue?.body), sp: spFromIssueBody(issue?.body) }
  } catch {
    return { ticketId, sp: null, size: null }
  }
}

async function korabbiPrek(branch, tulaj, repo) {
  if (!branch || !tulaj || !vanGhEnv()) return []
  try {
    const { gh } = await import('./gh-api.mjs')
    const prs = await gh('GET', `/repos/${tulaj}/${repo}/pulls?head=${tulaj}:${encodeURIComponent(branch)}&state=all`)
    return prs.map((p) => ({ number: p.number, state: p.state, merged: Boolean(p.merged_at) }))
  } catch {
    return []
  }
}

async function main() {
  const config = projektConfig()
  const [tulaj, repo] = repoResz(config)
  const branch = jelenlegiBranch()
  const ticketId = ticketIdFromBranch(branch)
  const info = await ticketMeret(ticketId, tulaj, repo).catch(() => ({ ticketId, sp: null, size: null }))
  const priorPRs = await korabbiPrek(branch, tulaj, repo).catch(() => [])
  process.stdout.write(
    buildMunkarendBlock({
      ...info,
      branch,
      priorPRs,
      projekt: config.projekt,
      teszt: config.teszt,
      nyelv: config.nyelv,
    }),
  )
}

// Csak közvetlen futtatáskor (hook) indul; importáláskor (teszt) nem.
let isMain = false
try {
  isMain = import.meta.url === pathToFileURL(realpathSync(process.argv[1] ?? '')).href
} catch {
  isMain = false
}

if (isMain) {
  main().catch(() => {
    // Vasszabály: bármilyen hiba → generikus blokk; a session-indulás sosem akad el.
    process.stdout.write(buildMunkarendBlock({}))
  })
}
