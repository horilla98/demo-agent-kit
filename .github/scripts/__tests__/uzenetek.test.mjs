import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TABLAK, KULCSOK, uzenetek } from '../uzenetek.mjs'

// A futásidejű üzenet-tábla őrző tesztjei.
//
// MIÉRT: a v1.0 dokumentált korlátja az volt, hogy a scriptek kimenete angol
// telepítésnél is magyar marad. A korlát megszűnt — de egy string-tábla csak
// addig ér valamit, amíg TELJES. Egy hiányzó angol kulcs némán magyar szöveget
// adna vissza egy angol repóban (a fallback pont ezért van), és ez a némaság
// pontosan az a hiba-osztály, amit a kit sehol máshol nem enged meg.
//
// A magyar tábla a kulcs-referencia (l. `uzenetek.mjs`), tehát a paritás
// iránya egyértelmű: minden nem-magyar tábla ehhez mérődik.

const NEM_MAGYAR = Object.keys(TABLAK).filter((ny) => ny !== 'magyar')

test('minden nyelv tábláján megvan a magyar tábla ÖSSZES kulcsa', () => {
  for (const nyelv of NEM_MAGYAR) {
    const hianyzo = KULCSOK.filter((k) => !(k in TABLAK[nyelv]))
    assert.deepEqual(
      hianyzo,
      [],
      `a(z) "${nyelv}" táblából hiányzik: ${hianyzo.join(', ')} — a fallback miatt ez ` +
        'némán magyar szöveget adna vissza egy nem-magyar repóban',
    )
  }
})

test('egy nyelvi tábla sem tartalmaz a magyarban NEM létező kulcsot (elgépelés-őr)', () => {
  for (const nyelv of NEM_MAGYAR) {
    const tobblet = Object.keys(TABLAK[nyelv]).filter((k) => !KULCSOK.includes(k))
    assert.deepEqual(
      tobblet,
      [],
      `a(z) "${nyelv}" táblában olyan kulcs van, amit senki nem hív: ${tobblet.join(', ')} ` +
        '(elgépelt kulcsnév — a hívó a magyar szöveget kapná)',
    )
  }
})

test('az azonos kulcsok azonos alakúak és azonos aritásúak minden nyelven', () => {
  for (const nyelv of NEM_MAGYAR) {
    for (const kulcs of KULCSOK) {
      const hu = TABLAK.magyar[kulcs]
      const mas = TABLAK[nyelv][kulcs]
      assert.equal(
        typeof mas,
        typeof hu,
        `${nyelv}.${kulcs} típusa ${typeof mas}, a magyaré ${typeof hu} — a hívó az egyiket ` +
          'meghívná, a másikat kiírná',
      )
      if (typeof hu === 'function') {
        assert.equal(
          mas.length,
          hu.length,
          `${nyelv}.${kulcs} ${mas.length} paramétert vár, a magyar ${hu.length}-t — ` +
            'a hívó egyik nyelven üres helyet hagyna a szövegben',
        )
      }
      if (Array.isArray(hu)) {
        assert.ok(Array.isArray(mas), `${nyelv}.${kulcs} nem tömb, pedig a magyar az`)
      }
      // Beágyazott objektum (pl. agentSzerepek): a kulcskészletnek is egyeznie
      // kell — egy hiányzó agent-szerep némán glossza nélküli nevet írna ki.
      if (hu && typeof hu === 'object' && !Array.isArray(hu)) {
        assert.deepEqual(
          Object.keys(mas).sort(),
          Object.keys(hu).sort(),
          `${nyelv}.${kulcs} beágyazott kulcsai eltérnek a magyartól`,
        )
      }
    }
  }
})

// Fordítás-elmaradás őre: egy angol táblába bemásolt, de le nem fordított magyar
// mondat magyar ékezetet visz be. Az agent-nevek (izsak, zsofi, reka) ÉKEZET
// NÉLKÜL szerepelnek — gépi kulcsok, nem próza —, így nem adnak hamis riasztást.
const MAGYAR_EKEZET = /[áéíóöőúüű]/i

test('az angol tábla nem tartalmaz magyar ékezetes karaktert (le nem fordított sor őre)', () => {
  const gyanus = []
  for (const kulcs of KULCSOK) {
    const ertek = TABLAK.english[kulcs]
    const minta =
      typeof ertek === 'function'
        ? ertek('X', 'Y', 'Z')
        : Array.isArray(ertek)
          ? ertek.join(' ')
          : ertek && typeof ertek === 'object'
            ? Object.values(ertek).join(' ')
            : ertek
    if (MAGYAR_EKEZET.test(String(minta))) gyanus.push(kulcs)
  }
  assert.deepEqual(gyanus, [], `magyar ékezet az angol táblában: ${gyanus.join(', ')}`)
})

test('uzenetek() ismeretlen nyelvre magyarra esik vissza, nem dob és nem ad undefined-ot', () => {
  for (const nyelv of [undefined, null, '', 'klingon', 42]) {
    const u = uzenetek(nyelv)
    for (const kulcs of KULCSOK) {
      assert.notEqual(u[kulcs], undefined, `${String(nyelv)} → ${kulcs} undefined`)
    }
    assert.equal(u.kommentTeljes, TABLAK.magyar.kommentTeljes)
  }
})

test('uzenetek("english") tényleg az angol értéket adja', () => {
  const u = uzenetek('english')
  assert.equal(u.forrasPrTorzs, 'PR body')
  assert.match(u.kapuCim('Demo'), /^Workflow gate/)
  assert.match(u.kapuCim('Demo'), /\(Demo\)/)
})

// A szerep-glossza a lánc-kimenet olvashatóságának EGYETLEN eszköze egy nem
// magyar olvasónál — az agent-nevek gépi kulcsok, nem fordulnak.
test('a lánc-kimenetben minden agent-név mellett ott a szerepe, mindkét nyelven', async () => {
  const { buildMunkarendBlock } = await import('../munkarend-kapu-logic.mjs')

  const angol = buildMunkarendBlock({ size: 'L', nyelv: 'english' })
  assert.match(angol, /reka \(review\)/)
  assert.match(angol, /zsofi \(docs\)/)
  assert.match(angol, /sara \(analysis\) → bence \(architecture\)/)

  const magyarBlokk = buildMunkarendBlock({ size: 'L', nyelv: 'magyar' })
  assert.match(magyarBlokk, /reka \(review\)/)
  assert.match(magyarBlokk, /zsofi \(doksi\)/)
})

test('ismeretlen agent-név glossza nélkül, üres zárójel nélkül jelenik meg', () => {
  const u = uzenetek('english')
  assert.equal(u.agentSzerepek.jocasta, undefined, 'nincs ilyen agent — a glossza-tábla nem találhat ki szerepet')
})
