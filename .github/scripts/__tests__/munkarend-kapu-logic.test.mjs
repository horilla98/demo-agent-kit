import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ticketIdFromBranch,
  sizeFromIssueBody,
  spFromIssueBody,
  branchReuseWarning,
  buildMunkarendBlock,
} from '../munkarend-kapu-logic.mjs'

test('ticketIdFromBranch — a támogatott branch-alakok', () => {
  assert.equal(ticketIdFromBranch('feat/42-rendeles'), 42)
  assert.equal(ticketIdFromBranch('fix/7-hibajavitas'), 7)
  assert.equal(ticketIdFromBranch('claude/123-valami'), 123)
})

test('ticketIdFromBranch — ami nem illeszkedik', () => {
  for (const b of ['main', 'feat/rendeles', 'claude/sprint-4-terv', '', null, undefined, 42]) {
    assert.equal(ticketIdFromBranch(b), null, `${String(b)} → null`)
  }
})

test('sizeFromIssueBody / spFromIssueBody', () => {
  assert.equal(sizeFromIssueBody('bevezető\n**Méret:** M\nvége'), 'M')
  assert.equal(sizeFromIssueBody('**Méret:** XL'), null)
  assert.equal(sizeFromIssueBody(''), null)
  assert.equal(spFromIssueBody('**SP:** 5'), 5)
  assert.equal(spFromIssueBody('**SP-előbecslés:** 13'), 13)
  assert.equal(spFromIssueBody('**SP:** —'), null)
})

test('sizeFromIssueBody — az angol sablon „**Size:**” címkéje is felismert (regresszió: a magyar eset nem törhet)', () => {
  assert.equal(sizeFromIssueBody('bevezető\n**Size:** M\nvége'), 'M')
  assert.equal(sizeFromIssueBody('**Méret:** L'), 'L')
})

test('sizeFromIssueBody — mindkét nyelvi címke jelen van egyszerre: az ELSŐ találat nyer', () => {
  assert.equal(sizeFromIssueBody('**Méret:** M\n**Size:** L'), 'M', 'a magyar mező előbb áll, az nyer')
  assert.equal(sizeFromIssueBody('**Size:** L\n**Méret:** M'), 'L', 'megfordítva az angol mező előbb áll, az nyer')
})

test('sizeFromIssueBody — a címke-alak hibás (résszó-egyezés) NEM ad hamis találatot', () => {
  assert.equal(sizeFromIssueBody('**Méretezés:** M'), null)
  assert.equal(sizeFromIssueBody('**MaxSize:** L'), null)
})

test('branchReuseWarning — csak lezárt/mergelt PR jelez', () => {
  assert.equal(branchReuseWarning('feat/1-x', []), null)
  assert.equal(branchReuseWarning('feat/1-x', [{ number: 9, state: 'open', merged: false }]), null)
  const uzenet = branchReuseWarning('feat/1-x', [{ number: 9, state: 'closed', merged: true }])
  assert.match(uzenet, /#9 \(mergelve\)/)
  assert.match(uzenet, /ÚJ branch/)
})

test('buildMunkarendBlock — ismeretlen méret L-ként, kimondva', () => {
  const blokk = buildMunkarendBlock({})
  assert.match(blokk, /STEP 0/)
  assert.match(blokk, /TISZTÁZANDÓ/)
  assert.match(blokk, /L méret kötelező lánca/)
  assert.match(blokk, /dispatcher M\/L méretnél NEM implementál/)
})

test('buildMunkarendBlock — az explicit Méret felülírja az SP-t, és a forrás látszik', () => {
  const blokk = buildMunkarendBlock({ ticketId: 5, sp: 13, size: 'S' })
  assert.match(blokk, /Méret: S — a ticket \*\*Méret:\*\* mezőjéből/)
  assert.ok(!blokk.includes('SP 13 alapján'), 'nem keveredhet a két méret-forrás')
})

test('buildMunkarendBlock — SP-ből számolt méret', () => {
  const blokk = buildMunkarendBlock({ ticketId: 5, sp: 3 })
  assert.match(blokk, /Méret: M — SP 3 alapján/)
  assert.match(blokk, /Ticket a branch alapján: #5/)
})

test('buildMunkarendBlock — a branch-újrafelhasználás figyelmeztetés legelöl áll', () => {
  const blokk = buildMunkarendBlock({
    branch: 'feat/1-x',
    priorPRs: [{ number: 9, state: 'closed', merged: true }],
  })
  const figyelmeztetesIndex = blokk.indexOf('FIGYELEM')
  const step0Index = blokk.indexOf('STEP 0')
  assert.ok(figyelmeztetesIndex > -1 && figyelmeztetesIndex < step0Index)
})

test('buildMunkarendBlock — a teszt-parancs bekerül, ha van', () => {
  assert.match(buildMunkarendBlock({ teszt: 'pytest -q' }), /`pytest -q`/)
  assert.ok(!buildMunkarendBlock({}).includes('Minden változtatás után kötelező'))
})
