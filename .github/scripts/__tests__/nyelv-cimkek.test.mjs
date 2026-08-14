import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MERET_CIMKE, meretCimkeMinta } from '../nyelv-cimkek.mjs'

test('MERET_CIMKE — minden támogatott nyelv szerepel', () => {
  assert.equal(MERET_CIMKE.magyar, 'Méret')
  assert.equal(MERET_CIMKE.english, 'Size')
})

test('meretCimkeMinta — mindkét szó benne van, alternáció-mintaként', () => {
  const minta = meretCimkeMinta()
  assert.match(minta, /Méret/)
  assert.match(minta, /Size/)
  assert.equal(minta, 'Méret|Size')
})
