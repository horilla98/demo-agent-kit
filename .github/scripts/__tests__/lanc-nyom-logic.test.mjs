import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  meretPrTorzsbol,
  kapcsoltTicketek,
  nyomokKommentekbol,
  ertekel,
  kommentSzoveg,
  MARKER,
} from '../lanc-nyom-logic.mjs'

test('meretPrTorzsbol — a template mezőjének alakjai', () => {
  assert.equal(meretPrTorzsbol('Méret: M'), 'M')
  assert.equal(meretPrTorzsbol('**Méret**: l'), 'L')
  assert.equal(meretPrTorzsbol('valami\nMéret: S\nmás'), 'S')
  assert.equal(meretPrTorzsbol('nincs benne'), null)
})

test('meretPrTorzsbol — az angol sablon „Size:” címkéje is felismert (regresszió: a magyar eset nem törhet)', () => {
  assert.equal(meretPrTorzsbol('Size: M'), 'M')
  assert.equal(meretPrTorzsbol('**Size**: l'), 'L')
  assert.equal(meretPrTorzsbol('Méret: S'), 'S')
})

test('meretPrTorzsbol — mindkét nyelvi címke jelen van egyszerre: az ELSŐ (sorrendben előbbi) sor nyer', () => {
  // Kevert nyelvű PR-törzs (pl. sablon-szerkesztés közben, vagy ha valaki
  // véletlenül mindkét blokkot bennhagyja) — a viselkedés definiált (az első
  // találat), de eddig nem volt tesztelve; egy jövőbeli prioritás-csere
  // (pl. "az angol mindig nyer") itt csendben megbukna.
  assert.equal(meretPrTorzsbol('Méret: M\nSize: L'), 'M', 'a magyar sor előbb áll, az nyer')
  assert.equal(meretPrTorzsbol('Size: L\nMéret: M'), 'L', 'megfordítva az angol sor előbb áll, az nyer')
})

test('meretPrTorzsbol — a címke-alak hibás (résszó-egyezés) NEM ad hamis találatot', () => {
  // "Méretezés"/"MaxSize" a "Méret"/"Size" karaktersorozatot tartalmazza,
  // de nem a mezőcímke — a mintának ezt el kell utasítania, nem "M"/"S"-t
  // kitalálnia belőle.
  assert.equal(meretPrTorzsbol('Méretezés: M'), null)
  assert.equal(meretPrTorzsbol('MaxSize: L'), null)
})

test('kapcsoltTicketek — Closes/Fixes/Resolves, duplikátum nélkül', () => {
  assert.deepEqual(kapcsoltTicketek('Closes #12\nFixes #12\nresolves #7'), [12, 7])
  assert.deepEqual(kapcsoltTicketek('kapcsolódik: #99'), [])
})

test('nyomokKommentekbol — az [agent:x] markerek kisbetűsítve', () => {
  const nyomok = nyomokKommentekbol([{ body: '[agent:Reka] verdikt: PASS' }, { body: 'sima komment' }])
  assert.deepEqual([...nyomok], ['reka'])
})

test('nyomokKommentekbol — regresszió: próza-idézetben szereplő marker nem számít valódi kapu-nyomnak (🔴 mért eset)', () => {
  // Valós eset a kit forrás-projektjében (agent-kit v1.0, nem a jelen,
  // cél-projektben): egy PR-kommentben valaki leírta, hogy NEM ad ki
  // verdiktet — a mondat szó szerint idézte a `[agent:reka]` alakot, mégsem
  // volt kapu-verdikt. A javítás előtt a minta sor-eleji kötés és szerző-
  // ellenőrzés nélkül futott, ezért erre is illeszkedett: TÉNYLEGESEN
  // MEGTÖRTÉNT false-positive lánc-nyomot okozott (a hiányzó verdikt eltűnt
  // a "hianyzoPr" listából, holott ténylegesen soha nem született meg) — nem
  // elméleti kockázat, hanem a forrás-projekt saját bot-kimenetén
  // megfigyelt hiba. A javított minta sor-eleji kötésre (`^...gim`)
  // szigorítja a keresést — ez a teszt ezt védi: visszaforgatva a fixet, a
  // próza-idézet ismét hamis nyomot adna.
  const prozaKomment = {
    body:
      'Az INV-1 (aki ír, nem kapuz) jelenleg nem teljesül, és önmagamra ' +
      'verdiktet nem adok — se `[agent:reka]`, se más néven. A dispatcher nem kapu.',
  }
  const nyomok = nyomokKommentekbol([prozaKomment])
  assert.deepEqual(
    [...nyomok],
    [],
    'egy prózai mondatban idézett marker nem valódi kapu-nyom',
  )
})

test('nyomokKommentekbol — a sor-eleji kötés mellett a valódi, sor eleji verdikt-marker továbbra is felismerhető', () => {
  // A fenti szigorítás nem zárhatja ki a valós esetet: egy komment több
  // sorában, sor elején álló marker (a bevett `[agent:x] Verdikt: …` alak)
  // változatlanul kapu-nyomnak számít.
  const nyomok = nyomokKommentekbol([{ body: '[agent:tibor] Verdikt: PASS\n[agent:zsofi] szintén rendben' }])
  assert.deepEqual([...nyomok].sort(), ['tibor', 'zsofi'])
})

test('ertekel — teljes L-lánc', () => {
  const e = ertekel({
    meret: 'L',
    prKommentek: ['tibor', 'reka', 'zsofi', 'columbo'].map((a) => ({ body: `[agent:${a}] ok` })),
    ticketKommentek: ['sara', 'bence'].map((a) => ({ body: `[agent:${a}] ok` })),
  })
  assert.equal(e.teljes, true)
  assert.deepEqual(e.hianyzoPr, [])
  assert.deepEqual(e.hianyzoTicket, [])
})

test('ertekel — hiányzó nyom S méretnél', () => {
  const e = ertekel({ meret: 'S', prKommentek: [], ticketKommentek: null })
  assert.equal(e.teljes, false)
  assert.deepEqual(e.hianyzoPr, ['reka'])
})

test('ertekel — ismeretlen méret a legszigorúbb láncot kéri', () => {
  const e = ertekel({ meret: null, prKommentek: [], ticketKommentek: null })
  assert.equal(e.meret, 'L')
  assert.match(e.meretForras, /ismeretlen/)
})

test('ertekel — SP-ből számolt méret, ha a PR-törzsben nincs', () => {
  const e = ertekel({ meret: null, sp: 3, prKommentek: [], ticketKommentek: null })
  assert.equal(e.meret, 'M')
  assert.equal(e.meretForras, 'ticket SP')
})

test('ertekel — kapcsolt ticket nélkül a ticket-nyomokat is a PR-en keressük', () => {
  const prKommentek = ['sara', 'bence', 'tibor', 'reka', 'zsofi', 'columbo'].map((a) => ({ body: `[agent:${a}]` }))
  const e = ertekel({ meret: 'L', prKommentek, ticketKommentek: null })
  assert.equal(e.ticketVanKapcsolat, false)
  assert.equal(e.teljes, true, 'a PR-en meglévő nyom kapcsolat hiányában is számít')
})

test('kommentSzoveg — a marker az első sorban van (frissítés, nem halmozás)', () => {
  const szoveg = kommentSzoveg(ertekel({ meret: 'S', prKommentek: [], ticketKommentek: null }))
  assert.ok(szoveg.startsWith(MARKER))
})

test('kommentSzoveg — a jelző kimondja, hogy nem blokkoló', () => {
  const hianyos = kommentSzoveg(ertekel({ meret: 'S', prKommentek: [], ticketKommentek: null }))
  assert.match(hianyos, /nem blokkoló/)
  assert.match(hianyos, /\[agent:reka\]/)

  const teljes = kommentSzoveg(ertekel({ meret: 'S', prKommentek: [{ body: '[agent:reka]' }], ticketKommentek: null }))
  assert.match(teljes, /✅/)
})
