import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SIZE_LABEL, sizeLabelPattern } from '../language-labels.mjs'

test('SIZE_LABEL — every supported language is present', () => {
  assert.equal(SIZE_LABEL.magyar, 'Méret')
  assert.equal(SIZE_LABEL.english, 'Size')
})

test('sizeLabelPattern — both words are in it, as an alternation pattern', () => {
  const pattern = sizeLabelPattern()
  assert.match(pattern, /Méret/)
  assert.match(pattern, /Size/)
  assert.equal(pattern, 'Méret|Size')
})
