// Runtime messages — ONE source of truth for every script output meant for
// human eyes (session-start STEP 0 block, PR bot comment, importer).
//
// WHY HERE: the prose files (charters, commands, docs) are picked by the
// installer's language choice from the `sablon/nyelv/<x>/` tree — but the
// scripts come from the `kozos/` tree, a single copy. So the script output's
// language isn't a file-choice question, it's a runtime key-resolution one.
//
// The language source is ALWAYS the `agent-kit.config.json` `nyelv` field
// (`project-config.mjs`) — never an env var, never locale detection.
//
// HARD RULE: every value is a function OR a string, and the `hungarian` table
// is the full key set. `messages()` layers onto the Hungarian table, so a
// missing translation shows up in Hungarian — but a hook or a workflow NEVER
// breaks on `undefined`. Key parity is guarded by `messages.test.mjs`: a
// missing English key is a failing test, not a silent fallback.
//
// MACHINE-READ LABELS DO NOT GO HERE — that's `language-labels.mjs`'s job
// (`**Méret:**`/`**Size:**`). What's here is cosmetic; what's there is
// functional.

const hungarian = {
  // Agent names are MACHINE KEYS (`[agent:<name>]` regex) — never translated.
  // This table is only the role gloss printed next to them; without it the
  // output reads as an opaque list of Hungarian first names to a non-Hungarian
  // reader ("tibor → reka → zsofi → columbo"), hiding the one thing that
  // matters: this is a chain, not a cast.
  agentRoles: {
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

  // — workflow gate (session-start STEP 0 block) —
  gateTitle: (project) => `Munkarend-kapu — session-indítási protokoll${project ? ` (${project})` : ''}`,
  step0:
    'STEP 0 (kötelező, MIELŐTT bármihez nyúlnál): azonosítsd a ticketet és számold ki a ' +
    'méretét. SP → méret: 1-2 = S, 3-5 = M, 8+ = L; ismeretlen/hiányzó SP → felfelé ' +
    'kerekítve L. Mondd ki a méretet, mielőtt implementálsz.',
  ticketIdentified: (id) => `Ticket a branch alapján: #${id}.`,
  ticketNotIdentifiable:
    'A branch alapján nem azonosítható ticket-szám — a méret-számítást akkor is végezd el.',
  sizeExplicit: (size) => `Méret: ${size} — a ticket **Méret:** mezőjéből.`,
  sizeFromSp: (size, sp) => `Méret: ${size} — SP ${sp} alapján.`,
  sizeToClarify:
    'A méret TISZTÁZANDÓ (nincs elérhető/érvényes SP) — felfelé kerekítve L-ként kezelendő.',
  chainNoTrace: '(nincs kötelező név-szerinti nyom ezen a szinten)',
  chainLine: (size, prTrace, ticketTrace) =>
    `${size} méret kötelező lánca — PR-nyom: ${prTrace}` +
    (ticketTrace ? ` · ticket-nyom: ${ticketTrace}` : '') +
    '.',
  hardRule:
    'Kemény szabály: a dispatcher M/L méretnél NEM implementál — a rétegbesorolást és a ' +
    'kódot izsákhoz irányítja, a dispatcher csak a láncot koordinálja.',
  testMandatory: (test) => `Minden változtatás után kötelező: \`${test}\` — csak zöld állapotot commitolj.`,
  branchMerged: 'mergelve',
  branchClosed: 'lezárva',
  branchReused: (branch, list) =>
    `⚠️ FIGYELEM: a(z) \`${branch}\` branch korábban már PR-t szolgált ki: ${list}. ` +
    'Új ticketre ÚJ branch nyitandó friss origin/main-ből — ne folytasd ezen.',

  // — chain-trace signal (PR bot comment) —
  sourcePrBody: 'PR-törzs',
  sourceTicketSp: 'ticket SP',
  sourceUnknown: 'ismeretlen (L-ként kezelve)',
  commentHeader: (size, source) => `**Lánc-nyom — ${size} méret** (forrás: ${source})`,
  commentComplete: '✅ A méret szerint elvárt összes agent-nyom megvan ezen a PR-en.',
  commentIncomplete: '🟡 Hiányzó lánc-nyom — ez **jelzés, nem blokkoló kapu**:',
  commentMissingPr: (list) => `- **PR-nyom hiányzik:** ${list}`,
  commentMissingTicket: (where, list) => `- **Ticket-nyom hiányzik** (${where}): ${list}`,
  commentWhereTicket: 'a kapcsolt ticketen',
  commentWherePr: 'a PR-en (nincs feloldható `Closes #N`)',
  commentFooter: (expectedPr, expectedTicket) =>
    `_Elvárt: PR-en ${expectedPr || '—'}` +
    (expectedTicket ? ` · ticketen ${expectedTicket}` : '') +
    '. Forrás: `.github/scripts/chain-table.mjs`._',

  // — chain-trace signal (shell, console) —
  signalNoPr: 'Nincs PR-szám az eseményben — kihagyva.',
  signalUnchanged: 'A jelző-komment változatlan — nem írunk.',
  signalUpdated: 'Jelző-komment frissítve.',
  signalCreated: 'Jelző-komment létrehozva.',
  signalSummary: (size, complete) => `Méret: ${size} · teljes lánc-nyom: ${complete ? 'igen' : 'nem'}`,
  signalError: (message) => `Lánc-nyom-jelző hiba (nem blokkoló): ${message}`,

  // — gh-api (shared) —
  ghNoAuth: 'Hiányzó GITHUB_TOKEN vagy GITHUB_REPOSITORY környezeti változó',

  // — backlog import (parse errors) —
  errorMalformed: (line, id, columns) =>
    `${line}. sor: a(z) ${id} sztori-sor töredezett (${columns} oszlop a szükséges 4 helyett)`,
  errorNoEpic: (line, id) => `${line}. sor: a(z) ${id} sztori epic-fejléc nélkül áll`,
  errorNoTitle: (line, id) => `${line}. sor: a(z) ${id} sztorinak nincs címe`,
  errorDuplicateId: (id) => `Duplikált sztori-ID a backlogban: ${id}`,

  // — backlog import (generated issue body) —
  issueStoryTitle: '## Sztori',
  issueAcTitle: '## Elfogadási kritériumok',
  issueAcMissing: '_(hiányzik — sara pótolja)_',
  issueFooter: [
    '_Automatikusan importálva a `docs/backlog-poker.md`-ből. A forrás a backlog-fájl —',
    'ha itt módosítasz, vezesd át oda is (különben a következő import szétcsúszik)._',
  ],

  // — backlog import (shell, console) —
  importNoFile: (path) => `Nincs backlog-fájl: ${path}`,
  importFormatErrors: 'Formátum-hibák a backlogban:',
  importEmpty: (path) => `A ${path} nem tartalmaz sztori-táblát — nincs mit importálni.`,
  importSummary: (stories, existing) => `Backlog: ${stories} sztori · létező issue: ${existing}`,
  importPlan: (toCreate, orphaned) =>
    `Létrehozandó: ${toCreate} · elárvult nyitott: ${orphaned}`,
  importDryRunCreate: (id, title) => `  létrehozna: [${id}] ${title}`,
  importDryRunOrphaned: (number, title) => `  elárvult:   #${number} ${title}`,
  importCreated: (number, title) => `  létrehozva: #${number} ${title}`,
  importLabelError: (title, message) => `  HIBA (${title}): ${message} — újrapróbálás címkék nélkül`,
  importLabelless: (number) => `  létrehozva (címke nélkül): #${number} — a címkéket pótold`,
  importOrphanedHeader:
    '\nElárvult nyitott sztorik (az ID-jük már nincs a backlogban) — NEM zártuk le őket:',
  importOrphanedDecision: 'Döntés petra/ember hatásköre: zárás, átnevezés vagy a backlog pótlása.',
}

const english = {
  // Agent names are MACHINE KEYS (`[agent:<name>]` regex) — never translated.
  // This table is only the role gloss printed next to them; without it the
  // output reads as an opaque list of Hungarian first names to an English
  // reader, hiding the one thing that matters: this is a chain, not a cast.
  agentRoles: {
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
  gateTitle: (project) => `Workflow gate — session-start protocol${project ? ` (${project})` : ''}`,
  step0:
    'STEP 0 (mandatory, BEFORE you touch anything): identify the ticket and compute its ' +
    'size. SP → size: 1-2 = S, 3-5 = M, 8+ = L; unknown/missing SP → rounded up to L. ' +
    'State the size out loud before you implement.',
  ticketIdentified: (id) => `Ticket from the branch name: #${id}.`,
  ticketNotIdentifiable:
    'No ticket number can be derived from the branch name — compute the size anyway.',
  sizeExplicit: (size) => `Size: ${size} — from the ticket's **Size:** field.`,
  sizeFromSp: (size, sp) => `Size: ${size} — derived from SP ${sp}.`,
  sizeToClarify:
    'Size MUST BE CLARIFIED (no usable SP available) — treat it as L, rounded up.',
  chainNoTrace: '(no mandatory named trace at this level)',
  chainLine: (size, prTrace, ticketTrace) =>
    `Mandatory chain for size ${size} — PR trace: ${prTrace}` +
    (ticketTrace ? ` · ticket trace: ${ticketTrace}` : '') +
    '.',
  hardRule:
    'Hard rule: at size M/L the dispatcher does NOT implement — it routes the layer ' +
    'assignment and the code to izsak, and only coordinates the chain.',
  testMandatory: (test) => `Mandatory after every change: \`${test}\` — only commit green.`,
  branchMerged: 'merged',
  branchClosed: 'closed',
  branchReused: (branch, list) =>
    `⚠️ WARNING: branch \`${branch}\` has already served a PR: ${list}. ` +
    'A new ticket needs a NEW branch off fresh origin/main — do not continue on this one.',

  // — chain-trace signal (PR bot comment) —
  sourcePrBody: 'PR body',
  sourceTicketSp: 'ticket SP',
  sourceUnknown: 'unknown (treated as L)',
  commentHeader: (size, source) => `**Chain trace — size ${size}** (source: ${source})`,
  commentComplete: '✅ Every agent trace required at this size is present on this PR.',
  commentIncomplete: '🟡 Missing chain trace — this is a **signal, not a blocking gate**:',
  commentMissingPr: (list) => `- **Missing PR trace:** ${list}`,
  commentMissingTicket: (where, list) => `- **Missing ticket trace** (${where}): ${list}`,
  commentWhereTicket: 'on the linked ticket',
  commentWherePr: 'on the PR (no resolvable `Closes #N`)',
  commentFooter: (expectedPr, expectedTicket) =>
    `_Expected: on the PR ${expectedPr || '—'}` +
    (expectedTicket ? ` · on the ticket ${expectedTicket}` : '') +
    '. Source: `.github/scripts/chain-table.mjs`._',

  // — chain-trace signal (shell, console) —
  signalNoPr: 'No PR number in the event — skipped.',
  signalUnchanged: 'Signal comment unchanged — nothing written.',
  signalUpdated: 'Signal comment updated.',
  signalCreated: 'Signal comment created.',
  signalSummary: (size, complete) => `Size: ${size} · chain trace complete: ${complete ? 'yes' : 'no'}`,
  signalError: (message) => `Chain-trace signal error (non-blocking): ${message}`,

  // — gh-api (shared) —
  ghNoAuth: 'Missing GITHUB_TOKEN or GITHUB_REPOSITORY environment variable',

  // — backlog import (parse errors) —
  errorMalformed: (line, id, columns) =>
    `line ${line}: story row ${id} is malformed (${columns} columns instead of the required 4)`,
  errorNoEpic: (line, id) => `line ${line}: story ${id} appears without an epic heading`,
  errorNoTitle: (line, id) => `line ${line}: story ${id} has no title`,
  errorDuplicateId: (id) => `Duplicate story ID in the backlog: ${id}`,

  // — backlog import (generated issue body) —
  issueStoryTitle: '## Story',
  issueAcTitle: '## Acceptance criteria',
  issueAcMissing: '_(missing — sara to supply)_',
  issueFooter: [
    '_Imported automatically from `docs/backlog-poker.md`. The backlog file is the source —',
    'if you edit here, carry it back there too (otherwise the next import drifts)._',
  ],

  // — backlog import (shell, console) —
  importNoFile: (path) => `No backlog file: ${path}`,
  importFormatErrors: 'Format errors in the backlog:',
  importEmpty: (path) => `${path} contains no story table — nothing to import.`,
  importSummary: (stories, existing) => `Backlog: ${stories} stories · existing issues: ${existing}`,
  importPlan: (toCreate, orphaned) => `To create: ${toCreate} · orphaned open: ${orphaned}`,
  importDryRunCreate: (id, title) => `  would create: [${id}] ${title}`,
  importDryRunOrphaned: (number, title) => `  orphaned:     #${number} ${title}`,
  importCreated: (number, title) => `  created: #${number} ${title}`,
  importLabelError: (title, message) => `  ERROR (${title}): ${message} — retrying without labels`,
  importLabelless: (number) => `  created (without labels): #${number} — add the labels manually`,
  importOrphanedHeader:
    '\nOrphaned open stories (their ID is no longer in the backlog) — we did NOT close them:',
  importOrphanedDecision: 'The call belongs to petra/a human: close, rename, or restore the backlog entry.',
}

export const TABLES = { magyar: hungarian, english }

// The full key set — both the parity test and the fallback work from this.
export const KEYS = Object.keys(hungarian)

// The message table for the given language, layered onto Hungarian (a missing
// translation → Hungarian, never `undefined`). An unknown language → Hungarian,
// silently: a typo'd config value must not be able to block a session-start
// hook.
export function messages(language) {
  return { ...hungarian, ...(TABLES[language] ?? {}) }
}
