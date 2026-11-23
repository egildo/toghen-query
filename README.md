# @toghen/query

A command line that asks the core of [Toghen](https://codeberg.org/Toghen), [`@toghen/lib`](https://codeberg.org/Toghen/lib), its questions and prints the answers. Every answer is one call to one export of the core, then printing: it computes nothing itself, so what it prints is what the core says.

```sh
npx @toghen/query --doc ds.resolver.json value button.backgroundColor theme=dark
```

```text
{"colorSpace":"srgb","components":[0.1686,0.1686,0.1686],"hex":"#2b2b2b"}
— resolveValue
```

The last line names the export that answered. Give a query on the command line, give none for a prompt, or replay a session: a transcript of queries and answers that is also a test. A one-shot `check` exits 1 when the core finds anything wrong with the tokens, so `toghen-query --doc ds.resolver.json check` can stop a CI step.

## Documentation

- **[guide.md](https://codeberg.org/Toghen/query/src/branch/main/guide.md)**: the three ways in, the query line, the flags, the session format and every command
- **[specs.md](https://codeberg.org/Toghen/query/src/branch/main/specs.md)**: the one rule, the exit codes, printing, and how sessions serve as the spec
- **[sessions/](https://codeberg.org/Toghen/query/src/branch/main/sessions/)**: the transcripts, against the running example of the [model](https://codeberg.org/Toghen/lib/src/branch/main/model.md#the-running-example)

## License

MIT. See [LICENSE](https://codeberg.org/Toghen/query/src/branch/main/LICENSE).
