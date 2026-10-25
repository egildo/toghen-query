# @toghen/query — Decisions

> **Audience:** contributors and agents who ask why `toghen-query` is shaped as it is, or what is still undecided. For the present shape, see [specs.md](./specs.md).

This is the archive of the package's design. Each entry is dated. Entries are added to and never rewritten.

## Ruled: build the query tool before the core fixes what it shows (21 October 2026)

**Status:** ruled and built.

**The ruling.** `toghen-query` is built now, with the core as it is. The [core review](https://codeberg.org/Toghen/lib/src/branch/main/core-review.md) of the same date found questions the core cannot answer, and behaviours it answers wrongly. The review proposed fixing the quiet defects first (its section 7, steps 1 to 7) and building the playground at step 8. This ruling reverses the order.

**Why.** The sessions are the proof that a fix worked. A session that holds `missing: question 36` today fails the day the core answers it, and its diff shows the answer. A session that holds today's wrong answer fails the day the defect is fixed. Written after the fixes, the sessions would only record that the fixes happened. Written before, they show the state to fix from, in the same words the fix will change.

**The name.** The review called it `toghen-play`, a playground. It is `toghen-query`, `@toghen/query`, with the command `toghen-query` and the prompt `query>`. The tool asks questions and prints answers. It does not let anyone play with the core's API, and the name should not promise that. `toghen-ui` is already called Toghen's playground in the docs.

**The three things it must not do.**

1. Import an adapter, or write a CSS name, a selector, a Figma collection, mode or limit.
2. Write any file except a session it was asked to update.
3. Add anything to the core to make a question answerable. `missing` is the correct answer.

Beside them stands the one rule: every command is one call to one public export, then printing. The package computes no semantics.

**Considered and rejected.**

- **A script runner.** It would give a person the whole API and let them compute anything. A script re-derives semantics, which is the problem the review is about. A fixed set of commands cannot. A person who needs more than a command gives is asking for a new question in the core.
- **A small web page.** It needs a bundler, a browser and a screen to keep tidy, and its output is hard to compare in a test. The Figma plugin already has a token graph screen for people who want one.

**What the build found.**

- The three ways in cost one function. A prompt, a one-shot query and a session all call `ask` and `render`, so a session typed by hand and a session run in a test are the same text.
- The review's examples type a path with no collection. The core wants a lookup path, with the collection, for `resolveValue`, `resolveToken` and `referencesOf`, and a path without it for the others. The package adds the collection's name in front for the first kind. That is the one join it makes. A path starting with `:` is sent as typed, which is how the session for the one-collection shorthand asks the core and gets its refusal.
- `across` could not be one call. The core has no export that answers one token in every mode, so the command calls `resolveValue` for each mode `getModes` lists, and says so in its last line.
- The review's question 4, the token paths in a mode, has an export, and the review's `tokens` example is question 6, the tokens under a group, which has none. The first is the command `paths`, and the second is `tokens`, which prints `missing: question 6`.
- The running example moved to `toghen-lib/example/`, with the tutorial's two starting points, which read the example's files by relative path. The core's, the CSS adapter's and the Figma adapter's tests read it from there. This closes item 11 of section 4 of the review.

## Ruled: nine commands, one for each question (21 October 2026)

**Status:** ruled and built.

**The ruling.** The maintainer ruled the first command table too large: 23 commands, one for each export, so every
second way the core had to ask a thing became a second command. The core's question set is nine questions
([toghen-lib decisions](https://codeberg.org/Toghen/lib/src/branch/main/decisions.md#ruled-the-core-answers-nine-questions-21-october-2026)), and the
package has one command for each: `system`, `paths`, `value`, `type`, `refs`, `parts`, `applies`, `check`, `css`. A
command has forms, picked by the word after the path. Each form is still one call to one core export; `value …
across`, one call for each mode, stays the one admitted bend, and says so on its last line.

**What changed with it.**

- The core answers every command now, so none prints `missing`, and the code that printed it is gone. The
  `applies` session holds the token that applies; the `defects` session holds the fixed answers; a new session
  asks a broken document for its check.
- A path goes to the core as typed. The core reads a path without its collection (the one-collection shorthand),
  so the package no longer puts the collection's name in front, and a leading `:` means nothing.
- `--json` prints the questions a command absorbs, as a list, where it printed one question number.

**Considered and rejected.**

- *Keep the 23 commands and add the new answers.* The table would have grown with the core instead of naming its
  questions, and a reader would still ask which of three commands answers a thing.

## Ruled: token files are the core's to wrap (21 October 2026)

**Status:** ruled and built.

**The ruling.** The package wrapped `--tokens` files itself: a one-set resolver document named `tokens`, held at a
made-up entry, served by its own reader. The core's `load` now takes a list of token files and wraps them the same
way ([toghen-lib decisions](https://codeberg.org/Toghen/lib/src/branch/main/decisions.md#ruled-the-loading-chapter-21-october-2026)). The package's
wrapper is gone. It makes the files absolute and hands the list to `load`.

**What changed with it.** The collection is no longer named `tokens`. The core names it after the folder that holds
the files, so the example's files in `toghen-lib/example/` give a collection named `example`.

## Built: a map, a source mid-session, and what `system` and `check` now print (21 October 2026)

**Status:** built. The shapes are in [guide.md](./guide.md#flags) and [specs.md](./specs.md#the-session-format).
The core's side is [the loading chapter](https://codeberg.org/Toghen/lib/src/branch/main/decisions.md#ruled-the-loading-chapter-21-october-2026).

**What was built.**

- *`--overrides <file>`*, and the session line `@overrides <file>`. The file is read as JSON and handed to `load` as
  `options.overrides`. The package does nothing to the map: the core resolves each relative value against the
  document that holds the reference.
- *A source may change mid-session.* A run of source lines (`@doc`, `@tokens`, `@overrides`, `@build`) may stand
  between blocks, and loads again for the queries beneath it. A run that names a document or token files drops the
  document, the token files and the map before it, unless it restates them; the build is kept. A run of `@overrides`
  or `@build` alone changes that one thing. `replay` writes the lines back where they stood. This closes the first
  open question below: a session may ask more than one document, one after the other.
- *`@tokens <file> …`* in a session, which the header could not say before.
- *`system`* prints the modifiers' names in declared order and in the order they win in, and, with a map, the map's
  hash, its unused keys and every read it changed. The prompt is the **second consumer** of
  `getModifiers('precedence')`, after the CSS adapter, as [the ruling that kept it](https://codeberg.org/Toghen/lib/src/branch/main/decisions.md#ruled-the-order-modifiers-win-in-stays-21-october-2026)
  said it would be.
- *`check`* prints `load`'s collisions beside the collection's rows. The loaded state keeps `load`'s whole result
  for both.
- *A new session*, `overlay-and-map`, asks the running example's base, its overlay and the base read with a map.
  The `defects` fixture gains a token file, `defects.legacy.tokens.json`, whose `legacy.old` collides with the
  document's own, and the session gains a `check`.

**What changed in the sessions.** `system` gained two lines and `load` in its last line, in `defects`. `check`
gained a `collisions` line and `load` in its last line, in `a-broken-document`, which has none.

**Decided alone.**

- *A blank line ends an answer.* A source line is told from an answer line only by where it stands, so an `@` line
  right beneath an answer is still part of the answer. No printer writes a blank line, so nothing that was an answer
  before is cut.
- *File paths from `load` are printed relative to the folder of the entry*, the document or the first token file.
  `load` returns them absolute, and a session must print the same on every machine. `--json` keeps them as `load`
  gave them.
- *`system` and `check` name `load` in their last line* whether or not a map was given, so the last line of a form
  does not change with the input.
- *The precedence order is printed beside the declared order as two lines of names*, and the existing line for each
  modifier is kept as it was.

**Considered and rejected.**

- *Source lines anywhere, even under an answer.* An answer may begin with `@`, a string value for one, and a
  session could not tell it from a source line.
- *A new `@doc` keeping the map.* A map is written against one document's references. Kept across a change of
  document, it would apply to text it was not written for, and its unused keys would say so only in `system`.

## Ruled: a one-shot query exits 1 when the answer is not clean (23 October 2026)

**Status:** ruled and built. Planned in [toghen-figma's plan of the small defects](https://codeberg.org/Toghen/figma/src/branch/main/.reference/plans/plan-2026-10-23-small-defects.md), question 1, answered (a).

**The ruling.** A one-shot query exits 1 for the core's `error:`, a usage error, an unknown command, and a `check` whose collection check lists anything; 0 otherwise, `help` included. The prompt exits 0; sessions are unchanged. Collisions do not fail.

**Why.** Every one-shot exited 0, so `check` could not stop a CI step without its output being parsed (found by the skills' research, `toghen-skills/decisions.md`). An exit code that reads the kind of answer computes nothing: `ask` already sorts answers into `answer`, `error`, `usage` and `unknown`, and the core documents `check` as what is wrong with the tokens. A form says whether its answer is a failure (`fails`), so the rule is beside the export it reads.

**Considered and rejected.**

- *Non-redundant collisions failing too.* The plugin shows them as warnings, but the core calls the report advisory: failing on them would be this package's own ruling about a collision.
- *No code change, and a `--json` recipe with `jq -e` in the guide.* It works, and leaves every caller to write the same test.

**Found.** `help` is answered with the kind `usage`, so the code tells it apart by its word.

## Built: a session can name a file inside a package (25 October 2026)

**Status:** built. Planned in the workspace plan of 25 October 2026 (`.reference/plans/workspace/plan-2026-10-25-tooling-codeberg.md`), section 8.2, for the split into one repository per package.

**The change.** A source line's path that starts with `@` names a file inside a package and is resolved through it: `@doc @toghen/lib/example/ds.resolver.json`. Any other path is relative to the session file, as before. `@toghen/lib` ships the running example for this (`"./example/*"` in its exports). `overlay-and-map.session` and the command's default example read it this way.

**Why.** The sessions read the example by a path that climbed out of this package into lib's folder. Once each package lives in its own repository, that folder is not there; the installed package is.

**Considered and rejected.** *A copy of the example inside this package.* Two copies of the running example, which `model.md` says is lib's, would drift.

**Found.** A relative file whose name starts with `@` can no longer be named in a session. No session does.

## Moved: a repository of its own, numbered from 0.1.0 (25 October 2026)

**Status:** done.

**The change.** The package left the Toghen monorepo for its own repository, [`Toghen/query`](https://codeberg.org/Toghen/query) on Codeberg, in one first commit. Its history before the split is not carried over. Its version starts again at 0.1.0; the last version before the split was 0.2.0. Links that crossed into other packages now point at their repositories.

**Why.** Ruled by Egildo on 25 October 2026: one repository per package, and a [house](https://codeberg.org/Toghen/house) repository for what they share (the constitution, the speckit preset, the Biome config, the purity check). The plan is in house, `.reference/plans/workspace/plan-2026-10-25-tooling-codeberg.md`.

**With it.** Biome lints and formats the code, `pnpm check` runs every gate, and speckit with the house preset runs the rounds. A session's path that starts with `@` names a file inside a package; see the entry *a session can name a file inside a package*, above.

## Open questions

- **Closed:** [a source may change mid-session](#built-a-map-a-source-mid-session-and-what-system-and-check-now-print-21-october-2026). Whether a session may carry more than one document. Today a session asks one, named in its header. A question that compares two documents would need two.
- Whether `--json` should print a session. Today a session is plain text only.
