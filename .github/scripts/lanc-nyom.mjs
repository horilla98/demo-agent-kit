// Lánc-nyom-jelző — vékony IO-héj a `lanc-nyom-logic.mjs` fölött.
//
// A PR-jelzők workflow indítja. Összeveti a méret szerint elvárt agent-nyomokat
// a tényleg meglévőkkel, és egyetlen, FRISSÍTETT bot-kommentet hagy a PR-en
// (nem halmoz újakat). Jelző, nem blokkoló: sosem ad hibás kilépési kódot azért,
// mert hiányzik egy nyom.

import { gh, ghAll, OWNER, REPO, esemenyPrSzam, ensureAuth } from './gh-api.mjs'
import { ertekel, kommentSzoveg, meretPrTorzsbol, kapcsoltTicketek, MARKER } from './lanc-nyom-logic.mjs'
import { spFromIssueBody, sizeFromIssueBody } from './munkarend-kapu-logic.mjs'
import { projektConfig } from './projekt-config.mjs'
import { uzenetek } from './uzenetek.mjs'

async function main() {
  const nyelv = projektConfig().nyelv
  const u = uzenetek(nyelv)
  ensureAuth()
  const prSzam = await esemenyPrSzam()
  if (prSzam == null) {
    console.log(u.jelzoNincsPr)
    return
  }

  const pr = await gh('GET', `/repos/${OWNER}/${REPO}/pulls/${prSzam}`)
  const kommentek = await ghAll(`/repos/${OWNER}/${REPO}/issues/${prSzam}/comments`)
  const reviewk = await ghAll(`/repos/${OWNER}/${REPO}/pulls/${prSzam}/reviews`)
  const prKommentek = [...kommentek, ...reviewk]

  // Méret: elsődlegesen a PR-törzs kötelező mezőjéből; ha nincs, a kapcsolt
  // ticket **Méret:**/**SP:** mezőjéből; ha az sincs, L (legszigorúbb).
  let meret = meretPrTorzsbol(pr.body)
  let sp = null
  const ticketSzamok = kapcsoltTicketek(pr.body)
  let ticketKommentek = null

  if (ticketSzamok.length > 0) {
    ticketKommentek = []
    for (const szam of ticketSzamok) {
      try {
        const issue = await gh('GET', `/repos/${OWNER}/${REPO}/issues/${szam}`)
        meret ??= sizeFromIssueBody(issue?.body)
        sp ??= spFromIssueBody(issue?.body)
        ticketKommentek.push(...(await ghAll(`/repos/${OWNER}/${REPO}/issues/${szam}/comments`)))
      } catch {
        // Feloldhatatlan hivatkozás: a logika ezt úgy kezeli, mintha nem lenne
        // kapcsolat — a ticket-nyomokat a PR-en keresi.
      }
    }
    if (ticketKommentek.length === 0) ticketKommentek = null
  }

  const eredmeny = ertekel({ meret, sp, prKommentek, ticketKommentek, nyelv })
  const szoveg = kommentSzoveg(eredmeny, nyelv)

  const korabbi = kommentek.find((k) => String(k.body ?? '').startsWith(MARKER))
  if (korabbi) {
    if (String(korabbi.body).trim() === szoveg.trim()) {
      console.log(u.jelzoValtozatlan)
    } else {
      await gh('PATCH', `/repos/${OWNER}/${REPO}/issues/comments/${korabbi.id}`, { body: szoveg })
      console.log(u.jelzoFrissitve)
    }
  } else {
    await gh('POST', `/repos/${OWNER}/${REPO}/issues/${prSzam}/comments`, { body: szoveg })
    console.log(u.jelzoLetrehozva)
  }

  console.log(u.jelzoOsszegzes(eredmeny.meret, eredmeny.teljes))
}

main().catch((err) => {
  // Jelző, nem kapu: a hibát kiírjuk, de nem bukik el tőle a workflow.
  console.error(uzenetek(projektConfig().nyelv).jelzoHiba(err.message))
})
