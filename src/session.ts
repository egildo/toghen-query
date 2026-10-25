/**
 * Sessions: a transcript that is also the test.
 *
 *     @doc fixtures/broken.resolver.json     source lines: where the document is, which map, which build
 *     @build product
 *
 *     # a comment, kept with the query beneath it
 *     > value button.backgroundColor         a query
 *     {"colorSpace":"srgb",…}                the answer: every line until the next `>`, `#`, blank line or end
 *     — resolveValue
 *
 *     @overrides other.overrides.json        a run of source lines between blocks: a new load for what follows
 *
 * A path in a source line is relative to the session file, or, starting with `@`, a package path such as
 * `@toghen/lib/example/ds.resolver.json`, which names the file where the package is installed.
 *
 * `replay` runs each query and writes the transcript again, in one form: blocks separated by a blank line, source
 * lines where they stood. A session on disk is true when it equals its replay. `UPDATE_SESSIONS=1` writes the replay
 * over it.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSource, type Loaded, type Source } from './load.js';
import { ask, render } from './query.js';

/** The running example, the document a session asks about until a source line names another. */
export const EXAMPLE = fileURLToPath(import.meta.resolve('@toghen/lib/example/ds.resolver.json'));

type Item =
  | { kind: 'comment'; text: string }
  | { kind: 'source'; text: string }
  | { kind: 'break' }
  | { kind: 'query'; line: string; answer: string[] };

export interface Session {
  items: Item[];
}

export function parseSession(text: string): Session {
  const session: Session = { items: [] };
  let current: (Item & { kind: 'query' }) | undefined;
  for (const line of text.split('\n')) {
    if (line.trim() === '') {
      // an answer has no blank line, so a blank line ends it
      current = undefined;
      // a blank line after a comment or a source line keeps it apart from what follows
      const last = session.items.at(-1)?.kind;
      if (last === 'comment' || last === 'source') session.items.push({ kind: 'break' });
      continue;
    }
    if (line === '>' || line.startsWith('> ')) {
      current = { kind: 'query', line: line.slice(2), answer: [] };
      session.items.push(current);
    } else if (line === '#' || line.startsWith('# ')) {
      current = undefined;
      session.items.push({ kind: 'comment', text: line });
    } else if (line.startsWith('@') && !current) {
      session.items.push({ kind: 'source', text: line });
    } else if (current) {
      current.answer.push(line);
    } else {
      throw new Error(`A line of a session is a query ('> '), a comment ('# '), a source line ('@') or an answer beneath a query: ${line}`);
    }
  }
  return session;
}

/**
 * The source after a run of source lines, paths relative to the session file. A run that names a document or token
 * files starts again from the build alone, so the source and the map before it are cleared unless the run restates
 * them. A run of `@overrides` or `@build` alone changes that line and keeps the rest.
 */
function sourceAfter(source: Source, run: string[], file: string): Source {
  const at = (value: string) => (value.startsWith('@') ? fileURLToPath(import.meta.resolve(value)) : resolve(dirname(file), value));
  const next: Source = run.some((line) => /^@(doc|tokens)(\s|$)/.test(line)) ? { build: source.build } : { ...source };
  for (const line of run) {
    const [name, ...rest] = line.split(/\s+/);
    const value = rest.join(' ');
    if (name === '@doc') Object.assign(next, { doc: at(value), tokens: undefined });
    else if (name === '@tokens') Object.assign(next, { doc: undefined, tokens: [...(next.tokens ?? []), ...rest.map(at)] });
    else if (name === '@overrides') next.overrides = at(value);
    else if (name === '@build') next.build = value;
    else throw new Error(`Unknown source line in ${file}: ${line}`);
  }
  return next;
}

/** The session again, every answer as the core gives it now. */
export async function replay(file: string, fallback: Source = {}): Promise<string> {
  const session = parseSession(await readFile(file, 'utf8'));
  let source = fallback;
  let run: string[] = [];
  let loaded: Loaded | undefined;
  const blocks: string[][] = [];
  let block: string[] = [];
  for (const item of session.items) {
    if (item.kind !== 'source' && run.length) {
      source = sourceAfter(source, run, file);
      loaded = undefined;
      run = [];
    }
    if (item.kind === 'break') {
      if (block.length) blocks.push(block);
      block = [];
    } else if (item.kind === 'comment' || item.kind === 'source') {
      if (item.kind === 'source') run.push(item.text);
      block.push(item.text);
    } else {
      loaded ??= await loadSource(source.doc || source.tokens ? source : { ...source, doc: EXAMPLE });
      block.push(`> ${item.line}`, ...render(ask(loaded, item.line), false));
      blocks.push(block);
      block = [];
    }
  }
  if (block.length) blocks.push(block);
  return `${blocks.map((b) => b.join('\n')).join('\n\n')}\n`;
}
