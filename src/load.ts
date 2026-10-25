/**
 * Loading: a resolver document, or bare token files, through the core's `load`, then one build.
 * Nothing here reads a token. It hands the core a file reader and takes what the core builds.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { load, Resolver, type Collection, type DesignSystem, type LoadResult } from '@toghen/lib';

export interface Source {
  /** A resolver document. */
  doc?: string;
  /** Bare token files, which the core wraps in a one-set resolver document named after their folder. */
  tokens?: string[];
  /** `sum`, `product`, or `modifier=context,…` for one context. */
  build?: string;
  /** An overrides map: a JSON file, handed to the core's `load` as it is. */
  overrides?: string;
}

export interface Loaded {
  resolver: Resolver;
  system: DesignSystem;
  /** The one collection the build makes. A query's path leaves its name out, and the core puts it back. */
  collection: Collection;
  /** What the core's `load` returned: the reads, the map's hash and unused keys, the collisions. */
  load: LoadResult;
  /** The folder of the document or the first token file: the paths `load` returns are printed relative to it. */
  folder: string;
}

const read = (location: string) => readFile(location, 'utf8');

export async function loadSource({ doc, tokens, build = 'sum', overrides }: Source): Promise<Loaded> {
  const entry = doc ? resolve(doc) : tokens?.length ? tokens.map((file) => resolve(file)) : undefined;
  if (!entry) throw new Error('Give a resolver document with --doc, or token files with --tokens.');
  const map = overrides === undefined ? undefined : JSON.parse(await read(resolve(overrides)));
  const result = await load(entry, { read, overrides: map });

  const resolver = new Resolver(result.document);
  const system =
    build === 'sum'
      ? resolver.resolveContextsToDesignSystem()
      : build === 'product'
        ? resolver.resolveAllToDesignSystem()
        : resolver.resolveToDesignSystem(pairsOf(build.split(',')));
  const [name] = system.getCollectionNames();
  return { resolver, system, collection: system.getCollection(name)!, load: result, folder: dirname([entry].flat()[0]) };
}

/** `['theme=dark', 'density=compact']` as `{ theme: 'dark', density: 'compact' }`. */
export function pairsOf(pairs: string[]): Record<string, string> {
  return Object.fromEntries(pairs.map((pair) => pair.split('=') as [string, string]));
}
