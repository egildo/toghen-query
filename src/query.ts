/**
 * One query line in, one answer out: split the line, find the command and its form, make its one call, print.
 */

import { commands, formOf, messageOf, type Args, type Command, type Form } from './commands.js';
import type { Loaded } from './load.js';
import { table } from './print.js';

/** A query line as words. The first is the command, the first word that is not a pair is the path. */
export function parseQuery(line: string): { word: string; args: Args } {
  const [word = '', ...words] = line.trim().split(/\s+/);
  const pairs = words.filter((w) => w.includes('='));
  const [path, ...rest] = words.filter((w) => !w.includes('='));
  return { word, args: { path, rest, pairs } };
}

/** The commands as a table, one line for each form: what `help` prints. */
export const helpLines = (): string[] =>
  table(commands.flatMap((c) => c.forms.map((f) => [f.usage, `questions ${c.questions.join(', ')}`, f.export])));

export interface Answer {
  command?: Command;
  form?: Form;
  /** The lines of the answer, with no export line. */
  lines: string[];
  /** The answer in a shape for JSON. */
  data?: unknown;
  kind: 'answer' | 'error' | 'usage' | 'unknown';
}

export function ask(loaded: Loaded, line: string): Answer {
  const { word, args } = parseQuery(line);
  if (word === 'help') return { lines: helpLines(), kind: 'usage' };
  const command = commands.find((c) => c.word === word);
  if (!command) return { lines: [`unknown command '${word}'. Try help.`], kind: 'unknown' };
  const form = formOf(command, args);
  const usage = command.forms.map((f) => `usage: ${f.usage}`);
  if (!form || (command.path && args.path === undefined)) return { command, lines: usage, kind: 'usage' };
  try {
    const data = form.run(loaded, args);
    return { command, form, lines: form.print(data, loaded), data, kind: 'answer' };
  } catch (error) {
    return { command, form, lines: [`error: ${messageOf(error).join(' ')}`], data: messageOf(error).join(' '), kind: 'error' };
  }
}

/**
 * The exit code of a one-shot query: 1 when the core threw, the line was not a query it can ask, or the form says the
 * answer is a failure (`check` listing anything); 0 otherwise, `help` included. It reads the kind of answer, nothing more.
 */
export const exitCodeOf = (answer: Answer, line: string): number =>
  answer.kind === 'answer'
    ? answer.form?.fails?.(answer.data)
      ? 1
      : 0
    : answer.kind === 'usage' && parseQuery(line).word === 'help'
      ? 0
      : 1;

/** An answer as the lines a session or a terminal shows: the answer, then the export that gave it. */
export function render(answer: Answer, json: boolean): string[] {
  const { command, form } = answer;
  if (json) {
    if (!command || !form) return [JSON.stringify({ [answer.kind]: answer.lines.join(' ') })];
    const body = answer.kind === 'error' ? { error: answer.data } : { answer: answer.data };
    return [JSON.stringify({ questions: command.questions, export: form.export, ...body })];
  }
  return form ? [...answer.lines, `— ${form.export}`] : answer.lines;
}
