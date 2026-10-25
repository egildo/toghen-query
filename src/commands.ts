/**
 * The command table: nine commands, one entry each, the question set of the core (toghen-lib/specs.md,
 * "The questions the core answers").
 *
 * A command has forms, picked by the word after the path (`value <path> across`, `value <path> how`). Each form is
 * one call to one core export, then printing. Nothing in this file walks a value, slices a path or compares two
 * modes. Three forms read more than one export, and say so in their last line: `system`, which prints the document's
 * plain getters side by side with what `load` said of the map; `check`, which prints `load`'s collisions beside the
 * collection's check; and `value … across`, which calls `resolveValue` once for each mode `getModes` lists.
 */

import { relative } from 'node:path';
import { cssLinkName, cssPropertyName } from '@toghen/lib';
import type { Loaded } from './load.js';
import { pairsOf } from './load.js';
import { indent, linesOrNone, listLine, messageLines, table, valueLines } from './print.js';

/** A query line, split. Nothing is read out of the path. */
export interface Args {
  /** The first word that is not a `name=value` pair. */
  path?: string;
  /** The words after the path that are not pairs: the form, or an attribute's name. */
  rest: string[];
  /** The `name=value` pairs, as written. */
  pairs: string[];
}

/** One way to ask a command: the export that answers, its call, and its printer. */
export interface Form {
  /** The word after the path that picks this form; none for the plain form. */
  word?: string;
  usage: string;
  /** The core export, or exports for the two forms that read several, named in the answer's last line. */
  export: string;
  run: (loaded: Loaded, args: Args) => unknown;
  /** The loaded state comes along for the folder that the paths `load` returns are printed relative to. */
  print: (answer: any, loaded: Loaded) => string[];
  /** Whether the answer is the core saying something is wrong, which a one-shot query exits 1 for. Only `check` has one. */
  fails?: (answer: any) => boolean;
}

export interface Command {
  word: string;
  /** The questions of section 5 of the core review it absorbs. */
  questions: number[];
  /** The command asks about a path, so a line without one is a usage error. */
  path?: true;
  forms: Form[];
}

/** The modifier-and-context words as the one mode name the core reads (`theme=dark density=compact`). */
const modeOf = ({ pairs }: Args) => (pairs.length ? pairs.join(' ') : undefined);

/** What one context of a link says: its own value, the base it carries, a fall-through or a hole. */
const stepLines = (step: any): string[] => {
  if ('fallThrough' in step) return [`falls through to ${step.fallThrough}`];
  if ('hole' in step) return ['hole'];
  const [first, ...more] = valueLines(step.value);
  return [step.base ? `${first} (the base)` : first, ...more];
};

export const commands: Command[] = [
  {
    word: 'system',
    questions: [1, 2, 3, 21, 22, 23],
    forms: [
      {
        usage: 'system',
        export: 'name, getDeclaredVersion, getModifiers, getModes, getDefaultMode, getAllPaths, load',
        run: ({ resolver, collection, load }) => ({
          name: resolver.name,
          version: resolver.getDeclaredVersion(),
          modifiers: resolver.getModifiers(),
          precedence: resolver.getModifiers('precedence').map((m) => m.name),
          modes: collection.getModes(),
          defaultMode: collection.getDefaultMode(),
          tokens: collection.getAllPaths().length,
          overrides: load.overrides && { ...load.overrides, reads: load.reads.filter((r) => r.overridden) },
        }),
        print: (a, { folder }) => [
          `name: ${a.name}`,
          `version: ${a.version ?? '(none declared)'}`,
          ...a.modifiers.map((m: any) => `modifier ${m.name}: ${m.contexts.join(', ')} (default ${m.default ?? 'none'})`),
          `modifiers as declared: ${listLine(a.modifiers.map((m: any) => m.name))}`,
          `modifiers in the order they win, the last winning: ${listLine(a.precedence)}`,
          `modes: ${a.modes.join(', ')}`,
          `default mode: ${a.defaultMode}`,
          `tokens in the default mode: ${a.tokens}`,
          ...(a.overrides
            ? [
                `overrides hash: ${a.overrides.hash}`,
                `overrides unused: ${listLine(a.overrides.unused)}`,
                `overridden: ${a.overrides.reads.length ? '' : '(none)'}`.trimEnd(),
                ...a.overrides.reads.map(
                  (r: any) => `  ${r.ref} in ${relative(folder, r.holder)} read from ${relative(folder, r.location)}`,
                ),
              ]
            : []),
        ],
      },
    ],
  },
  {
    word: 'paths',
    questions: [4, 5, 6, 7, 9, 10],
    forms: [
      {
        usage: 'paths [group] [modifier=context …]',
        export: 'childrenOf',
        run: ({ collection }, args) => collection.childrenOf(args.path ?? '', modeOf(args)),
        print: (children) => linesOrNone(table(children.map((c: any) => [c.kind, c.path]))),
      },
      {
        word: '$',
        usage: 'paths <group> <$attribute> [modifier=context …]',
        export: 'getGroupAttribute',
        run: ({ collection }, args) => collection.getGroupAttribute(args.path ?? '', args.rest[0], modeOf(args)),
        print: (answer) => (answer === null ? ['null'] : valueLines(answer)),
      },
    ],
  },
  {
    word: 'value',
    questions: [8, 11, 14, 15, 25, 26, 27, 28],
    path: true,
    forms: [
      {
        usage: 'value <path> [modifier=context …]',
        export: 'resolveValue',
        run: ({ system }, args) => system.resolveValue(args.path!, modeOf(args)),
        print: valueLines,
      },
      {
        word: 'across',
        usage: 'value <path> across',
        export: 'getModes, resolveValue',
        run: ({ system, collection }, args) => collection.getModes().map((mode) => [mode, system.resolveValue(args.path!, mode)] as const),
        print: (rows) => table(rows.map(([mode, value]: [string, unknown]) => [mode, JSON.stringify(value)])),
      },
      {
        word: 'how',
        usage: 'value <path> how',
        export: 'contextsOf',
        run: ({ resolver }, args) => resolver.contextsOf(args.path!),
        print: (a) => [
          a.path,
          ...Object.entries(a.chains).flatMap(([property, chain]: [string, any]) => [
            `  ${property}`,
            ...chain.links.flatMap((link: any) => [
              `    link ${link.modifier} at ${link.path}`,
              ...Object.entries(link.steps).flatMap(([context, step]) => {
                const [first, ...more] = stepLines(step);
                return [`      ${context}: ${first}`, ...indent(more, '        ')];
              }),
            ]),
            ...(chain.links.length === 0 ? ['    (no links)'] : []),
            `    base: ${valueLines(chain.base)[0]}`,
            `    holes: ${chain.holes.length ? JSON.stringify(chain.holes) : '(none)'}`,
          ]),
          `  generated: ${listLine(a.generated.map((g: any) => g.path))}`,
          `  non-factorable: ${listLine(a.nonFactorable.map((n: any) => `${n.path} ${n.property}`))}`,
        ],
      },
      {
        word: 'how=',
        usage: 'value <path> how modifier=context …',
        export: 'valueAt',
        run: ({ resolver }, args) => resolver.valueAt(args.path!, pairsOf(args.pairs)),
        print: valueLines,
      },
    ],
  },
  {
    word: 'type',
    questions: [12, 13],
    path: true,
    forms: [
      {
        usage: 'type <path> [modifier=context …]',
        export: 'resolveToken',
        run: ({ system }, args) => system.resolveToken(args.path!, modeOf(args))?.$type,
        print: (answer) => [answer || '(none)'],
      },
    ],
  },
  {
    word: 'refs',
    questions: [16, 17, 18, 19, 20, 24],
    path: true,
    forms: [
      {
        usage: 'refs <path> [modifier=context …]',
        export: 'referencesOf',
        run: ({ system }, args) => system.referencesOf(args.path!, modeOf(args)),
        print: (refs) =>
          linesOrNone(refs.map((r: any) => `${r.at === '' ? '(whole value)' : r.at} -> ${r.to}${r.interpolated ? ' (interpolated)' : ''}`)),
      },
      {
        word: 'depends',
        usage: 'refs <path> depends',
        export: 'dependsOn',
        run: ({ resolver }, args) => resolver.dependsOn(args.path!),
        print: (a) => [`direct: ${listLine(a.direct)}`, `through: ${listLine(a.through)}`],
      },
    ],
  },
  {
    word: 'parts',
    questions: [30, 31, 32, 33, 34, 35],
    path: true,
    forms: [
      {
        usage: 'parts <path> [modifier=context …]',
        export: 'partsOf',
        run: ({ collection }, args) => collection.partsOf(args.path!, modeOf(args)),
        print: ({ parts, rest, restExists, component }) => [
          ...table(parts.map((p: any) => ['part', p.at, `${p.key} (${p.axis})`, p.spelling])),
          ...parts.map((p: any) => `twin along ${p.axis}: ${p.twin}${p.twinExists ? '' : ' (not there)'}`),
          `rest: ${rest}${restExists ? '' : ' (not there)'}`,
          `component: ${component ?? '(none)'}`,
        ],
      },
      {
        word: 'vocabulary',
        usage: 'parts <group> vocabulary [modifier=context …]',
        export: 'vocabularyAt',
        run: ({ collection }, args) => collection.vocabularyAt(args.path!, modeOf(args)),
        print: (vocabulary) =>
          linesOrNone(
            Object.entries(vocabulary).flatMap(([axis, values]: [string, any]) => [
              axis,
              ...indent(table(Object.entries(values).map(([key, spelling]) => [key, String(spelling)]))),
            ]),
          ),
      },
      {
        word: 'axes',
        usage: 'parts <group> axes [modifier=context …]',
        export: 'axesOf',
        run: ({ collection }, args) => collection.axesOf(args.path!, modeOf(args)),
        print: (axes) => linesOrNone(axes.map((a: any) => `${a.axis}: ${a.values.join(', ')}`)),
      },
      {
        word: 'group',
        usage: 'parts <group> group [modifier=context …]',
        export: 'partAt',
        run: ({ collection }, args) => collection.partAt(args.path!, modeOf(args)),
        print: (part) =>
          part === null
            ? ['not a part']
            : [`${part.key} (${part.axis})  ${part.spelling}`, `twin: ${part.twin}${part.twinExists ? '' : ' (not there)'}`],
      },
    ],
  },
  {
    word: 'applies',
    questions: [36],
    path: true,
    forms: [
      {
        usage: 'applies <component> [axis=value …]',
        export: 'applies',
        run: ({ collection }, args) => collection.applies(args.path!, pairsOf(args.pairs)),
        print: (answer) => linesOrNone(table(Object.entries(answer).map(([key, path]) => [key, String(path)]))),
      },
    ],
  },
  {
    word: 'check',
    questions: [29],
    forms: [
      {
        usage: 'check',
        export: 'check, load',
        run: ({ collection, load }) => ({ ...collection.check(), collisions: load.collisions }),
        // The core's check lists what is wrong with the tokens; collisions are load's advisory report, and do not fail.
        fails: ({ incomplete, holes, nonFactorable }) => incomplete.length + holes.length + nonFactorable.length > 0,
        print: ({ incomplete, holes, nonFactorable, collisions }, { folder }) => [
          `incomplete: ${incomplete.length ? '' : '(none)'}`.trimEnd(),
          ...incomplete.map((t: any) => `  ${t.path}: no value in ${t.missingModes.join(', ')}`),
          `holes: ${holes.length ? '' : '(none)'}`.trimEnd(),
          ...holes.map(
            (h: any) =>
              `  ${h.path} ${h.property}: ${h.holes
                .map((c: any) =>
                  Object.entries(c)
                    .map(([m, v]) => `${m}=${v}`)
                    .join(' '),
                )
                .join(', ')}`,
          ),
          `non-factorable: ${nonFactorable.length ? '' : '(none)'}`.trimEnd(),
          ...nonFactorable.map((n: any) => `  ${n.path} ${n.property}: ${n.detail}`),
          `collisions: ${collisions.length ? '' : '(none)'}`.trimEnd(),
          ...collisions.map(
            (c: any) =>
              `  ${c.path} in ${c.set === undefined ? `${c.modifier}=${c.context}` : `set ${c.set}`}: ` +
              `${c.files.map((f: string) => relative(folder, f)).join(', ')}${c.redundant ? ' (redundant)' : ''}`,
          ),
        ],
      },
    ],
  },
  {
    word: 'css',
    questions: [37, 38, 39],
    path: true,
    forms: [
      {
        usage: 'css <lookup path>',
        export: 'cssPropertyName',
        run: (_, args) => cssPropertyName(args.path!),
        print: (answer) => [answer],
      },
      {
        word: '--',
        usage: 'css <--property> <modifier>',
        export: 'cssLinkName',
        run: (_, args) => cssLinkName(args.path!, args.rest[0]),
        print: (answer) => [answer],
      },
    ],
  },
];

/**
 * The form a query line asks for: the plain form, or the one the word after the path names (`across`, `how`,
 * `depends`, `vocabulary`, `axes`, `group`), `how` with pairs for the late-bound value, an attribute name starting
 * `$` for `paths`, a modifier for `css`. None, for a word no form has.
 */
export function formOf(command: Command, args: Args): Form | undefined {
  const [word] = args.rest;
  const key =
    word === undefined
      ? undefined
      : word.startsWith('$')
        ? '$'
        : command.word === 'css'
          ? '--'
          : word === 'how' && args.pairs.length > 0
            ? 'how='
            : word;
  return command.forms.find((form) => form.word === key);
}

export const messageOf = (error: unknown): string[] => messageLines(error instanceof Error ? error.message : String(error));
