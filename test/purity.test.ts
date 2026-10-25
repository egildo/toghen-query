/**
 * The one rule, guarded: this package asks the core and computes nothing, so it needs the core alone.
 * It must not import an adapter, and it must not write a CSS or Figma name of its own.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC = `${ROOT}src/`;

describe('purity', () => {
  it('the only dependency is @toghen/lib', () => {
    const manifest = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));
    assert.deepEqual(Object.keys(manifest.dependencies), ['@toghen/lib']);
    assert.deepEqual(Object.keys(manifest.devDependencies).sort(), ['@biomejs/biome', '@types/node', 'tsup', 'tsx', 'typescript']);
    assert.equal(manifest.peerDependencies, undefined);
  });

  for (const word of ['postcss', 'figma', 'culori']) {
    it(`src/ never says '${word}'`, () => {
      for (const file of readdirSync(SRC)) {
        const text = readFileSync(`${SRC}${file}`, 'utf8').toLowerCase();
        assert.equal(text.includes(word), false, `src/${file} mentions '${word}'`);
      }
    });
  }
});
