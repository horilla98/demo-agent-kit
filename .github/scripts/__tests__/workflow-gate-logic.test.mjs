import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ticketIdFromBranch,
  sizeFromIssueBody,
  spFromIssueBody,
  branchReuseWarning,
  buildWorkflowGateBlock,
} from '../workflow-gate-logic.mjs'

test('ticketIdFromBranch — the supported branch shapes', () => {
  assert.equal(ticketIdFromBranch('feat/42-order'), 42)
  assert.equal(ticketIdFromBranch('fix/7-bugfix'), 7)
  assert.equal(ticketIdFromBranch('claude/123-something'), 123)
})

test('ticketIdFromBranch — what does not match', () => {
  for (const b of ['main', 'feat/order', 'claude/sprint-4-plan', '', null, undefined, 42]) {
    assert.equal(ticketIdFromBranch(b), null, `${String(b)} → null`)
  }
})

test('sizeFromIssueBody / spFromIssueBody', () => {
  assert.equal(sizeFromIssueBody('intro\n**Méret:** M\nend'), 'M')
  assert.equal(sizeFromIssueBody('**Méret:** XL'), null)
  assert.equal(sizeFromIssueBody(''), null)
  assert.equal(spFromIssueBody('**SP:** 5'), 5)
  assert.equal(spFromIssueBody('**SP-előbecslés:** 13'), 13)
  assert.equal(spFromIssueBody('**SP:** —'), null)
})

test('sizeFromIssueBody — the English template\'s "**Size:**" label is also recognized (regression: the Hungarian case must not break)', () => {
  assert.equal(sizeFromIssueBody('intro\n**Size:** M\nend'), 'M')
  assert.equal(sizeFromIssueBody('**Méret:** L'), 'L')
})

test('sizeFromIssueBody — both language labels present at once: the FIRST match wins', () => {
  assert.equal(sizeFromIssueBody('**Méret:** M\n**Size:** L'), 'M', 'the Hungarian field comes first, it wins')
  assert.equal(sizeFromIssueBody('**Size:** L\n**Méret:** M'), 'L', 'reversed, the English field comes first, it wins')
})

test('sizeFromIssueBody — a malformed label shape (substring match) does NOT give a false hit', () => {
  assert.equal(sizeFromIssueBody('**Méretezés:** M'), null)
  assert.equal(sizeFromIssueBody('**MaxSize:** L'), null)
})

test('branchReuseWarning — only a closed/merged PR signals', () => {
  assert.equal(branchReuseWarning('feat/1-x', []), null)
  assert.equal(branchReuseWarning('feat/1-x', [{ number: 9, state: 'open', merged: false }]), null)
  const message = branchReuseWarning('feat/1-x', [{ number: 9, state: 'closed', merged: true }])
  assert.match(message, /#9 \(mergelve\)/)
  assert.match(message, /ÚJ branch/)
})

test('buildWorkflowGateBlock — unknown size is treated as L, stated explicitly', () => {
  const block = buildWorkflowGateBlock({})
  assert.match(block, /STEP 0/)
  assert.match(block, /TISZTÁZANDÓ/)
  assert.match(block, /L méret kötelező lánca/)
  assert.match(block, /dispatcher M\/L méretnél NEM implementál/)
})

test('buildWorkflowGateBlock — explicit Size overrides SP, and the source is visible', () => {
  const block = buildWorkflowGateBlock({ ticketId: 5, sp: 13, size: 'S' })
  assert.match(block, /Méret: S — a ticket \*\*Méret:\*\* mezőjéből/)
  assert.ok(!block.includes('SP 13 alapján'), 'the two size sources must not mix')
})

test('buildWorkflowGateBlock — size computed from SP', () => {
  const block = buildWorkflowGateBlock({ ticketId: 5, sp: 3 })
  assert.match(block, /Méret: M — SP 3 alapján/)
  assert.match(block, /Ticket a branch alapján: #5/)
})

test('buildWorkflowGateBlock — the branch-reuse warning comes first', () => {
  const block = buildWorkflowGateBlock({
    branch: 'feat/1-x',
    priorPRs: [{ number: 9, state: 'closed', merged: true }],
  })
  const warningIndex = block.indexOf('FIGYELEM')
  const step0Index = block.indexOf('STEP 0')
  assert.ok(warningIndex > -1 && warningIndex < step0Index)
})

test('buildWorkflowGateBlock — the test command is included when present', () => {
  assert.match(buildWorkflowGateBlock({ test: 'pytest -q' }), /`pytest -q`/)
  assert.ok(!buildWorkflowGateBlock({}).includes('Minden változtatás után kötelező'))
})
