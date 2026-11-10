import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { legacyDocsRoutes } from './legacy-docs-routes.mjs';

const binary = process.argv[2];
if (!binary) throw new Error('Usage: node scripts/smoke-host-routing.mjs /path/to/caddy');
const listener = createServer();
listener.listen(0, '127.0.0.1');
await once(listener, 'listening');
const port = listener.address().port;
await new Promise(done => listener.close(done));
const env = { ...process.env, PORT: String(port), SITE_ROOT: resolve('dist') };
execFileSync(binary, ['validate', '--config', 'Caddyfile', '--adapter', 'caddyfile'], { env, stdio: 'pipe' });
const server = spawn(binary, ['run', '--config', 'Caddyfile', '--adapter', 'caddyfile'], { env, stdio: 'ignore' });
const stopped = once(server, 'exit');
const origin = `http://127.0.0.1:${port}`;
const request = (host, path) => new Promise((done, fail) => {
  const req = httpRequest(origin + path, { headers: { Host: host } }, response => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', chunk => { body += chunk; });
    response.on('end', () => done({ status: response.statusCode,
      headers: { get: name => response.headers[name] }, text: async () => body }));
  });
  req.on('error', fail);
  req.end();
});
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await request('thruput.network', '/health')).status === 200) break; } catch {}
    await new Promise(done => setTimeout(done, 50));
  }
  for (const host of ['thruput.network', 'www.thruput.network', 'docs.thruput.network', 'docs.groundhog.dev']) {
    assert.equal((await request(host, '/health')).status, 200);
    assert.equal((await request(host, '/')).status, host === 'www.thruput.network' ? 200 : 308);
  }
  for (const [host, path, destination] of [
    ['thruput.network', '/?via=apex', '/?via=apex'],
    ['thruput.network', '/docs/cli/install/?via=apex', '/docs/cli/install/?via=apex'],
    ['docs.thruput.network', '/?via=old', '/docs/?via=old'],
    ['docs.thruput.network', '/cli/install/?via=old', '/docs/cli/install/?via=old'],
    ['docs.groundhog.dev', '/programming-model/advanced/?via=old', '/docs/programming-model/advanced/?via=old'],
    ['docs.thruput.network', '/docs/get-started/', '/docs/get-started/'],
    ['docs.thruput.network', '/markdown/pages/cli/install.md', '/markdown/pages/cli/install.md'],
    ['docs.thruput.network', '/agents/historical.json', '/agents/historical.json'],
  ]) {
    const response = await request(host, path);
    assert.equal(response.status, 308, `${host}${path}`);
    assert.equal(response.headers.get('location'), 'https://www.thruput.network' + destination);
  }
  const home = await request('www.thruput.network', '/');
  for (const [from, to] of Object.entries(legacyDocsRoutes)) {
    for (const host of ['www.thruput.network', 'thruput.network', 'docs.thruput.network', 'docs.groundhog.dev']) {
      for (const prefix of ['', '/docs']) {
        for (const slash of ['', '/']) {
          const path = `${prefix}/${from}${slash}?via=legacy&value=a%20b`;
          const response = await request(host, path);
          assert.equal(response.status, 301, `${host}${path}`);
          assert.equal(response.headers.get('location'), `https://www.thruput.network/docs/${to}/?via=legacy&value=a%20b`);
        }
      }
    }
    assert.equal((await request('www.thruput.network', `/docs/${to}/`)).status, 200, to);
    const markdown = await request('www.thruput.network', `/markdown/pages/${from}.md?via=agent`);
    assert.equal(markdown.status, 301, from);
    assert.equal(markdown.headers.get('location'), `https://www.thruput.network/markdown/pages/${to}.md?via=agent`);
    assert.equal((await request('www.thruput.network', `/markdown/pages/${to}.md`)).status, 200, to);
  }
  assert.equal((await request('www.thruput.network', '/docs-redirects.caddy')).status, 404);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /href="https:\/\/www\.thruput\.network\/"/);
  const docs = await request('www.thruput.network', '/docs/cli/install/');
  assert.equal(docs.status, 200);
  assert.match(docs.headers.get('content-type'), /^text\/html\b/);
  assert.match(await docs.text(), /https:\/\/www\.thruput\.network\/docs\/cli\/install\//);
  assert.equal((await request('www.thruput.network', '/missing-page')).status, 404);
  assert.equal((await request('www.thruput.network', '/markdown/pages/missing-page.md')).status, 404);
  for (const path of ['/markdown/pages/get-started.md', '/markdown/pages/cli/install.md', '/markdown/index.md', '/markdown/full.md', '/agent-guide.md']) {
    const response = await request('www.thruput.network', path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8', path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    assert.ok((await response.text()).includes('# '), path);
  }
  const manifest = await request('www.thruput.network', '/markdown/manifest.json');
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get('content-type'), /^application\/json\b/);

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    await page.goto(origin + '/docs/get-started/');
    const actions = page.locator('page-actions');
    await actions.locator('.copy-page').click();
    await expect(actions.getByRole('status')).toHaveText('Copied');
    const markdown = await (await request('www.thruput.network', '/markdown/pages/get-started.md')).text();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), markdown);
    await actions.locator('summary').click();
    const popupPromise = page.waitForEvent('popup');
    await actions.getByRole('link', { name: 'View Markdown', exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(popup.url(), origin + '/markdown/pages/get-started.md');
    assert.equal(await popup.locator('body').innerText(), markdown);
  } finally {
    await browser.close();
  }
  console.log('Caddy host routing, Markdown headers, clipboard copying, plain-text viewing, and 404 checks passed.');
} finally {
  server.kill('SIGTERM');
  await stopped;
}
