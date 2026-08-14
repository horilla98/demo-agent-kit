// A projekt gépi konfigurációja — EGY forrás: `agent-kit.config.json` a repó
// gyökerében. A scriptek innen olvasnak, sosem a CLAUDE.md prózájából.
//
// Vasszabály: hiányzó vagy hibás konfig esetén NEM dobunk — értelmes
// alapértelmezéssel térünk vissza. Egy hook vagy egy jelző-workflow soha nem
// akaszthatja meg a munkát azért, mert a konfig hiányzik.

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export const ALAPERTELMEZES = {
  projekt: 'ismeretlen projekt',
  repo: process.env.GITHUB_REPOSITORY ?? '',
  domain: '',
  t0: [],
  // Csak akkor jut szóhoz, ha nincs (olvasható) agent-kit.config.json — a
  // telepítő MINDIG kiírja a tényleges nyelvet. Az alapértelmezés a telepítő
  // ALAP_NYELV-ével egyezik, hogy egy fél-kész repó ne váltson nyelvet.
  nyelv: 'english',
  teszt: 'npm test',
  lint: 'npm run lint',
  kodGyoker: '.',
  tapasztalat: 'kezdo',
  agentKitVerzio: '0.0.0',
}

// `gyoker`: a repó gyökere (a hívó adhatja meg; alapból a folyamat cwd-je vagy
// a Claude Code által beállított projekt-könyvtár).
export function projektConfig(gyoker = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()) {
  const ut = join(gyoker, 'agent-kit.config.json')
  if (!existsSync(ut)) return { ...ALAPERTELMEZES }
  try {
    const nyers = JSON.parse(readFileSync(ut, 'utf8'))
    return { ...ALAPERTELMEZES, ...nyers }
  } catch {
    return { ...ALAPERTELMEZES }
  }
}

// `tulaj/repo` → `[tulaj, repo]`; ha nincs vagy hibás, `[null, null]`.
export function repoResz(config) {
  const [tulaj, repo] = String(config?.repo ?? '').split('/')
  return tulaj && repo ? [tulaj, repo] : [null, null]
}
