import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spToSize, chainForSize, CHAIN_BY_SIZE } from '../lanc-tabla.mjs'

test('spToSize — a sávhatárok', () => {
  assert.equal(spToSize(1), 'S')
  assert.equal(spToSize(2), 'S')
  assert.equal(spToSize(3), 'M')
  assert.equal(spToSize(5), 'M')
  assert.equal(spToSize(7), 'M') // nem szabványos Fibonacci, felfelé kerekítve M
  assert.equal(spToSize(8), 'L')
  assert.equal(spToSize(13), 'L')
})

test('spToSize — hibás/hiányzó bemenet a legszigorúbb láncra esik', () => {
  for (const rossz of [undefined, null, '', 'nyolc', NaN, 0, -3, Infinity]) {
    assert.equal(spToSize(rossz), 'L', `${String(rossz)} → L`)
  }
})

test('chainForSize — ismeretlen méret a legszigorúbb láncot adja', () => {
  assert.deepEqual(chainForSize('XL'), CHAIN_BY_SIZE.L)
  assert.deepEqual(chainForSize(undefined), CHAIN_BY_SIZE.L)
})

test('izsák egyik lánc-listán sem szerepelhet (INV-1: aki ír, nem kapuz)', () => {
  for (const [meret, lanc] of Object.entries(CHAIN_BY_SIZE)) {
    assert.ok(!lanc.prTraces.includes('izsak'), `${meret} prTraces`)
    assert.ok(!lanc.issueTraces.includes('izsak'), `${meret} issueTraces`)
  }
})

test('a lánc szigorúsága monoton nő S → M → L', () => {
  const meret = (m) => CHAIN_BY_SIZE[m].prTraces.length + CHAIN_BY_SIZE[m].issueTraces.length
  assert.ok(meret('S') < meret('M'))
  assert.ok(meret('M') < meret('L'))
})

test('réka minden méretnél kötelező (a minimális tartalmi kapu)', () => {
  for (const [m, lanc] of Object.entries(CHAIN_BY_SIZE)) {
    assert.ok(lanc.prTraces.includes('reka'), `${m} méretnél hiányzik réka`)
  }
})
