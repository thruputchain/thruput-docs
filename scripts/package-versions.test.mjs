import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages } from './cli-commands.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('docs pin one version of each @thruputchain package', () => {
  const versions = {};
  for (const page of pages(join(root, 'src/content/docs'))) {
    const text = readFileSync(page, 'utf8');
    for (const [, name, version] of text.matchAll(/(@thruputchain\/[a-z-]+)(?:@|`? `?)v?(\d+\.\d+\.\d+(?:-[\w.]+)?)/g)) {
      (versions[name] ??= {})[version] ??= [];
      versions[name][version].push(relative(root, page));
    }
  }
  const mixed = Object.entries(versions).filter(([, found]) => Object.keys(found).length > 1);
  assert.deepEqual(mixed, [], 'Pages pin different versions of the same package');
});
