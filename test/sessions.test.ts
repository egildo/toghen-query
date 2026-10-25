/**
 * Every session under `sessions/`, replayed against the running example (or the documents its source lines name),
 * and compared line for line with the transcript on disk.
 *
 * `UPDATE_SESSIONS=1 pnpm test` writes what the core answers now over the expected answers; read the diff.
 * A session is the spec of this package, and the diff of a core change shows in it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { replay } from '../src/session.js';

const SESSIONS = fileURLToPath(new URL('../sessions/', import.meta.url));
const UPDATE = process.env.UPDATE_SESSIONS === '1';

const files = readdirSync(SESSIONS)
  .filter((name) => name.endsWith('.session'))
  .sort();

describe('the sessions', () => {
  it('there are sessions to replay', () => {
    assert.ok(files.length >= 7, 'sessions/ holds the seven sessions the docs name');
  });

  for (const name of files) {
    it(name, async () => {
      const file = `${SESSIONS}${name}`;
      const actual = await replay(file);
      if (UPDATE) {
        writeFileSync(file, actual);
        return;
      }
      assert.equal(
        actual,
        readFileSync(file, 'utf8'),
        `${name} differs from what the core answers now; run with UPDATE_SESSIONS=1 and read the diff`,
      );
    });
  }
});
