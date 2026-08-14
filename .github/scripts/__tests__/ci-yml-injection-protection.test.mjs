import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Guard test for the template `ci.yml`'s `projekt-teszt` job's "Run project
// tests" step (step names are English in both installation languages — the
// GitHub Actions UI is single-language; see the workflow's header comment)
// `run:` block — per an ACTUALLY MEASURED case in the kit's source project
// (agent-kit v1.0, not the current target project), this bug class (script
// injection via the project-specific test command) came back TWICE before:
// first as direct `${{ }}` interpolation into the `run:` line, then — after
// the `env:` indirection was introduced — as `eval "$TESZT"`. The latter was
// ruled out not by opinion but by a run trial: with a test command shaped
// like `echo hi; touch PWNED`, the `touch PWNED` actually executed.
// The fixed state rules out both: the `${{ }}` value comes in through `env:`
// as a shell variable, there's no `eval` on the run line, and `$TESZT` is
// unquoted (not `"$TESZT"`) so the shell splits ONLY on word boundaries and
// does not re-interpret metacharacters (`;`, `&&`, `|`, redirection).
//
// The test DELIBERATELY isn't a raw whole-file grep, it targets the `run: |`
// block scalar: the bug class concerns the `run:` block's CONTENTS, the
// preceding `env:`-explaining comment (which itself quotes the word "eval"
// to justify its absence) is NOT part of that — a loose whole-file grep
// would false-positive on that comment. With no YAML parser (zero new
// dependency, per CLAUDE.md), extracting the block scalar is indentation-
// based text checking; this tolerates harmless rewording (an extra blank
// line, a comment OUTSIDE the block, reordering steps), because it follows
// the `run: |` key and its indentation depth, not a line number or exact text.

const ciYmlPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../workflows/ci.yml')

function runBlockContents(yml, stepName) {
  const lines = yml.split('\n')
  const stepIdx = lines.findIndex((l) => l.includes(`name: ${stepName}`))
  assert.ok(stepIdx > -1, `no step named "${stepName}" found in ci.yml`)

  const runIdx = lines.findIndex((l, i) => i > stepIdx && /^\s*run:\s*\|\s*$/.test(l))
  assert.ok(runIdx > -1, `no "run: |" block scalar after the "${stepName}" step`)
  const runIndent = lines[runIdx].match(/^\s*/)[0].length

  const block = []
  for (let i = runIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') {
      block.push(line)
      continue
    }
    const indent = line.match(/^\s*/)[0].length
    if (indent <= runIndent) break
    block.push(line)
  }
  return block.join('\n')
}

test('ci.yml — the projekt-teszt "run:" block has no eval (script injection, measured case)', () => {
  const yml = readFileSync(ciYmlPath, 'utf8')
  const block = runBlockContents(yml, 'Run project tests')
  assert.doesNotMatch(
    block,
    /\beval\b/,
    'eval in the run: block would also re-interpret shell metacharacters (;, &&, |, ' +
      'redirection) in the $TESZT value coming from config.json — measured with a trial RUN in ' +
      'the kit\'s source project: with "echo hi; touch PWNED", the touch actually executed, not ' +
      'a theoretical risk.',
  )
})

test('ci.yml — the projekt-teszt "run:" block has no direct ${{ }} GitHub Actions interpolation', () => {
  const yml = readFileSync(ciYmlPath, 'utf8')
  const block = runBlockContents(yml, 'Run project tests')
  assert.doesNotMatch(
    block,
    /\$\{\{/,
    'the value coming from config.json must enter the run: block via "env:", NOT via direct ' +
      '${{ }} interpolation — the latter would write user-controlled text literally into the ' +
      'shell command (the original finding identified in the kit\'s source project).',
  )
})
