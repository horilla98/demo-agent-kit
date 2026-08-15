import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sizeFromPrBody,
  linkedTickets,
  tracesFromComments,
  evaluate,
  commentText,
  MARKER,
} from '../chain-trace-logic.mjs'

test('sizeFromPrBody — the template field\'s shapes', () => {
  assert.equal(sizeFromPrBody('Méret: M'), 'M')
  assert.equal(sizeFromPrBody('**Méret**: l'), 'L')
  assert.equal(sizeFromPrBody('something\nMéret: S\nelse'), 'S')
  assert.equal(sizeFromPrBody('not present'), null)
})

test('sizeFromPrBody — the English template\'s "Size:" label is also recognized (regression: the Hungarian case must not break)', () => {
  assert.equal(sizeFromPrBody('Size: M'), 'M')
  assert.equal(sizeFromPrBody('**Size**: l'), 'L')
  assert.equal(sizeFromPrBody('Méret: S'), 'S')
})

test('sizeFromPrBody — both language labels present at once: the FIRST (earlier) line wins', () => {
  // A mixed-language PR body (e.g. mid template-edit, or if someone
  // accidentally leaves both blocks in) — the behavior is defined (the first
  // match), but wasn't tested until now; a future priority swap (e.g.
  // "English always wins") would silently break here.
  assert.equal(sizeFromPrBody('Méret: M\nSize: L'), 'M', 'the Hungarian line comes first, it wins')
  assert.equal(sizeFromPrBody('Size: L\nMéret: M'), 'L', 'reversed, the English line comes first, it wins')
})

test('sizeFromPrBody — a malformed label shape (substring match) does NOT give a false hit', () => {
  // "Méretezés"/"MaxSize" contain the "Méret"/"Size" character sequence, but
  // aren't the field label — the pattern must reject this, not guess "M"/"S"
  // out of it.
  assert.equal(sizeFromPrBody('Méretezés: M'), null)
  assert.equal(sizeFromPrBody('MaxSize: L'), null)
})

test('linkedTickets — Closes/Fixes/Resolves, no duplicates', () => {
  assert.deepEqual(linkedTickets('Closes #12\nFixes #12\nresolves #7'), [12, 7])
  assert.deepEqual(linkedTickets('related to: #99'), [])
})

test('tracesFromComments — [agent:x] markers lowercased', () => {
  const traces = tracesFromComments([{ body: '[agent:Reka] verdict: PASS' }, { body: 'plain comment' }])
  assert.deepEqual([...traces], ['reka'])
})

test('tracesFromComments — regression: a marker quoted in prose doesn\'t count as a real gate trace (a measured 🔴 case)', () => {
  // A real case in the kit's source project (agent-kit v1.0, not the current
  // target project): someone wrote in a PR comment that they were NOT
  // issuing a verdict — the sentence literally quoted the `[agent:reka]`
  // shape, yet there was no gate verdict. Before the fix, the pattern ran
  // without a start-of-line anchor or author check, so it matched this too:
  // an ACTUALLY OCCURRED false-positive chain trace (the missing verdict
  // disappeared from the "missingPr" list even though it had never actually
  // been issued) — not a theoretical risk, but a bug observed in the source
  // project's own bot output. The fixed pattern tightens the match to a
  // start-of-line anchor (`^...gim`) — this test guards that: reverting the
  // fix would make the prose quote produce a false trace again.
  const proseComment = {
    body:
      'INV-1 (whoever writes doesn\'t gate) currently isn\'t satisfied, and I ' +
      'won\'t issue a verdict on my own work — not as `[agent:reka]`, not under any name. The dispatcher isn\'t a gate.',
  }
  const traces = tracesFromComments([proseComment])
  assert.deepEqual(
    [...traces],
    [],
    'a marker quoted in a prose sentence is not a real gate trace',
  )
})

test('tracesFromComments — alongside the start-of-line anchor, a real, line-start verdict marker is still recognized', () => {
  // The tightening above must not exclude the real case: a marker at the
  // start of one of several lines in a comment (the conventional
  // `[agent:x] Verdict: …` shape) still counts as a gate trace.
  const traces = tracesFromComments([{ body: '[agent:tibor] Verdict: PASS\n[agent:zsofi] also fine' }])
  assert.deepEqual([...traces].sort(), ['tibor', 'zsofi'])
})

test('evaluate — complete L chain', () => {
  const result = evaluate({
    size: 'L',
    prComments: ['tibor', 'reka', 'zsofi', 'columbo'].map((a) => ({ body: `[agent:${a}] ok` })),
    ticketComments: ['sara', 'bence'].map((a) => ({ body: `[agent:${a}] ok` })),
  })
  assert.equal(result.complete, true)
  assert.deepEqual(result.missingPr, [])
  assert.deepEqual(result.missingTicket, [])
})

test('evaluate — missing trace at size S', () => {
  const result = evaluate({ size: 'S', prComments: [], ticketComments: null })
  assert.equal(result.complete, false)
  assert.deepEqual(result.missingPr, ['reka'])
})

test('evaluate — an unknown size requests the strictest chain', () => {
  const result = evaluate({ size: null, prComments: [], ticketComments: null })
  assert.equal(result.size, 'L')
  assert.match(result.sizeSource, /ismeretlen/)
})

test('evaluate — size computed from SP when absent from the PR body', () => {
  const result = evaluate({ size: null, sp: 3, prComments: [], ticketComments: null })
  assert.equal(result.size, 'M')
  assert.equal(result.sizeSource, 'ticket SP')
})

test('evaluate — with no linked ticket, ticket traces are also looked for on the PR', () => {
  const prComments = ['sara', 'bence', 'tibor', 'reka', 'zsofi', 'columbo'].map((a) => ({ body: `[agent:${a}]` }))
  const result = evaluate({ size: 'L', prComments, ticketComments: null })
  assert.equal(result.ticketHasLink, false)
  assert.equal(result.complete, true, 'a trace present on the PR counts even without a link')
})

test('commentText — the marker is on the first line (update, not accumulation)', () => {
  const text = commentText(evaluate({ size: 'S', prComments: [], ticketComments: null }))
  assert.ok(text.startsWith(MARKER))
})

test('commentText — the signal states that it is not blocking', () => {
  const incomplete = commentText(evaluate({ size: 'S', prComments: [], ticketComments: null }))
  assert.match(incomplete, /nem blokkoló/)
  assert.match(incomplete, /\[agent:reka\]/)

  const complete = commentText(evaluate({ size: 'S', prComments: [{ body: '[agent:reka]' }], ticketComments: null }))
  assert.match(complete, /✅/)
})
