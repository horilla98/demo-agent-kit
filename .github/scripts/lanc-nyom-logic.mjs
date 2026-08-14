// Lánc-nyom-jelző — tiszta, IO-mentes logika.
//
// Egy PR-en a méret szerint ELVÁRT agent-nyomokat (`[agent:<név>]` kommentek)
// veti össze a ténylegesen meglévőkkel, és megírja a bot-komment szövegét.
//
// FILOZÓFIA: ez **jelző, nem blokkoló kapu**. Láthatóvá teszi a hiányt, de nem
// akadályozza meg a merge-t — az emberi jóváhagyás az, ami dönt. Egy néma hiány
// viszont sosem fordulhat elő: ami hiányzik, az kikerül a PR-re.

import { chainForSize, spToSize } from './lanc-tabla.mjs'
import { meretCimkeMinta } from './nyelv-cimkek.mjs'
import { uzenetek } from './uzenetek.mjs'

export const MARKER = '<!-- lanc-nyom-jelzo -->'

// A PR-törzs kötelező „Méret: S/M/L" (ill. angolul „Size: S/M/L") mezője
// (a PR-template írja elő) — a címke nyelvenkénti alakja a `nyelv-cimkek.mjs`
// egy-igazságforrásból jön, nem hardkódolt szó.
export function meretPrTorzsbol(body) {
  const m = String(body ?? '').match(new RegExp(`^\\s*(?:\\*\\*)?(?:${meretCimkeMinta()})(?:\\*\\*)?:\\s*\\**\\s*(S|M|L)\\b`, 'im'))
  return m ? m[1].toUpperCase() : null
}

// `Closes/Fixes/Resolves #N` — a kapcsolt ticketek számai.
export function kapcsoltTicketek(body) {
  const szamok = new Set()
  const re = /\b(?:closes|fixes|resolves)\s+#(\d+)/gi
  for (const m of String(body ?? '').matchAll(re)) szamok.add(Number(m[1]))
  return [...szamok]
}

// Egy komment-listából a talált `[agent:<név>]` nyomok halmaza.
//
// A marker sor elején kell álljon (a `pr-gates` forrás-repóbeli konvenciójával
// egyezően) — enélkül egy prózai mondatban IDÉZETT `[agent:reka]` is valódi
// kapu-nyomnak számítana, ami élesben hamis "teljesített" állapotot okozott:
// a kit forrás-projektjében mért/megfigyelt eset (nem a cél-projektben) — egy
// hiányzó review eltűnt a `hianyzoPr` listából, mert a szöveg csak *említette*
// a markert, nem adta ki verdiktként.
export function nyomokKommentekbol(kommentek) {
  const talalt = new Set()
  for (const k of kommentek ?? []) {
    for (const m of String(k?.body ?? '').matchAll(/^\[agent:([a-zíáéúőóüöű]+)\]/gim)) {
      talalt.add(m[1].toLowerCase())
    }
  }
  return talalt
}

// A kiértékelés. Bemenet:
//   meret        — 'S'|'M'|'L'|null (null → a legszigorúbb L, ugyanaz az elv, mint az spToSize-ban)
//   sp           — opcionális, ha a méret nincs a PR-törzsben, de a tickethez van SP
//   prKommentek  — [{body}] a PR-ről (kommentek + review-k)
//   ticketKommentek — [{body}] a kapcsolt ticket(ek)ről; ha nincs feloldható
//                     kapcsolat, adj `null`-t: ilyenkor a ticket-nyomokat is a
//                     PR-en keressük, hogy a hiány ne tűnjön el.
export function ertekel({ meret, sp, prKommentek, ticketKommentek, nyelv }) {
  const u = uzenetek(nyelv)
  const hatekonyMeret = meret ?? (sp != null ? spToSize(sp) : 'L')
  const lanc = chainForSize(hatekonyMeret)
  const prNyomok = nyomokKommentekbol(prKommentek)
  const ticketVanKapcsolat = Array.isArray(ticketKommentek)
  const ticketNyomok = ticketVanKapcsolat ? nyomokKommentekbol(ticketKommentek) : prNyomok

  const hianyzoPr = lanc.prTraces.filter((a) => !prNyomok.has(a))
  const hianyzoTicket = lanc.issueTraces.filter((a) => !ticketNyomok.has(a))

  return {
    meret: hatekonyMeret,
    nyelv,
    meretForras: meret ? u.forrasPrTorzs : sp != null ? u.forrasTicketSp : u.forrasIsmeretlen,
    ticketVanKapcsolat,
    elvartPr: lanc.prTraces,
    elvartTicket: lanc.issueTraces,
    hianyzoPr,
    hianyzoTicket,
    teljes: hianyzoPr.length === 0 && hianyzoTicket.length === 0,
  }
}

// A bot-komment szövege. A marker az első sorban van, hogy a héj a korábbi
// kommentet megtalálja és FRISSÍTSE, ne új kommentet halmozzon.
export function kommentSzoveg(eredmeny, nyelv = eredmeny?.nyelv) {
  const u = uzenetek(nyelv)
  const jel = (a) => `\`[agent:${a}]\``
  const sorok = [MARKER, '', u.kommentFejlec(eredmeny.meret, eredmeny.meretForras), '']

  if (eredmeny.teljes) {
    sorok.push(u.kommentTeljes)
  } else {
    sorok.push(u.kommentHianyos)
    sorok.push('')
    if (eredmeny.hianyzoPr.length > 0) {
      sorok.push(u.kommentHianyzoPr(eredmeny.hianyzoPr.map(jel).join(', ')))
    }
    if (eredmeny.hianyzoTicket.length > 0) {
      const hol = eredmeny.ticketVanKapcsolat ? u.kommentHolTicketen : u.kommentHolPren
      sorok.push(u.kommentHianyzoTicket(hol, eredmeny.hianyzoTicket.map(jel).join(', ')))
    }
  }

  // A lábléc elvárás-listája is szerep-glosszával jön: a bot-komment gyakran
  // az ELSŐ dolog, amit egy új közreműködő lát a munkarendből.
  const szereppel = (a) => (u.agentSzerepek[a] ? `${a} (${u.agentSzerepek[a]})` : a)
  sorok.push(
    '',
    u.kommentLablec(
      eredmeny.elvartPr.map(szereppel).join(', '),
      eredmeny.elvartTicket.map(szereppel).join(', '),
    ),
  )
  return sorok.join('\n')
}
