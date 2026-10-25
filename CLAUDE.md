# toghen-query (@toghen/query)

A command line that asks the core its questions and prints the answers.

Toghen is a design-tokens toolkit split into one repository per package. What the repositories share lives in house.

The rules are in the constitution, at `.specify/memory/constitution.md`: the shared principles and this package's own section. Read it before changing anything. This file holds only what is not a rule.

## The docs

| Doc | What it is |
|---|---|
| `guide.md` | How to use it: setup, workflows, examples |
| `specs.md` | Why it is built this way: architecture, contracts, decisions, open questions |
| `decisions.md` | The archive: dated rulings, what was considered and rejected, what the build found, superseded sections, open questions |

There is no `reference.md`. The package exposes transcripts, not an API: its sessions, replayed in a test.

## Commands

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm check   # coming in the tooling round
```
