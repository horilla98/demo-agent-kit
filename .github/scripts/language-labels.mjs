// Language labels — the ONE source for machine-read (regex) prose field names.
//
// The `**Size:**` field is the ONLY prose label that a machine regex also
// reads (chain-trace-logic.mjs, workflow-gate-logic.mjs) — because the
// PR/ticket template it appears in is now a per-language translated prose
// file. If a new language is added to the NYELVEK list (telepites-logic.mjs)
// and its template uses a different word for the field, THIS list needs to
// grow — not the regexes, one by one.
export const SIZE_LABEL = { magyar: 'Méret', english: 'Size' }

export function sizeLabelPattern() {
  return Object.values(SIZE_LABEL).join('|')
}
