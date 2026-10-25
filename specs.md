# @toghen/query — Specifications

> **Audience:** developers and AI coding agents changing `toghen-query`. How to use it is in [guide.md](./guide.md). The rulings and what was rejected are in [decisions.md](./decisions.md). The questions it asks are the core's question set, in [toghen-lib's specs](https://codeberg.org/Toghen/lib/src/branch/main/specs.md#the-questions-the-core-answers).

---

## Purpose

`toghen-query` (`@toghen/query`) is a command line that asks the core a question and prints the answer. It is the playground of the core: the place where a person sees what `@toghen/lib` says, and where a test pins it.

It exists to show what the core answers, and where it is thin. It has one command for each of the core's nine questions, and the core answers every one. A question the core cannot answer gets no form here: filling a gap means adding to the core, never to this package.

## The one rule

**Every answer is exactly one call to one public `@toghen/lib` export, then printing.**

A command has forms, picked by the word after the path (`value <path> across`, `value <path> how`). Each form is one call. The package computes no semantics. It does not walk a value, slice a path beyond splitting the query line, or compare two modes. If a command seems to need that, the core is missing a question, and the question goes to the core first.

Why: a consumer that re-derives what the core should answer hides the gap. The core review found the same derivation written twice in two adapters. A playground that computed would add a third copy, and its green output would say the core was complete. A playground that only asks cannot be wrong about the core. It can only show what the core says.

Three forms read more than one export. Each says so in its last line.

- `system` prints the loaded document's plain getters side by side: the name, the declared version, the modifiers with their contexts and defaults, the modifiers' names in declared order and in the order they win in, the modes, the default mode, the number of paths. With a map, it adds what `load` returned about it.
- `check` prints the collection's `check` and, beside it, the collisions `load` returned. The core's question set names `load` among the answerers of the `check` question.
- `value <path> across` calls `resolveValue` once for each mode that `getModes` lists. It prints the rows and compares none. It is the one admitted bend: the core has no export for one token in every mode.

### Exit codes

A one-shot query exits 0 for an answer and 1 for anything else: the core threw (`error:`), the line was a usage error, or its word is no command. `help` is answered as a usage and exits 0. A form may say that its answer is a failure, and only `check` does: 1 when the collection's `check` lists any `incomplete`, `holes` or `nonFactorable` entry. Collisions print beside them and do not fail, because `load` reports them as advice, the last source still winning ([lib's reference](https://codeberg.org/Toghen/lib/src/branch/main/reference.md)). The prompt exits 0, whatever it answered. A session exits by whether its replay equals the file, and a load that throws exits 2.

This computes no semantics. The code reads the kind of answer `ask` already sorts every answer into, and, for `check`, whether the lists the core calls "what is wrong with the collection's tokens" are empty. A session holds no exit code, so the codes are held by `test/ways-in.test.ts`, which runs the command as a process.

A path goes to the core as typed. The core's one-collection shorthand reads a path without its collection, so the package adds nothing to a path.

## What it must not do

1. **Import an adapter, or know a target.** No CSS name, selector or custom property. No Figma collection, mode or limit. The core's `cssPropertyName` is a core export and is asked like any other.
2. **Write any file** except a session it was asked to update, and only when `UPDATE_SESSIONS=1` is set in the test. The command line reads the paths it is given and writes nothing.
3. **Answer what the core does not.** A question without a core export has no form here.

`test/purity.test.ts` guards the first by checking that `@toghen/lib` is the only dependency and that `src/` never says `postcss`, `figma` or `culori`.

## Loading

- `--doc <file>`: the core's `load`, with a reader that reads files. File references are followed as the core follows them.
- `--tokens <file>…`: bare token files, made absolute and handed to the core's `load` as a list. The core wraps them in a one-set resolver document. The collection is named after the folder that holds the files, as the core decides.
- `--overrides <file>`: a JSON file, parsed and handed to `load` as `options.overrides`. The package does nothing to its keys or values. The core resolves a relative value against the document that holds the reference.
- `--build sum`: `resolveContextsToDesignSystem`. The default.
- `--build product`: `resolveAllToDesignSystem`.
- `--build modifier=context,…`: `resolveToDesignSystem`, one combination as a one-mode system.

The loaded document gives one collection. Its name is the first of `getCollectionNames`.

The loaded state keeps `load`'s whole result beside the resolver, the system and the collection, because `system` and `check` print parts of it. It also keeps the folder of the entry, the document or the first token file: `load` returns absolute paths, and the printers write them relative to that folder, so a session prints the same on every machine.

## The commands

The table is in `src/commands.ts`, one entry for each command: the word, the questions it absorbs (by the numbers of section 5 of the [core review](https://codeberg.org/Toghen/lib/src/branch/main/core-review.md)), and its forms. Each form has the word that picks it, the export, the call and the printer. `help` prints every form.

| Command | Form | Core export |
|---|---|---|
| `system` | `system` | `name`, `getDeclaredVersion`, `getModifiers`, `getModes`, `getDefaultMode`, `getAllPaths`, `load` |
| `paths` | `paths [group] [modifier=context …]` | `childrenOf` |
| | `paths <group> <$attribute>` | `getGroupAttribute` |
| `value` | `value <path> [modifier=context …]` | `resolveValue` |
| | `value <path> across` | `resolveValue`, for each mode of `getModes` |
| | `value <path> how` | `contextsOf` |
| | `value <path> how modifier=context …` | `valueAt` |
| `type` | `type <path> [modifier=context …]` | `resolveToken` |
| `refs` | `refs <path> [modifier=context …]` | `referencesOf` |
| | `refs <path> depends` | `dependsOn` |
| `parts` | `parts <path> [modifier=context …]` | `partsOf` |
| | `parts <group> vocabulary` | `vocabularyAt` |
| | `parts <group> axes` | `axesOf` |
| | `parts <group> group` | `partAt` |
| `applies` | `applies <component> [axis=value …]` | `applies` |
| `check` | `check` | `check`, `load` |
| `css` | `css <lookup path>` | `cssPropertyName` |
| | `css <--property> <modifier>` | `cssLinkName` |

A word after the path that no form has is a usage error, which prints the command's forms.

## Printing

A command's printer turns what the core returned into lines of text. It decides nothing. A value is one line of JSON when it is short, and indented lines when it is not. A list is one item a line, or `(none)`. An error prints its message as the core gave it, after `error: `. The order is the order the core gives, so an answer is the same every time. No printer emits a blank line, because a session reads a blank line as the gap between two answers.

Every answer ends with a line `— <export>`, the export the form called. A usage error has no such line, because no export gave it.

### Where each new line of `system` and `check` comes from

| Line | Core answer |
|---|---|
| `modifiers as declared` | `getModifiers()`, the names in declared order |
| `modifiers in the order they win, the last winning` | `getModifiers('precedence')`, the names |
| `overrides hash` | `load(…).overrides.hash` |
| `overrides unused` | `load(…).overrides.unused` |
| `overridden`, one line per read | each entry of `load(…).reads` whose `overridden` is true: its `ref`, `holder` and `location` |
| `collisions`, one line per collision | each entry of `load(…).collisions`: its `path`, its `set` or `modifier` and `context`, its `files`, and `redundant` |

The four map lines are printed only when a map was given, which is when `load` returns `overrides`.

## The session format

A session is read line by line.

- `> ` starts a query. The lines beneath it, up to the next `>`, `#`, blank line or the end, are its answer. A printer never writes a blank line, so a blank line always ends an answer.
- `# ` is a comment, kept with what follows it.
- `@` starts a source line when no answer is open: `@doc <path>`, `@tokens <path> …`, `@overrides <path>`, `@build <how>`. A path is relative to the session file, unless it starts with `@`: then it names a file inside a package, such as `@toghen/lib/example/ds.resolver.json`, and is resolved through that package. Any other `@` word is an error.
- Consecutive source lines are one run. A run, before the first query or between blocks, sets the source for the queries beneath it, and the next query loads again. A run that names `@doc` or `@tokens` starts from the build alone: the document, the token files and the map are dropped unless the run restates them. A run of `@overrides` or `@build` alone changes that one thing.
- Before any run, the source is what the command line gave with `--session`, and with no document at all the running example.

`replay` writes every item back in one form: blocks separated by a blank line, and the source lines where they stood. A comment, or a run of source lines, followed by a blank line is a block of its own; one followed by a query belongs to the query's block.

## How sessions serve the docs

A session is the spec, and its answers are the golden files.

- It is a transcript, so a reader sees a question and the core's answer together. The [guide](./guide.md) quotes real sessions, and a change in the core shows in a session before it shows in a doc.
- `test/sessions.test.ts` replays every file under `sessions/` against the running example, or the documents its source lines name, and compares exactly. `UPDATE_SESSIONS=1` rewrites the answers in place, as the core's example test does with `UPDATE_EXAMPLE=1`.
- The `applies` session holds the token that applies under a selection, as the core rules it. It held `missing: question 36` until the core answered, and the diff that changed it is the proof.
- The `defects` session asks the three behaviours the review called defects. It held the core's wrong answers until the fixes; the diff is the proof of each fix. The synthetic document it asks is in `sessions/fixtures/`.
- The `a-broken-document` session asks a synthetic document with a reference to no token, a composite overridden in part and a token one context alone defines: the document-wide check, and the error of the dangling reference.
- The `defects` session's fixture also has a token two sources of one set give a `$value`, so its `check` shows a collision.
- The `overlay-and-map` session asks the running example three ways: the base, the overlay `ds.warm.resolver.json`, and the base read with `warm.overrides.json`. It is the one session that changes its source mid-way.

The running example is in [toghen-lib/example](https://codeberg.org/Toghen/lib/src/branch/main/example/). The core cannot depend on this package, so the core keeps its own unit tests and its own example test.

## Not designed

- A script runner, or any way to run the core's API with the user's own code. See [decisions.md](./decisions.md).
- A page in a browser. See [decisions.md](./decisions.md).
- Commands beyond the nine. A new question enters the core first, then gets a form here.
