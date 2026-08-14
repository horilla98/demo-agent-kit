import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Őrző teszt a sablon `ci.yml` `projekt-teszt` job "Run project tests"
// lépésének (a lépés-nevek angolok mindkét telepítési nyelven — a GitHub
// Actions felülete egynyelvű; l. a workflow fejléc-kommentjét) `run:` blokkjára — a kit forrás-projektjében (agent-kit v1.0,
// nem a jelen, cél-projektben) TÉNYLEGESEN MÉRT eset szerint ez a hibaosztály
// (script-injekció a projekt-specifikus teszt-parancson át) korábban KÉTSZER
// is visszakerült: először közvetlen `${{ }}`-interpoláció a `run:` sorba,
// majd — az `env:`-indirekció bevezetése UTÁN — `eval "$TESZT"`. Ez utóbbit
// nem vélemény, hanem lefuttatott próba zárta ki: egy `echo hi; touch PWNED`
// alakú teszt-parancs mellett a `touch PWNED` ténylegesen lefutott.
// A javított állapot mindkettőt kizárja: a `${{ }}` értéket
// `env:` viszi be shell-változóként, a futtató sorban nincs `eval`, és a
// `$TESZT` idézetlen (nem `"$TESZT"`), hogy a shell CSAK szóhatárokra bontson,
// metakaraktereket (`;`, `&&`, `|`, átirányítás) ne értelmezzen újra.
//
// A teszt SZÁNDÉKOSAN nem nyers nagy fájl grep, hanem a `run: |` blokk-
// szkalárt céloz: a hibaosztály a `run:` blokk TARTALMára vonatkozik, az azt
// megelőző `env:`-magyarázó komment (ami maga is idézi az "eval" szót, hogy
// megindokolja a hiányát) NEM tartozik bele — egy laza teljes-fájl grep ezen
// a kommenten hamis pozitívot adna. YAML-parser híján (zéró új függőség,
// CLAUDE.md) a blokk-szkalár kinyerése indentáció-alapú szöveg-ellenőrzés;
// ez ártalmatlan átfogalmazást (extra üres sor, komment a blokkon KÍVÜL,
// lépés átrendezése) tűr, mert a `run: |` kulcsot és annak indentációs
// mélységét követi, nem sor-számot vagy pontos szöveget.

const ciYmlUt = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../workflows/ci.yml')

function runBlokkTartalma(yml, lepesNev) {
  const sorok = yml.split('\n')
  const lepesIdx = sorok.findIndex((s) => s.includes(`name: ${lepesNev}`))
  assert.ok(lepesIdx > -1, `nem található "${lepesNev}" nevű lépés a ci.yml-ben`)

  const runIdx = sorok.findIndex((s, i) => i > lepesIdx && /^\s*run:\s*\|\s*$/.test(s))
  assert.ok(runIdx > -1, `a(z) "${lepesNev}" lépés után nincs "run: |" blokk-szkalár`)
  const runIndent = sorok[runIdx].match(/^\s*/)[0].length

  const blokk = []
  for (let i = runIdx + 1; i < sorok.length; i++) {
    const sor = sorok[i]
    if (sor.trim() === '') {
      blokk.push(sor)
      continue
    }
    const indent = sor.match(/^\s*/)[0].length
    if (indent <= runIndent) break
    blokk.push(sor)
  }
  return blokk.join('\n')
}

test('ci.yml — a projekt-teszt "run:" blokkjában nincs eval (script-injekció, mért eset)', () => {
  const yml = readFileSync(ciYmlUt, 'utf8')
  const blokk = runBlokkTartalma(yml, 'Run project tests')
  assert.doesNotMatch(
    blokk,
    /\beval\b/,
    'eval a run: blokkban shell-metakaraktereket (;, &&, |, átirányítás) is újraértelmez a ' +
      'config.json-ból jövő $TESZT-en — a kit forrás-projektjében LEFUTTATOTT próbával mérve: ' +
      '"echo hi; touch PWNED" mellett a touch ténylegesen lefutott, nem elméleti kockázat.',
  )
})

test('ci.yml — a projekt-teszt "run:" blokkjában nincs közvetlen ${{ }} GitHub Actions interpoláció', () => {
  const yml = readFileSync(ciYmlUt, 'utf8')
  const blokk = runBlokkTartalma(yml, 'Run project tests')
  assert.doesNotMatch(
    blokk,
    /\$\{\{/,
    'a config.json-ból jövő értéknek "env:"-en át kell bejutnia a run: blokkba, NEM közvetlen ' +
      '${{ }}-interpolációval — az utóbbi a felhasználó-vezérelt szöveget szó szerint a ' +
      'shell-parancsba írná (a kit forrás-projektjében azonosított eredeti lelet).',
  )
})
