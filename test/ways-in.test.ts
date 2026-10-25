/**
 * The three ways in, and the two ways to load, run as a person runs them: the command, as a process.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAIN = fileURLToPath(new URL('../src/main.ts', import.meta.url));
const EXAMPLE = `${dirname(fileURLToPath(import.meta.resolve('@toghen/lib/example/ds.resolver.json')))}/`;
const SESSIONS = fileURLToPath(new URL('../sessions/', import.meta.url));

const run = (args: string[], input?: string) =>
  spawnSync(process.execPath, ['--import', 'tsx/esm', MAIN, ...args], { encoding: 'utf8', input });

describe('the ways in', () => {
  it('one-shot: a query on the command line', () => {
    const { stdout, status } = run(['--doc', `${EXAMPLE}ds.resolver.json`, 'type', 'button.backgroundColor']);
    assert.equal(status, 0);
    assert.equal(stdout, 'color\n— resolveToken\n');
  });

  it('one-shot with --json: one line, with the questions and the export', () => {
    const { stdout } = run(['--doc', `${EXAMPLE}ds.resolver.json`, '--json', 'type', 'button.backgroundColor']);
    assert.deepEqual(JSON.parse(stdout), { questions: [12, 13], export: 'resolveToken', answer: 'color' });
  });

  it('a word no form has prints the usage of the command, and no export', () => {
    const { stdout } = run(['--doc', `${EXAMPLE}ds.resolver.json`, 'value', 'button.backgroundColor', 'sideways']);
    assert.match(stdout, /^usage: value <path> \[modifier=context …\]\n/);
    assert.doesNotMatch(stdout, /— /);
  });

  it('the prompt: one query a line until exit', () => {
    const { stdout, status } = run(
      ['--doc', `${EXAMPLE}ds.resolver.json`],
      'type button.color\n# a comment\ntype button.font\nexit\ntype button.paddingBlock\n',
    );
    assert.equal(status, 0);
    assert.equal(stdout, 'color\n— resolveToken\ntypography\n— resolveToken\n');
  });

  it('a session: replayed, and exit code 0 when it is true', () => {
    const { status } = run(['--session', `${SESSIONS}parts.session`]);
    assert.equal(status, 0);
  });

  it('bare token files: wrapped in a one-set document, in memory', () => {
    const { stdout } = run([
      '--tokens',
      `${EXAMPLE}roles.tokens.json`,
      '--tokens',
      `${EXAMPLE}button.tokens.json`,
      'refs',
      'button.backgroundColor',
    ]);
    assert.equal(stdout, '(whole value) -> example.surface.raised\n— referencesOf\n');
  });

  it('--build: one context as a one-mode system', () => {
    const { stdout } = run(['--doc', `${EXAMPLE}ds.resolver.json`, '--build', 'theme=dark', 'value', 'surface.raised']);
    assert.equal(stdout, '{"colorSpace":"srgb","components":[0.1686,0.1686,0.1686],"hex":"#2b2b2b"}\n— resolveValue\n');
  });

  it('--overrides: a map read as JSON and handed to load, its values resolved by the core', () => {
    const { stdout } = run([
      '--doc',
      `${EXAMPLE}ds.resolver.json`,
      '--overrides',
      `${EXAMPLE}warm.overrides.json`,
      'value',
      'surface.accent',
    ]);
    assert.equal(stdout, '{"colorSpace":"srgb","components":[0.902,0.4,0.102],"hex":"#e6661a"}\n— resolveValue\n');
  });

  it('no document: says what to give, exit code 2', () => {
    const { stderr, status } = run(['type', 'button.color']);
    assert.equal(status, 2);
    assert.match(stderr, /--doc/);
  });
});

describe('the exit code of a one-shot query', () => {
  const doc = ['--doc', `${EXAMPLE}ds.resolver.json`];
  const fixture = (name: string) => ['--doc', `${SESSIONS}fixtures/${name}`];

  it('0 for an answer', () => {
    assert.equal(run([...doc, 'type', 'button.backgroundColor']).status, 0);
  });

  it('0 for a check that lists nothing', () => {
    const { stdout, status } = run([...doc, 'check']);
    assert.match(stdout, /^incomplete: \(none\)\nholes: \(none\)\nnon-factorable: \(none\)\n/);
    assert.equal(status, 0);
  });

  it('1 for a check whose collection check lists anything', () => {
    const { stdout, status } = run([...fixture('broken.resolver.json'), 'check']);
    assert.match(stdout, /^incomplete:\n {2}card\.glow/);
    assert.equal(status, 1);
  });

  it('1 for a check with --json, as for plain text', () => {
    assert.equal(run([...fixture('broken.resolver.json'), '--json', 'check']).status, 1);
  });

  it('0 for a check that lists only collisions, which load reports as advice', () => {
    const { stdout, status } = run([...fixture('defects.resolver.json'), 'check']);
    assert.match(stdout, /collisions:\n {2}legacy\.old in set base/);
    assert.equal(status, 0);
  });

  it("1 for the core's error", () => {
    const { stdout, status } = run([...fixture('broken.resolver.json'), 'value', 'card.border']);
    assert.match(stdout, /^error: Unresolvable reference/);
    assert.equal(status, 1);
  });

  it('1 for a usage error, and for a word no command has', () => {
    assert.equal(run([...doc, 'value']).status, 1);
    assert.equal(run([...doc, 'value', 'button.backgroundColor', 'sideways']).status, 1);
    assert.equal(run([...doc, 'frobnicate']).status, 1);
  });

  it('0 for help, which is answered as a usage and is not one', () => {
    const { stdout, status } = run([...doc, 'help']);
    assert.match(stdout, /^value <path>/m);
    assert.equal(status, 0);
  });

  it('0 for the prompt, whatever it answered', () => {
    const { stdout, status } = run([...fixture('broken.resolver.json')], 'check\nvalue card.border\nfrobnicate\n');
    assert.match(stdout, /error: Unresolvable reference/);
    assert.equal(status, 0);
  });
});
