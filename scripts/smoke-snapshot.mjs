import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const binary = process.argv[2];
if (!binary) throw new Error('Usage: node scripts/smoke-snapshot.mjs /path/to/groundhog');
const server = spawn(resolve(binary), ['docs', '--dir', resolve('dist/docs-snapshot'), '--port', '0', '--json'], {
  stdio: ['ignore', 'pipe', 'inherit'],
});
const stopped = once(server, 'exit');
const lines = createInterface({ input: server.stdout });
let timer;
let browser;
try {
  const ready = await Promise.race([
    once(lines, 'line').then(([line]) => JSON.parse(line)),
    stopped.then(([code]) => { throw new Error(`Server exited before readiness: ${code}`); }),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Server readiness timeout')), 15000); }),
  ]);
  clearTimeout(timer);
  const origin = new URL(ready.data.url).origin;
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const externalRequests = [];
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    externalRequests.push(route.request().url());
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.getByRole('complementary', { name: 'Local documentation snapshot' }).waitFor();
  const prompt = await page.locator('textarea[name="agent-prompt"]').inputValue();
  assert.ok(prompt.includes(`${origin}/get-started/contract/`));
  assert.ok(!prompt.includes('https://docs.groundhog.dev'));
  await page.goto(`${origin}/start/`);
  await page.waitForURL(`${origin}/architecture/`);
  assert.equal(await page.locator('main h1').textContent(), 'Introduction');
  for (const [legacy, destination, fragment] of [
    ['tools/groundhog-cli', 'cli/reference', 'configuration'],
    ['reference/error-handling', 'contracts/errors', 'defining-errors'],
    ['reference/cross-contract-calls', 'contracts/cross-contract-calls', 'gas-limits'],
    ['programming-model/advanced', 'programming-model/storage-types', 'lock-requests'],
    ['programming-model/advanced', 'programming-model/nnint', 'negative-set-values'],
  ]) {
    await page.goto(`${origin}/${legacy}/#${fragment}`);
    await page.waitForURL(`${origin}/${destination}/#${fragment}`);
    assert.equal(await page.locator(`[id="${fragment}"]`).count(), 1);
  }
  await page.goto(`${origin}/tutorials/add-events-to-a-contract/#step-5-query-it-on-chain`);
  await page.waitForURL(`${origin}/typescript/events/#query-events`);
  await page.goto(`${origin}/tutorials/develop-locally/#4-start-the-local-node`);
  await page.waitForURL(`${origin}/cli/local-node/#start-the-node`);
  await page.goto(`${origin}/tutorials/build-a-counter/`);
  await page.locator('main h1').waitFor();
  await page.locator('site-search > button').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: /^Search/ }).fill('storage');
  const result = dialog.locator('.pagefind-ui__result-link').first();
  await result.waitFor();
  assert.equal(new URL(await result.getAttribute('href'), origin).origin, origin);
  await result.click();
  await page.locator('main h1').waitFor();
  mkdirSync('test-results/snapshot', { recursive: true });
  await page.screenshot({ path: 'test-results/snapshot/desktop.png', fullPage: false });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'test-results/snapshot/mobile.png', fullPage: false });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const guide = await context.request.get(`${origin}/agent-guide.md`);
  assert.equal(guide.status(), 200);
  assert.ok((await guide.text()).includes('groundhog-cli-version:'));
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  console.log('Snapshot smoke passed: real CLI, tutorial, search navigation, local agent prompt, Markdown guide, desktop/mobile, no external requests.');
} finally {
  clearTimeout(timer);
  await browser?.close();
  lines.close();
  server.kill('SIGTERM');
  await stopped;
}
