import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spToSize, chainForSize, CHAIN_BY_SIZE } from '../chain-table.mjs'

test('spToSize — the band boundaries', () => {
  assert.equal(spToSize(1), 'S')
  assert.equal(spToSize(2), 'S')
  assert.equal(spToSize(3), 'M')
  assert.equal(spToSize(5), 'M')
  assert.equal(spToSize(7), 'M') // non-standard Fibonacci, rounded up to M
  assert.equal(spToSize(8), 'L')
  assert.equal(spToSize(13), 'L')
})

test('spToSize — invalid/missing input falls onto the strictest chain', () => {
  for (const bad of [undefined, null, '', 'eight', NaN, 0, -3, Infinity]) {
    assert.equal(spToSize(bad), 'L', `${String(bad)} → L`)
  }
})

test('chainForSize — an unknown size gives the strictest chain', () => {
  assert.deepEqual(chainForSize('XL'), CHAIN_BY_SIZE.L)
  assert.deepEqual(chainForSize(undefined), CHAIN_BY_SIZE.L)
})

test('izsak must not appear on either chain list (INV-1: whoever writes doesn\'t gate)', () => {
  for (const [size, chain] of Object.entries(CHAIN_BY_SIZE)) {
    assert.ok(!chain.prTraces.includes('izsak'), `${size} prTraces`)
    assert.ok(!chain.issueTraces.includes('izsak'), `${size} issueTraces`)
  }
})

test('chain strictness grows monotonically S → M → L', () => {
  const weight = (s) => CHAIN_BY_SIZE[s].prTraces.length + CHAIN_BY_SIZE[s].issueTraces.length
  assert.ok(weight('S') < weight('M'))
  assert.ok(weight('M') < weight('L'))
})

test('reka is mandatory at every size (the minimal content gate)', () => {
  for (const [s, chain] of Object.entries(CHAIN_BY_SIZE)) {
    assert.ok(chain.prTraces.includes('reka'), `${s} is missing reka`)
  }
})
