import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { sections, sectionForPath } from '../src/navigation.ts';
import { legacyDocsRoutes } from './legacy-docs-routes.mjs';

test('every published documentation page has exactly one sidebar owner', () => {
  const root = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
  const pages = readdirSync(root, { recursive: true })
    .filter(path => /\.mdx?$/.test(path))
    .map(path => path.replace(/\.mdx?$/, '').replace(/\/index$/, ''));
  const entries = sections.flatMap(section => section.items.flatMap(item =>
    typeof item === 'string' ? [item] : 'items' in item ? item.items : []
  ));

  assert.equal(new Set(entries).size, entries.length, 'A page cannot belong to multiple sidebars');
  assert.deepEqual([...entries].sort(), [...pages].sort(), 'Missing pages or stale sidebar entries');
  for (const page of pages) {
    assert.ok(sectionForPath(`/${page}/`), `Missing section for ${page}`);
  }
});

test('canonical deep links resolve to their sidebar section', () => {
  assert.equal(sectionForPath('/contracts/reference/storage-types/')?.id, 'contracts');
  assert.equal(sectionForPath('/reference/json-rpc-api/')?.id, 'reference');
  assert.equal(sectionForPath('/tutorials/connect-a-wallet-to-your-app/')?.id, 'tutorials');
  assert.equal(sectionForPath('/get-started/build-with-an-agent/')?.id, 'get-started');
  assert.equal(sectionForPath('/tools/faucet/')?.id, 'tools');
  assert.equal(sectionForPath('/tools/block-explorer/')?.id, 'tools');
  assert.equal(sectionForPath('/cli/reference/')?.id, 'cli');
  assert.equal(sectionForPath('/contracts/errors/')?.id, 'contracts');
  assert.equal(sectionForPath('/tutorials/build-a-counter/')?.id, 'tutorials');
  assert.equal(sectionForPath('/react')?.id, 'react');
  assert.equal(sectionForPath('/react/wallets/')?.id, 'react');
  assert.equal(sectionForPath('/reactive/'), undefined);
  assert.equal(sectionForPath('/'), undefined);
});

test('page URLs follow the full sidebar hierarchy', () => {
  for (const section of sections) {
    assert.ok(section.href.startsWith(`/${section.id}/`));
    for (const item of section.items) {
      if (typeof item === 'string') {
        assert.ok(item === section.id || item.startsWith(`${section.id}/`), item);
        assert.ok(item.split('/').length <= 2, `Unexpected group in ${item}`);
      } else if ('items' in item) {
        for (const page of item.items) {
          assert.ok(page.startsWith(`${section.id}/${item.directory}/`), page);
          assert.equal(page.split('/').length, 3, page);
        }
      }
    }
  }
});

test('legacy aliases point directly to published pages, without collisions or chains', () => {
  const pages = new Set(sections.flatMap(section => section.items.flatMap(item =>
    typeof item === 'string' ? [item] : 'items' in item ? item.items : []
  )));
  for (const [from, to] of Object.entries(legacyDocsRoutes)) {
    assert.ok(!pages.has(from), `Alias shadows a page: ${from}`);
    assert.ok(pages.has(to), `Missing redirect destination: ${to}`);
    assert.ok(!Object.hasOwn(legacyDocsRoutes, to), `Redirect chain: ${from}`);
  }
});

test('tutorials and guides own their ordered pages at hosted and snapshot paths', () => {
  const expected = {
    tutorials: ['tutorials', 'tutorials/build-a-counter', 'tutorials/work-with-thruput-from-typescript',
      'tutorials/build-a-counter-with-react', 'tutorials/connect-a-wallet-to-your-app'],
    guides: ['guides', 'guides/build-a-token', 'guides/build-an-amm', 'guides/consume-the-firehose'],
  };
  assert.equal(sections.findIndex(section => section.id === 'guides'),
    sections.findIndex(section => section.id === 'tutorials') + 1);
  for (const [id, pages] of Object.entries(expected)) {
    assert.deepEqual(sections.find(section => section.id === id)?.items, pages);
    for (const page of pages) {
      for (const prefix of ['', '/docs']) {
        assert.equal(sectionForPath(`${prefix}/${page}/`)?.id, id);
      }
    }
  }
});
