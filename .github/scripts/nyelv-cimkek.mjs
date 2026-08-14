// Nyelvi címkék — a gépileg (regexszel) olvasott prózai mezőnevek EGY forrása.
//
// A `**Méret:**` mező az EGYETLEN prózai címke, amit gépi regex is olvas
// (lanc-nyom-logic.mjs, munkarend-kapu-logic.mjs) — mert a PR-/ticket-sablon,
// amiben megjelenik, mostantól nyelvenként fordított prózafájl. Ha egy új
// nyelv kerül a NYELVEK listába (telepites-logic.mjs), és a sablonja más szót
// használ a mezőre, EZT a listát kell bővíteni — nem a regexeket egyenként.
export const MERET_CIMKE = { magyar: 'Méret', english: 'Size' }

export function meretCimkeMinta() {
  return Object.values(MERET_CIMKE).join('|')
}
