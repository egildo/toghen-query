# @toghen/query — Guide

`toghen-query` asks the core of Toghen a question and prints the answer. It is for a person who wants to see what the core says about a token, a mode or a component, and for a contributor who wants to pin that answer in a test. It does not compute anything itself. The reason is in [specs.md](./specs.md).

The examples use the [running example](https://codeberg.org/Toghen/lib/src/branch/main/model.md#the-running-example), the document `ds`, which lives in [toghen-lib/example](https://codeberg.org/Toghen/lib/src/branch/main/example/).

## Run it

From npm, without a checkout:

```sh
npx @toghen/query <arguments>
```

Or from the repository root, after `pnpm install`:

```sh
pnpm --filter @toghen/query build
```

The command is `toghen-query`. In the repository you can also run the source with `pnpm --filter @toghen/query query -- <arguments>`.

## Three ways in

All three use the same loop: read one query, ask the core, print the answer.

**One query on the command line.**

```sh
toghen-query --doc node_modules/@toghen/lib/example/ds.resolver.json value button.backgroundColor
```

```text
{"colorSpace":"srgb","components":[1,1,1],"hex":"#ffffff"}
— resolveValue
```

It exits 0 for an answer and 1 for anything else: the core's `error:`, a usage error, a word no command has, and a `check` whose collection check lists anything, so `toghen-query --doc ds.resolver.json check` can stop a CI step on its own. `help` exits 0. Collisions do not fail `check`: `load` reports them as advice, the last source still winning. A step that should stop on them too reads the output for a `collisions:` line with entries beneath it. `--json` exits as the plain text does.

**A prompt.** Give no query. The prompt is `query>`. It reads one query a line. Type `help` for the commands, and `exit` or press Ctrl-D to leave.

```sh
toghen-query --doc node_modules/@toghen/lib/example/ds.resolver.json
```

```text
query> type button.backgroundColor
color
— resolveToken
query> exit
```

Input that is piped in works the same way, without the prompt text.

**A session file, replayed.**

```sh
toghen-query --session toghen-query/sessions/parts.session
```

It prints the transcript again with the answers the core gives now. The exit code is 0 when that equals the file, and 1 when it does not.

## The query line

A query is one line: a question word, a path, perhaps a word that picks a form, and any `modifier=context` pairs.

```text
value button.hover.backgroundColor theme=dark
value button.hover.backgroundColor across
value button.hover.backgroundColor how theme=dark density=compact
```

- The **question word** picks the command. There are nine, one for each of the core's questions. `help` lists every form.
- The **path** goes to the core as typed. A reference path, the form written inside braces in a token file, is enough: the document has one collection, and the core puts its name in front. A lookup path, with the collection, works too.
- A **form word** after the path picks another way to ask: `across`, `how`, `depends`, `vocabulary`, `axes`, `group`, an attribute name starting `$`.
- A **`modifier=context` pair** names a context. Where a form takes a mode, the pairs together name it: `theme=dark density=compact`. With `value … how`, they are the input of the late-bound value. With `applies`, an `axis=value` pair is the selection.

## What an answer looks like

Plain text, in the order the core gives. The last line names the core export that gave the answer. These are the shapes:

```text
color                                  an answer, then the export
— resolveToken

error: Mode 'theme=sepia' …            the core's own error, then the export
— resolveValue

usage: value <path> [modifier=context …]   a word no form has: the command's forms, and no export
```

`--json` prints one line of JSON for each answer instead: `{"questions":[12,13],"export":"resolveToken","answer":"color"}`, or `{"questions":[8,11,…],"export":"resolveValue","error":"…"}`.

The core answers every command. A question it cannot answer gets no command here until it can: the gap is filled in the core, and the package then asks.

## Flags

| Flag | What it does |
|---|---|
| `--doc <file>` | Loads a resolver document with the core's `load`, following every file it names. |
| `--tokens <file>` | Loads bare token files instead. Repeat the flag for more files. The core's `load` wraps them in a one-set resolver document, in the order given. The collection is named after the folder that holds the files. |
| `--overrides <file>` | Reads an overrides map, a JSON object, and hands it to the core's `load` as it is. A key is a `$ref` as written in a document; its value is the file to read instead. The core resolves a relative value against the document that holds the reference, not against the folder you run the command in. See [Theme a system with a map](https://codeberg.org/Toghen/lib/src/branch/main/guide.md#theme-a-system-with-a-map). |
| `--build <how>` | `sum` (the default): the defaults and each context alone. `product`: every combination. `modifier=context,…`: one combination, as a one-mode system. |
| `--json` | One line of JSON for each answer. |
| `--session <file>` | Replays a session file. |
| `--help` | Prints the usage. |

## A session file

A session is a transcript. It is how the package is specified and how it is tested.

- A line starting `> ` is a query.
- The lines beneath it, until the next `>`, `#`, blank line or the end, are the expected answer.
- A line starting `# ` is a comment. A comment belongs to the query beneath it.
- A line starting `@` is a source line. There are four. Each path is relative to the session file, or, when it starts with `@`, names a file inside a package, such as `@toghen/lib/example/ds.resolver.json`:
  - `@doc <path>`: the resolver document to ask.
  - `@tokens <path> …`: bare token files instead. Several on one line, or on several lines, are loaded in that order.
  - `@overrides <path>`: an overrides map, as `--overrides` reads it.
  - `@build <how>`: the build, as `--build` takes it.
- Source lines stand together, in a run, at the top of the session or between blocks. A run loads again, for the queries beneath it. With no source line before the first query, a session asks the running example.
- A run that names a document or token files starts again: the document, the token files and the map before it are dropped, and only what the run says is loaded. To keep a map, write `@overrides` again in the run. The build is kept unless the run says another.
- A run of `@overrides` or `@build` alone changes that one thing, and keeps the document.
- A blank line separates blocks. A comment or a run of source lines followed by a blank line stands alone.

Replaying writes the source lines back where they stood, so a session on disk still equals its replay. This session asks a base document, then an overlay, then the base read with a map:

```text
@doc @toghen/lib/example/ds.resolver.json

> value surface.accent
{"colorSpace":"srgb","components":[0.102,0.4,0.902],"hex":"#1a66e6"}
— resolveValue

@doc @toghen/lib/example/ds.warm.resolver.json

> value surface.accent
{"colorSpace":"srgb","components":[0.902,0.4,0.102],"hex":"#e6661a"}
— resolveValue

@doc @toghen/lib/example/ds.resolver.json
@overrides @toghen/lib/example/warm.overrides.json

> value surface.accent
{"colorSpace":"srgb","components":[0.902,0.4,0.102],"hex":"#e6661a"}
— resolveValue
```

This is a whole session with no source line:

```text
# Two values of one axis in one path. The core refuses it, and the answer is its error as it gives it.
> parts button.hover.pressed.backgroundColor
error: Path 'button.hover.pressed.backgroundColor' nests two parts of axis 'state': 'hover' and 'pressed'. Give the group "com.toghen": { "css": { "parts": false } }, or rename a key.
— partsOf
```

`pnpm --filter @toghen/query test` replays every file under [sessions/](./sessions/) and compares each with its replay, line for line. To write a new session, write the queries and comments, then run:

```sh
UPDATE_SESSIONS=1 pnpm --filter @toghen/query test
```

The answers are filled in, and the diff shows what the core said. Read the diff. A change in an answer is a change in the core.

The sessions that exist:

| Session | What it asks |
|---|---|
| [where-a-value-comes-from](./sessions/where-a-value-comes-from.session) | The button's background: its value, what it refers to, the chain of what it refers to, its dependencies, its type and its CSS names |
| [across-contexts](./sessions/across-contexts.session) | One token in every mode, a combination the sum did not build, and the late-bound answer |
| [parts](./sessions/parts.session) | What lies under the button, the vocabulary of a group, a path's parts and twins, the button's axes, a group that is a part, and the error for two values of one axis |
| [applies](./sessions/applies.session) | Which token applies under a selection, and with none |
| [defects](./sessions/defects.session) | Three behaviours the review called defects, with the answers the core gives since they were fixed, and a collision in the check |
| [a-broken-document](./sessions/a-broken-document.session) | The document-wide check of a broken document, and the error of a reference to no token |
| [overlay-and-map](./sessions/overlay-and-map.session) | The accent of a base, of an overlay in light and dark, and of the base read with a map; the map's hash and the read it changed |

## The commands

`help` prints every form from the code. Each command absorbs questions of section 5 of the [core review](https://codeberg.org/Toghen/lib/src/branch/main/core-review.md); the list is in [toghen-lib's decisions](https://codeberg.org/Toghen/lib/src/branch/main/decisions.md#ruled-the-core-answers-nine-questions-21-october-2026).

| Command | Asks | Core export |
|---|---|---|
| `system` | The modifiers, their contexts and defaults, their declared order and the order they win in, the modes built, the default mode; with a map, its hash, its unused keys and the reads it changed | the document's plain getters, side by side, and `load` |
| `paths [group]` | What lies under a group, each marked token or group | `childrenOf` |
| `paths <group> $attribute` | What a group declares | `getGroupAttribute` |
| `value <path> [pairs]` | The value, or a member's | `resolveValue` |
| `value <path> across` | One row per mode | `resolveValue`, for each mode of `getModes` |
| `value <path> how` | The chain: what each context says, and which definition applies | `contextsOf` |
| `value <path> how <pairs>` | The value under contexts no build made, late bound | `valueAt` |
| `type <path> [pairs]` | Its type | `resolveToken` |
| `refs <path> [pairs]` | What it refers to, member by member | `referencesOf` |
| `refs <path> depends` | Which modifiers it depends on, directly and through references | `dependsOn` |
| `parts <path>` | The parts it passes through, its twins, its rest and its component | `partsOf` |
| `parts <group> vocabulary` | The vocabulary in force | `vocabularyAt` |
| `parts <group> axes` | The axes and values below it, in precedence order | `axesOf` |
| `parts <group> group` | The part the group is | `partAt` |
| `applies <component> [axis=value …]` | Which token supplies each key under a selection | `applies` |
| `check` | Holes, non-factorable tokens, tokens incomplete in some mode, and the collisions `load` found | `check`, and `load` |
| `css <lookup path>` | A token's custom property | `cssPropertyName` |
| `css <--property> <modifier>` | A chain link's custom property | `cssLinkName` |

### What `system` and `check` print

`system` prints the modifiers twice more, by name: in the order the document declares them, and in the order they win in, a later one winning (`getModifiers('precedence')`). When a map was given, it adds the map's hash, its unused keys, and every read the map changed, as `<reference as written> in <document holding it> read from <file read>`:

```text
modifiers as declared: theme, density
modifiers in the order they win, the last winning: theme, density
…
overrides hash: 5784d4a9943c490c
overrides unused: (none)
overridden:
  roles.tokens.json in ds.resolver.json read from roles.warm.tokens.json
```

`check` adds the collisions `load` reported: a token path that two sources of one set, or of one modifier context, both give a `$value`. Each line names the path, the set or the `modifier=context`, the files in merge order (the last wins), and `(redundant)` when the values are equal as written:

```text
collisions:
  legacy.old in set base: defects.resolver.json, defects.legacy.tokens.json
```

Paths of files are printed relative to the folder of the document loaded, or of the first token file.

`check` lists collisions and does not fail on them: a one-shot `check` exits 1 for `incomplete`, `holes` or `non-factorable` entries only (*Three ways in*).
