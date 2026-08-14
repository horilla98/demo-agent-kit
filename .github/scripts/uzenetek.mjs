// Futásidejű üzenetek — EGY-IGAZSÁGFORRÁS minden emberi szemnek szánt
// script-kimenethez (session-indító STEP 0 blokk, PR bot-komment, importer).
//
// MIÉRT ITT: a próza-fájlokat (charták, parancsok, doksik) a telepítő nyelv
// szerint választja ki a `sablon/nyelv/<x>/` fából — a scriptek viszont a
// `kozos/` fából jönnek, egyetlen példányban. Ezért a script-kimenet nyelve
// nem fájl-választás, hanem futásidejű kulcs-feloldás kérdése.
//
// A nyelv forrása MINDIG az `agent-kit.config.json` `nyelv` mezője
// (`projekt-config.mjs`) — sosem env-változó, sosem locale-detektálás.
//
// VASSZABÁLY: minden érték függvény VAGY string, és a `magyar` tábla a
// teljes kulcskészlet. Az `uzenetek()` a magyar táblára terít rá, így egy
// hiányzó fordítás magyarul jelenik meg — de SOSEM `undefined`-ként törik el
// egy hook vagy egy workflow. A kulcs-paritást a `uzenetek.test.mjs` őrzi:
// hiányzó angol kulcs bukó teszt, nem néma visszaesés.
//
// GÉPILEG OLVASOTT CÍMKE IDE NEM KERÜL — az a `nyelv-cimkek.mjs` dolga
// (`**Méret:**`/`**Size:**`). Ami itt van, az kozmetika; ami ott, az funkció.

const magyar = {
  // Az agent-nevek GÉPI KULCSOK (`[agent:<név>]` regex) — sosem fordulnak.
  // Ez a tábla csak a MELLÉJÜK írt szerep-glossza: enélkül a kimenet egy nem
  // magyar olvasónak („tibor → reka → zsofi → columbo") megfejthetetlen
  // névsor, ami pont a kit legfontosabb üzenetét — hogy ez egy lánc, nem egy
  // szereplőlista — teszi láthatatlanná.
  agentSzerepek: {
    sara: 'elemzés',
    bence: 'architektúra',
    marci: 'integráció',
    izsak: 'kód',
    tibor: 'teszt',
    reka: 'review',
    gergo: 'biztonság',
    zsofi: 'doksi',
    petra: 'delivery',
    devops: 'CI/CD',
    columbo: 'orkesztráció-audit',
  },

  // — munkarend-kapu (session-indítási STEP 0 blokk) —
  kapuCim: (projekt) => `Munkarend-kapu — session-indítási protokoll${projekt ? ` (${projekt})` : ''}`,
  step0:
    'STEP 0 (kötelező, MIELŐTT bármihez nyúlnál): azonosítsd a ticketet és számold ki a ' +
    'méretét. SP → méret: 1-2 = S, 3-5 = M, 8+ = L; ismeretlen/hiányzó SP → felfelé ' +
    'kerekítve L. Mondd ki a méretet, mielőtt implementálsz.',
  ticketAzonositva: (id) => `Ticket a branch alapján: #${id}.`,
  ticketNemAzonosithato:
    'A branch alapján nem azonosítható ticket-szám — a méret-számítást akkor is végezd el.',
  meretExplicit: (meret) => `Méret: ${meret} — a ticket **Méret:** mezőjéből.`,
  meretSpBol: (meret, sp) => `Méret: ${meret} — SP ${sp} alapján.`,
  meretTisztazando:
    'A méret TISZTÁZANDÓ (nincs elérhető/érvényes SP) — felfelé kerekítve L-ként kezelendő.',
  lancNincsNyom: '(nincs kötelező név-szerinti nyom ezen a szinten)',
  lancSor: (meret, prNyom, ticketNyom) =>
    `${meret} méret kötelező lánca — PR-nyom: ${prNyom}` +
    (ticketNyom ? ` · ticket-nyom: ${ticketNyom}` : '') +
    '.',
  kemenySzabaly:
    'Kemény szabály: a dispatcher M/L méretnél NEM implementál — a rétegbesorolást és a ' +
    'kódot izsákhoz irányítja, a dispatcher csak a láncot koordinálja.',
  tesztKotelezo: (teszt) => `Minden változtatás után kötelező: \`${teszt}\` — csak zöld állapotot commitolj.`,
  branchMergelve: 'mergelve',
  branchLezarva: 'lezárva',
  branchUjrafelhasznalas: (branch, lista) =>
    `⚠️ FIGYELEM: a(z) \`${branch}\` branch korábban már PR-t szolgált ki: ${lista}. ` +
    'Új ticketre ÚJ branch nyitandó friss origin/main-ből — ne folytasd ezen.',

  // — lánc-nyom-jelző (PR bot-komment) —
  forrasPrTorzs: 'PR-törzs',
  forrasTicketSp: 'ticket SP',
  forrasIsmeretlen: 'ismeretlen (L-ként kezelve)',
  kommentFejlec: (meret, forras) => `**Lánc-nyom — ${meret} méret** (forrás: ${forras})`,
  kommentTeljes: '✅ A méret szerint elvárt összes agent-nyom megvan ezen a PR-en.',
  kommentHianyos: '🟡 Hiányzó lánc-nyom — ez **jelzés, nem blokkoló kapu**:',
  kommentHianyzoPr: (lista) => `- **PR-nyom hiányzik:** ${lista}`,
  kommentHianyzoTicket: (hol, lista) => `- **Ticket-nyom hiányzik** (${hol}): ${lista}`,
  kommentHolTicketen: 'a kapcsolt ticketen',
  kommentHolPren: 'a PR-en (nincs feloldható `Closes #N`)',
  kommentLablec: (elvartPr, elvartTicket) =>
    `_Elvárt: PR-en ${elvartPr || '—'}` +
    (elvartTicket ? ` · ticketen ${elvartTicket}` : '') +
    '. Forrás: `.github/scripts/lanc-tabla.mjs`._',

  // — lánc-nyom-jelző (héj, konzol) —
  jelzoNincsPr: 'Nincs PR-szám az eseményben — kihagyva.',
  jelzoValtozatlan: 'A jelző-komment változatlan — nem írunk.',
  jelzoFrissitve: 'Jelző-komment frissítve.',
  jelzoLetrehozva: 'Jelző-komment létrehozva.',
  jelzoOsszegzes: (meret, teljes) => `Méret: ${meret} · teljes lánc-nyom: ${teljes ? 'igen' : 'nem'}`,
  jelzoHiba: (uzenet) => `Lánc-nyom-jelző hiba (nem blokkoló): ${uzenet}`,

  // — gh-api (közös) —
  ghNincsAuth: 'Hiányzó GITHUB_TOKEN vagy GITHUB_REPOSITORY környezeti változó',

  // — backlog-import (parse-hibák) —
  hibaToredezett: (sor, id, oszlopok) =>
    `${sor}. sor: a(z) ${id} sztori-sor töredezett (${oszlopok} oszlop a szükséges 4 helyett)`,
  hibaEpicNelkul: (sor, id) => `${sor}. sor: a(z) ${id} sztori epic-fejléc nélkül áll`,
  hibaNincsCim: (sor, id) => `${sor}. sor: a(z) ${id} sztorinak nincs címe`,
  hibaDuplikaltId: (id) => `Duplikált sztori-ID a backlogban: ${id}`,

  // — backlog-import (a generált issue törzse) —
  issueSztoriCim: '## Sztori',
  issueAcCim: '## Elfogadási kritériumok',
  issueAcHianyzik: '_(hiányzik — sara pótolja)_',
  issueLablec: [
    '_Automatikusan importálva a `docs/backlog-poker.md`-ből. A forrás a backlog-fájl —',
    'ha itt módosítasz, vezesd át oda is (különben a következő import szétcsúszik)._',
  ],

  // — backlog-import (héj, konzol) —
  importNincsFajl: (ut) => `Nincs backlog-fájl: ${ut}`,
  importFormatumHibak: 'Formátum-hibák a backlogban:',
  importUres: (ut) => `A ${ut} nem tartalmaz sztori-táblát — nincs mit importálni.`,
  importOsszegzes: (sztorik, letezo) => `Backlog: ${sztorik} sztori · létező issue: ${letezo}`,
  importTerv: (letrehozando, elarvult) =>
    `Létrehozandó: ${letrehozando} · elárvult nyitott: ${elarvult}`,
  importSzarazLetrehozna: (id, cim) => `  létrehozna: [${id}] ${cim}`,
  importSzarazElarvult: (szam, cim) => `  elárvult:   #${szam} ${cim}`,
  importLetrehozva: (szam, cim) => `  létrehozva: #${szam} ${cim}`,
  importCimkeHiba: (cim, uzenet) => `  HIBA (${cim}): ${uzenet} — újrapróbálás címkék nélkül`,
  importCimkeNelkul: (szam) => `  létrehozva (címke nélkül): #${szam} — a címkéket pótold`,
  importElarvultFejlec:
    '\nElárvult nyitott sztorik (az ID-jük már nincs a backlogban) — NEM zártuk le őket:',
  importElarvultDontes: 'Döntés petra/ember hatásköre: zárás, átnevezés vagy a backlog pótlása.',
}

const english = {
  // Agent names are MACHINE KEYS (`[agent:<name>]` regex) — never translated.
  // This table is only the role gloss printed next to them; without it the
  // output reads as an opaque list of Hungarian first names to an English
  // reader, hiding the one thing that matters: this is a chain, not a cast.
  agentSzerepek: {
    sara: 'analysis',
    bence: 'architecture',
    marci: 'integration',
    izsak: 'code',
    tibor: 'test',
    reka: 'review',
    gergo: 'security',
    zsofi: 'docs',
    petra: 'delivery',
    devops: 'CI/CD',
    columbo: 'orchestration audit',
  },

  // — workflow gate (session-start STEP 0 block) —
  kapuCim: (projekt) => `Workflow gate — session-start protocol${projekt ? ` (${projekt})` : ''}`,
  step0:
    'STEP 0 (mandatory, BEFORE you touch anything): identify the ticket and compute its ' +
    'size. SP → size: 1-2 = S, 3-5 = M, 8+ = L; unknown/missing SP → rounded up to L. ' +
    'State the size out loud before you implement.',
  ticketAzonositva: (id) => `Ticket from the branch name: #${id}.`,
  ticketNemAzonosithato:
    'No ticket number can be derived from the branch name — compute the size anyway.',
  meretExplicit: (meret) => `Size: ${meret} — from the ticket's **Size:** field.`,
  meretSpBol: (meret, sp) => `Size: ${meret} — derived from SP ${sp}.`,
  meretTisztazando:
    'Size MUST BE CLARIFIED (no usable SP available) — treat it as L, rounded up.',
  lancNincsNyom: '(no mandatory named trace at this level)',
  lancSor: (meret, prNyom, ticketNyom) =>
    `Mandatory chain for size ${meret} — PR trace: ${prNyom}` +
    (ticketNyom ? ` · ticket trace: ${ticketNyom}` : '') +
    '.',
  kemenySzabaly:
    'Hard rule: at size M/L the dispatcher does NOT implement — it routes the layer ' +
    'assignment and the code to izsak, and only coordinates the chain.',
  tesztKotelezo: (teszt) => `Mandatory after every change: \`${teszt}\` — only commit green.`,
  branchMergelve: 'merged',
  branchLezarva: 'closed',
  branchUjrafelhasznalas: (branch, lista) =>
    `⚠️ WARNING: branch \`${branch}\` has already served a PR: ${lista}. ` +
    'A new ticket needs a NEW branch off fresh origin/main — do not continue on this one.',

  // — chain-trace signal (PR bot comment) —
  forrasPrTorzs: 'PR body',
  forrasTicketSp: 'ticket SP',
  forrasIsmeretlen: 'unknown (treated as L)',
  kommentFejlec: (meret, forras) => `**Chain trace — size ${meret}** (source: ${forras})`,
  kommentTeljes: '✅ Every agent trace required at this size is present on this PR.',
  kommentHianyos: '🟡 Missing chain trace — this is a **signal, not a blocking gate**:',
  kommentHianyzoPr: (lista) => `- **Missing PR trace:** ${lista}`,
  kommentHianyzoTicket: (hol, lista) => `- **Missing ticket trace** (${hol}): ${lista}`,
  kommentHolTicketen: 'on the linked ticket',
  kommentHolPren: 'on the PR (no resolvable `Closes #N`)',
  kommentLablec: (elvartPr, elvartTicket) =>
    `_Expected: on the PR ${elvartPr || '—'}` +
    (elvartTicket ? ` · on the ticket ${elvartTicket}` : '') +
    '. Source: `.github/scripts/lanc-tabla.mjs`._',

  // — chain-trace signal (shell, console) —
  jelzoNincsPr: 'No PR number in the event — skipped.',
  jelzoValtozatlan: 'Signal comment unchanged — nothing written.',
  jelzoFrissitve: 'Signal comment updated.',
  jelzoLetrehozva: 'Signal comment created.',
  jelzoOsszegzes: (meret, teljes) => `Size: ${meret} · chain trace complete: ${teljes ? 'yes' : 'no'}`,
  jelzoHiba: (uzenet) => `Chain-trace signal error (non-blocking): ${uzenet}`,

  // — gh-api (shared) —
  ghNincsAuth: 'Missing GITHUB_TOKEN or GITHUB_REPOSITORY environment variable',

  // — backlog import (parse errors) —
  hibaToredezett: (sor, id, oszlopok) =>
    `line ${sor}: story row ${id} is malformed (${oszlopok} columns instead of the required 4)`,
  hibaEpicNelkul: (sor, id) => `line ${sor}: story ${id} appears without an epic heading`,
  hibaNincsCim: (sor, id) => `line ${sor}: story ${id} has no title`,
  hibaDuplikaltId: (id) => `Duplicate story ID in the backlog: ${id}`,

  // — backlog import (generated issue body) —
  issueSztoriCim: '## Story',
  issueAcCim: '## Acceptance criteria',
  issueAcHianyzik: '_(missing — sara to supply)_',
  issueLablec: [
    '_Imported automatically from `docs/backlog-poker.md`. The backlog file is the source —',
    'if you edit here, carry it back there too (otherwise the next import drifts)._',
  ],

  // — backlog import (shell, console) —
  importNincsFajl: (ut) => `No backlog file: ${ut}`,
  importFormatumHibak: 'Format errors in the backlog:',
  importUres: (ut) => `${ut} contains no story table — nothing to import.`,
  importOsszegzes: (sztorik, letezo) => `Backlog: ${sztorik} stories · existing issues: ${letezo}`,
  importTerv: (letrehozando, elarvult) => `To create: ${letrehozando} · orphaned open: ${elarvult}`,
  importSzarazLetrehozna: (id, cim) => `  would create: [${id}] ${cim}`,
  importSzarazElarvult: (szam, cim) => `  orphaned:     #${szam} ${cim}`,
  importLetrehozva: (szam, cim) => `  created: #${szam} ${cim}`,
  importCimkeHiba: (cim, uzenet) => `  ERROR (${cim}): ${uzenet} — retrying without labels`,
  importCimkeNelkul: (szam) => `  created (without labels): #${szam} — add the labels manually`,
  importElarvultFejlec:
    '\nOrphaned open stories (their ID is no longer in the backlog) — we did NOT close them:',
  importElarvultDontes: 'The call belongs to petra/a human: close, rename, or restore the backlog entry.',
}

export const TABLAK = { magyar, english }

// A teljes kulcskészlet — a paritás-teszt és a fallback egyaránt ebből dolgozik.
export const KULCSOK = Object.keys(magyar)

// Az adott nyelv üzenet-táblája, a magyarra terítve (hiányzó fordítás → magyar,
// sosem `undefined`). Ismeretlen nyelv → magyar, némán: egy elgépelt konfig-érték
// nem akaszthat meg egy session-indító hookot.
export function uzenetek(nyelv) {
  return { ...magyar, ...(TABLAK[nyelv] ?? {}) }
}
