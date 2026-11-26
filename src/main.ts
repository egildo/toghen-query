#!/usr/bin/env node
/**
 * toghen-query: three ways to ask the core a question, one loop.
 *
 *     toghen-query --doc ds.resolver.json value button.backgroundColor theme=dark     one query
 *     toghen-query --doc ds.resolver.json                                              a prompt
 *     toghen-query --session sessions/parts.session                                    a transcript, replayed
 */

import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { loadSource } from './load.js';
import { ask, exitCodeOf, render } from './query.js';
import { replay } from './session.js';

const USAGE = `usage: toghen-query [--doc <resolver.json> | --tokens <file> [--tokens <file> …]] [--overrides <map.json>] [--build sum|product|modifier=context,…] [--json] [<query> | --session <file>]
       With no query and no session, a prompt reads one query per line. Type help for the commands.`;

const OPTIONS = {
  doc: { type: 'string' },
  tokens: { type: 'string', multiple: true },
  build: { type: 'string' },
  overrides: { type: 'string' },
  json: { type: 'boolean' },
  session: { type: 'string' },
  help: { type: 'boolean' },
} as const;

/**
 * The flags, and the words of the query: every word from the first that is not a flag on, except a flag this command
 * knows, so `css --surface-raised theme` is a query and a `--json` after it is still a flag. Throws for a usage error.
 */
function argsOf(args: string[]) {
  const { tokens } = parseArgs({ args, options: OPTIONS, allowPositionals: true, strict: false, tokens: true });
  const start = tokens.find((t) => t.kind === 'positional')?.index ?? args.length;
  const words = new Set(
    tokens
      .filter((t) => t.index >= start && (t.kind === 'positional' || (t.kind === 'option' && !Object.hasOwn(OPTIONS, t.name))))
      .map((t) => t.index),
  );
  const { values } = parseArgs({ args: args.filter((_, i) => !words.has(i)), options: OPTIONS });
  if (values.session && words.size) throw new Error('Give a query or --session <file>, not both: a session asks only its own queries.');
  return { values, positionals: args.filter((_, i) => words.has(i)) };
}

async function main(): Promise<number> {
  let parsed: ReturnType<typeof argsOf>;
  try {
    parsed = argsOf(process.argv.slice(2));
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : error}\n${USAGE}`);
    return 1;
  }
  const { values, positionals } = parsed;
  if (values.help) {
    console.log(USAGE);
    return 0;
  }
  const source = { doc: values.doc, tokens: values.tokens, build: values.build, overrides: values.overrides };

  if (values.session) {
    const actual = await replay(values.session, source);
    process.stdout.write(actual);
    return actual === (await readFile(values.session, 'utf8')) ? 0 : 1;
  }

  const loaded = await loadSource(source);
  const print = (line: string) => {
    const answer = ask(loaded, line);
    console.log(render(answer, !!values.json).join('\n'));
    return answer;
  };
  if (positionals.length) {
    const line = positionals.join(' ');
    return exitCodeOf(print(line), line);
  }
  await prompt(print);
  return 0;
}

async function prompt(print: (line: string) => unknown): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.setPrompt(process.stdin.isTTY ? 'query> ' : '');
  rl.prompt();
  for await (const line of rl) {
    const query = line.trim();
    if (query === 'exit' || query === 'quit') break;
    if (query && !query.startsWith('#')) print(query);
    rl.prompt();
  }
  rl.close();
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(`error: ${error instanceof Error ? error.message : error}\n${USAGE}`);
    process.exit(2);
  },
);
