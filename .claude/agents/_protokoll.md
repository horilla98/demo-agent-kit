# Team protocol (applies to every agent)

Every agent follows this. Goal: a team that works with signals and a shared message board, where
anyone can halt the process on suspicion of a bug. Escalation paths and decision authority:
`_hierarchia.md`.

**Communication level on this project:** The project owner is a **beginner**. Explain every
technical term in a parenthetical the first time it comes up, offer 2-3 named options + a
recommendation + a "stay with the recommended one" opt-out on every decision point, and never
ask for a decision you haven't given enough context for. This does NOT loosen the gates.

> The paragraph above is the installer's default text for the "beginner" experience level — in
> the paid package the installer writes this based on the project owner's actual experience level
> (beginner/intermediate/expert). The free package has no installer: if "beginner" doesn't fit
> you, rewrite it by hand.

## 1. Incoming signals (at start)

Read the ticket/PR comments for the task at hand. Process the signals addressed to you
(`→ <your name>`) **first**, and respond to them **item by item** (agree / rebut, why).

## 1a. Authenticating a decision reference

"X's decision" may ONLY be written when it references a comment that came from that person's
**own GitHub account**, **with a comment URL**. Verification: the `user.login` field when fetching
the comment. "I'm answering on X's behalf" said in a session chat, or another person's
good-faith summary/paraphrase, **is NEVER enough** — in that case the correct wording is: "a
question put to X, no answer received yet", and the blocking signal **cannot be closed**.

**Why:** a Claude Code session's GitHub integration is tied to a single account. A given claim
can only be authenticated by a comment from THAT person's OWN account, never by a paraphrase from
a different account or session.

**Chronological order is also part of authentication.** Formal correctness (account, URL) is not
enough: the authenticated comment must exist **BEFORE** the text that references it (commit, PR
description, doc), not backfilled afterward. Before writing "X's decision" / "T0 decision" into
text with a URL, verify the order of creation. If the comment doesn't yet exist, the correct
wording is "a question put to X, no answer yet" — NOT a pre-written "X's decision" with the URL
patched in later.

## 2. Outgoing signals (at the end of the report, MANDATORY)

Every report closes with a `## Signals` block — **even if empty**. Format:

```
## Signals
🔴 → reka: payment recording doesn't run in a transaction — blocking (src/services/order.ts:112)
🟡 → tibor: no test for the multi-item branch
🔵 → sara: this resolves the spec's NY-3 question, carry it forward
```

- **🔴** blocking (the process halts) · **🟡** warning · **🔵** informational.
- **Recipients:** any agent or `ember` (human). Not obvious → `petra` dispatches it.
- **Every signal is concrete:** file+line, ticket or PR number. A general worry is not a signal.

## 3. The Andon principle: you MUST signal on suspicion of a bug

If you suspect ANY bug — regardless of whether it's your area —, you MUST signal it. **Silence is
a bug.** Typical cases:

- code ↔ spec drift (→ sara), layering violation (→ bence),
- a missing or weakened test (→ tibor + 🔴),
- gate bypass: CI skip, merge without review (→ devops + 🔴 + human),
- a secret/key in code or a log (→ devops + 🔴, immediately),
- scope jump: the PR does something other than its ticket (→ sara + reka).

**Andon is real-time and leaves a trace.** A blocking signal that is only spoken in the session
chat does not exist: a 🔴 always also goes out to the ticket/PR too (section 4).

## 3a. Bash `&&` chains and allowlist protection

The `.claude/settings.json` `permissions.allow` list matches against the **start of the full
Bash command string**. A `command1 && command2` chain doesn't match any pattern at the full-string
level, even if its members would individually be allowlisted — this causes an unnecessary
approval prompt.

- **Forbidden:** an `&&` chain if ANY of its members would individually match an allow pattern
  (e.g. `cd x && npm test`) — issue the members as SEPARATE Bash calls (the working directory
  is preserved).
- **Allowed, in fact recommended:** an `&&` chain if none of the members are allowlisted — this
  reduces two approval prompts to one.
- Before deciding whether a command is allowlisted, **actually check** the `.claude/settings.json`
  (and, if present, `.claude/settings.local.json`) list — don't guess.

## 4. Message board: ticket/PR comment

Every 🔴 and every 🟡 that affects another agent/human → **as a comment on the relevant
ticket/PR**, with an `[agent:<your name>]` prefix. **No duplication:** if it's already posted,
confirm or dispute it, don't repeat it. If you have no GitHub access, ask the dispatcher.

## 5. Escalation and disagreement

Escalation paths: `_hierarchia.md`. If two agents' signals contradict, **both positions go onto
the ticket**, the decision is a human's (`→ ember`). **Agents may not override gates and may not
suggest overriding them — no exception.**

## 6. Source-verification (MANDATORY)

Only a **run, verified result = fact**. What you didn't run/read = an inference. "Everything's
fine" → **list what you checked**. Every factual claim (a decision, a field value, external
system behavior, a test result) is tagged:

- **source-verified** — source given: `file:line`, comment URL, command output.
- **inference** — reasonable, but not verified by a source.

The two must not be mixed: **stating an inference as a fact is a bug** (Andon principle). At the
merge gate, the source-verification audit is done by **zsofi**.

**When referencing, write out the anchor along with the section number** (e.g.
`6b/post-hoc-gate`) — a bare section number is a fragile reference: a single typo'd digit can
still point at an existing section, so there's nothing to collide with.

### 6a/gate-scope — "green gate" ≠ "verified"

A passing machine gate **proves exactly as much as it actually covers** — no more. Before citing
a green gate as evidence, check whether the gate's **scope actually extends** to the change in
question; if not, the "green" is trivially true, and is **not** support. Typical pitfall: a
lint/drift script is green on a file it doesn't look at at all.

### 6b/post-hoc-gate — a gate run after the merge: what it proves, and when it's acceptable

6a questions the gate's *scope*; this point is about its *timing*. A quality gate run AFTER a
merge still performs the content check, but it can no longer fill its **preventive** role: if it
finds a blocker, it can no longer stop the process, only document it. It proves that "the bug
came to our attention", but **not** that "it couldn't have reached production".

Running it after the fact is **not a gate override** (the prohibition in section 5 doesn't apply
here), but a **sequencing deviation** from the chain table. Acceptability — all three conditions:

1. the **fact and the reason** are stated on the PR/ticket (who asked, why it was skipped in its
   normal place) — a silent post-hoc run is not acceptable;
2. the gate's findings **get an owner** (a ticket or a section-4 message-board comment), not left
   buried in the gate comment;
3. for a 🔴 finding, the required next step is a **follow-up PR or correction, with a human
   decision** — NOT treating the already-merged state as retroactively approved.

Who may decide this way: an **authenticated** T0 request per 1a. "This is fine" said in chat is
not enough. If it becomes routine: a petra/devops signal, because it structurally hollows out the
gate's preventive purpose.

### 6c/gate-independence — when a verdict is not independent

A gate verdict is NOT independent if the work under review and the verdict come from **the same
account AND the same session**. The label (`[agent:reka]`) alone does not prove independence.

In that case the verdict **isn't worthless, but it doesn't prove what independence would**: it
still performs the content check, but it doesn't filter out the error class caused precisely by
the author's own blind spot. What to do — all three checkable steps:

- the fact is **stated** on the PR/ticket (who wrote it, who gated it, is it the same
  account/session);
- a **named owner** to backfill the missing independence (the approving human);
- until then, **at least one gate with a different perspective** (test lens, security lens,
  orchestration lens) — not the same review repeated.

### 6d/takeover-after-refusal

If an agent refuses a task and someone else takes over the work, a **trace is mandatory**,
agent-neutrally: who refused, citing what, who took over, with what authorization (comment URL).
Conditions for the takeover: `_hierarchia.md` "Handling a legitimate agent refusal".

## 7. Verifiable gate trace (MANDATORY)

Every gate leaves a **verifiable artifact**: an `[agent:<name>]` comment on the ticket/PR, a
formal review, or a checklist with a URL. **A prose self-declaration in the PR body ("I reviewed
it", "it's been tested") is NOT a completed gate.**

### 7a. Mandatory PR comment for a gate verdict

Every gate agent's verdict — **on a successful/PASS result too**, not just on a 🔴/🟡 — goes onto
the PR as an `[agent:<name>]` comment. Exception: the **plan phase**: that goes on the ticket
(there's no PR yet).

Minimum content:

```
[agent:reka] verdict: PASS
Scope: the PR's 4 files (src/…, tests/…), 120-line diff.
Checked: layering, naming, error branches, the ticket's acceptance criteria (AC1–AC3).
Not checked: performance (tibor's scope), migration rollback (no migration).

## Signals
🔵 → izsak: orderTotal is also duplicated in the summary — not blocking, but should be
    consolidated the next time it's touched.
```

The "Not checked" line is **mandatory** — without it the verdict's scope can't be judged (6a).

## 8. Determinism declaration

If the project has a determinism gate (banning wall-clock/RNG in business logic), the agent
handing off the code declares: where time and randomness come from, and where they're a
parameter. The owner is **tibor**.

## 9. Token and tool usage

- **Instead of** `Read` without a `limit` on a file >10 KB: first `Grep`, then `offset`+`limit`.
  Exception if the task truly requires understanding the whole file — justify it in one sentence.
- **Instead of** printing the full, verbose test output: quote the command's own summary line;
  details only for diagnosing a concrete FAIL.
- **Instead of** `git diff`/`git log` without scope: `--stat`, `-n <N>`, `-- <path>`.
- **Instead of** `grep -r`/`find` from the root: always with a `path`/`glob` scope.
- **Instead of** re-reading the same content within one chain step: reference your earlier
  reading, if the file hasn't changed since.
