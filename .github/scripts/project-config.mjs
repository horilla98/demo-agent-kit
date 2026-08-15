// The project's machine configuration — ONE source: `agent-kit.config.json`
// at the repo root. Scripts read from here, never from CLAUDE.md's prose.
//
// Hard rule: on a missing or broken config we do NOT throw — we return a
// sensible default. A hook or a signal workflow must never block work just
// because the config is missing.
//
// Note: the object keys below (`projekt`, `nyelv`, `teszt`, `repo`, `domain`,
// `kodGyoker`, `tapasztalat`, `agentKitVerzio`) are the actual
// `agent-kit.config.json` field names — this is the external config-file
// contract shared with the paid installer, so they are intentionally left
// untranslated rather than "fixed" to English identifiers.

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export const DEFAULTS = {
  projekt: 'unknown project',
  repo: process.env.GITHUB_REPOSITORY ?? '',
  domain: '',
  t0: [],
  // Only comes into play when there's no (readable) agent-kit.config.json —
  // the installer ALWAYS writes out the actual language. The default matches
  // the installer's ALAP_NYELV, so a half-finished repo doesn't switch
  // language.
  nyelv: 'english',
  teszt: 'npm test',
  lint: 'npm run lint',
  kodGyoker: '.',
  tapasztalat: 'kezdo',
  agentKitVerzio: '0.0.0',
}

// `root`: the repo root (the caller may supply it; defaults to the process's
// cwd, or the project directory Claude Code sets).
export function projectConfig(root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()) {
  const path = join(root, 'agent-kit.config.json')
  if (!existsSync(path)) return { ...DEFAULTS }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    return { ...DEFAULTS, ...raw }
  } catch {
    return { ...DEFAULTS }
  }
}

// `owner/repo` → `[owner, repo]`; if missing or malformed, `[null, null]`.
export function repoParts(config) {
  const [owner, repo] = String(config?.repo ?? '').split('/')
  return owner && repo ? [owner, repo] : [null, null]
}
