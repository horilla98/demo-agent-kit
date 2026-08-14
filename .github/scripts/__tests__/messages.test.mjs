import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TABLES, KEYS, messages } from '../messages.mjs'

// Guard tests for the runtime message table.
//
// WHY: v1.0's documented limitation was that script output stayed Hungarian
// even on an English install. That limitation is gone — but a string table
// is only as good as it is COMPLETE. A missing English key would silently
// return Hungarian text in an English repo (that's exactly why the fallback
// exists), and that silence is precisely the failure class the kit disallows
// everywhere else.
//
// The Hungarian table is the key reference (see `messages.mjs`), so the
// parity direction is unambiguous: every non-Hungarian table is measured
// against it.

const NON_HUNGARIAN = Object.keys(TABLES).filter((lang) => lang !== 'magyar')

test('every language table has ALL of the Hungarian table\'s keys', () => {
  for (const lang of NON_HUNGARIAN) {
    const missing = KEYS.filter((k) => !(k in TABLES[lang]))
    assert.deepEqual(
      missing,
      [],
      `the "${lang}" table is missing: ${missing.join(', ')} — because of the fallback this ` +
        'would silently return Hungarian text in a non-Hungarian repo',
    )
  }
})

test('no language table contains a key that does NOT exist in Hungarian (typo guard)', () => {
  for (const lang of NON_HUNGARIAN) {
    const extra = Object.keys(TABLES[lang]).filter((k) => !KEYS.includes(k))
    assert.deepEqual(
      extra,
      [],
      `the "${lang}" table has a key nobody calls: ${extra.join(', ')} ` +
        '(a typo\'d key name — the caller would get the Hungarian text)',
    )
  }
})

test('matching keys have the same shape and the same arity in every language', () => {
  for (const lang of NON_HUNGARIAN) {
    for (const key of KEYS) {
      const hu = TABLES.magyar[key]
      const other = TABLES[lang][key]
      assert.equal(
        typeof other,
        typeof hu,
        `${lang}.${key} has type ${typeof other}, Hungarian has ${typeof hu} — the caller ` +
          'would call one and print the other',
      )
      if (typeof hu === 'function') {
        assert.equal(
          other.length,
          hu.length,
          `${lang}.${key} expects ${other.length} params, Hungarian expects ${hu.length} — ` +
            'the caller would leave a blank in the text in one language',
        )
      }
      if (Array.isArray(hu)) {
        assert.ok(Array.isArray(other), `${lang}.${key} is not an array, but Hungarian is`)
      }
      // A nested object (e.g. agentRoles): the key set must match too — a
      // missing agent role would silently print a name with no gloss.
      if (hu && typeof hu === 'object' && !Array.isArray(hu)) {
        assert.deepEqual(
          Object.keys(other).sort(),
          Object.keys(hu).sort(),
          `${lang}.${key}'s nested keys differ from Hungarian's`,
        )
      }
    }
  }
})

// Untranslated-line guard: a Hungarian sentence copy-pasted into the English
// table but not translated carries a Hungarian accented character. Agent
// names (izsak, zsofi, reka) appear WITHOUT accents — machine keys, not
// prose — so they don't trigger a false alarm.
const HUNGARIAN_ACCENT = /[áéíóöőúüű]/i

test('the English table contains no Hungarian accented character (untranslated-line guard)', () => {
  const suspects = []
  for (const key of KEYS) {
    const value = TABLES.english[key]
    const sample =
      typeof value === 'function'
        ? value('X', 'Y', 'Z')
        : Array.isArray(value)
          ? value.join(' ')
          : value && typeof value === 'object'
            ? Object.values(value).join(' ')
            : value
    if (HUNGARIAN_ACCENT.test(String(sample))) suspects.push(key)
  }
  assert.deepEqual(suspects, [], `Hungarian accent in the English table: ${suspects.join(', ')}`)
})

test('messages() falls back to Hungarian for an unknown language, doesn\'t throw, doesn\'t give undefined', () => {
  for (const lang of [undefined, null, '', 'klingon', 42]) {
    const m = messages(lang)
    for (const key of KEYS) {
      assert.notEqual(m[key], undefined, `${String(lang)} → ${key} undefined`)
    }
    assert.equal(m.commentComplete, TABLES.magyar.commentComplete)
  }
})

test('messages("english") actually gives the English value', () => {
  const m = messages('english')
  assert.equal(m.sourcePrBody, 'PR body')
  assert.match(m.gateTitle('Demo'), /^Workflow gate/)
  assert.match(m.gateTitle('Demo'), /\(Demo\)/)
})

// The role gloss is the ONLY thing that makes the chain output readable for a
// non-Hungarian reader — agent names are machine keys, they aren't translated.
test('every agent name in the chain output has its role next to it, in both languages', async () => {
  const { buildWorkflowGateBlock } = await import('../workflow-gate-logic.mjs')

  const english = buildWorkflowGateBlock({ size: 'L', language: 'english' })
  assert.match(english, /reka \(review\)/)
  assert.match(english, /zsofi \(docs\)/)
  assert.match(english, /sara \(analysis\) → bence \(architecture\)/)

  const hungarianBlock = buildWorkflowGateBlock({ size: 'L', language: 'magyar' })
  assert.match(hungarianBlock, /reka \(review\)/)
  assert.match(hungarianBlock, /zsofi \(doksi\)/)
})

test('an unknown agent name appears with no gloss, with no empty parenthetical', () => {
  const m = messages('english')
  assert.equal(m.agentRoles.jocasta, undefined, 'no such agent — the gloss table cannot invent a role')
})
