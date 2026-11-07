import { expect, test } from '@playwright/test';

const origin = 'http://127.0.0.1:4322';
const path = '/docs/tutorials/work-with-thruput-from-typescript/';
const markdown = '/markdown/pages/tutorials/work-with-thruput-from-typescript.md';

test('copies directly without opening the menu or shifting the page', async ({ page, context, request }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(origin + path);
  const actions = page.locator('page-actions');
  const copy = actions.getByRole('button', { name: 'Copy page', exact: true });
  await expect(copy).toHaveAccessibleDescription('Copy this page as Markdown');
  const before = await copy.boundingBox();
  const article = await page.locator('.sl-markdown-content').boundingBox();
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect(actions.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await (await request.get(origin + markdown)).text());
  await expect(actions.locator('details')).not.toHaveAttribute('open');
  expect(await actions.locator('.copy-page').boundingBox()).toEqual(before);
  expect(await page.locator('.sl-markdown-content').boundingBox()).toEqual(article);
});

test('provider links use the public Markdown URL and open in a new tab', async ({ page }) => {
  await page.goto(origin + '/docs/get-started/');
  const actions = page.locator('page-actions');
  await actions.locator('summary').click();
  for (const [name, base] of [['ChatGPT', 'https://chatgpt.com/'], ['Claude', 'https://claude.ai/new']]) {
    const link = actions.getByRole('link', { name: `Open in ${name}`, exact: true });
    const url = new URL((await link.getAttribute('href'))!);
    expect(url.origin + url.pathname).toBe(base);
    expect(url.searchParams.get('q')).toContain('“Get Started”');
    expect(url.searchParams.get('q')).toContain('https://www.thruput.network/markdown/pages/get-started.md');
    expect(url.searchParams.get('q')).not.toContain(origin);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAccessibleDescription('Ask about this page (opens in a new tab)');
  }
  const popupPromise = page.waitForEvent('popup');
  await actions.getByRole('link', { name: 'View Markdown', exact: true }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(origin + '/markdown/pages/get-started.md');
  await popup.close();
});

test('short viewport keeps every action reachable after resizing', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto(origin + path);
  const actions = page.locator('page-actions');
  await actions.locator('summary').click();
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 360 });
    await expect.poll(async () => {
      const box = (await actions.locator('.options').boundingBox())!;
      return box.x >= 16 && box.x + box.width <= width - 15 && box.y >= 16 && box.y + box.height <= 345;
    }).toBe(true);
    await actions.getByRole('link', { name: 'Set up your agent', exact: true }).focus();
    await expect(actions.getByRole('link', { name: 'Set up your agent', exact: true })).toBeInViewport();
  }
  await page.keyboard.press('Escape');
  await expect(actions.locator('summary')).toBeFocused();
});

test('direct copy fallback returns focus to the main button', async ({ page, context }) => {
  const session = await context.newCDPSession(page);
  await session.send('Browser.setPermission', { permission: { name: 'clipboard-write' }, setting: 'denied', origin });
  await page.goto(origin + path);
  await page.locator('.copy-page').click();
  await expect(page.getByRole('dialog', { name: 'Copy manually' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.copy-page')).toBeFocused();
});

for (const name of ['cli', 'contract', 'typescript', 'react']) {
  test(`copies the ${name} quickstart prompt from its coding-agent section`, async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${origin}/docs/get-started/${name}/`);
    const prompt = await page.locator('#use-a-coding-agent').evaluate(heading => {
      const section = heading.closest('.sl-heading-wrapper') ?? heading;
      for (let node = section.nextElementSibling; node; node = node.nextElementSibling) {
        const code = node.querySelector('pre code');
        if (code) return [...code.querySelectorAll('.ec-line .code')].map(line => line.textContent).join('\n');
      }
      return '';
    });
    expect(prompt).toContain(`/docs/get-started/${name}/`);
    await page.locator('page-actions summary').click();
    await page.getByRole('button', { name: 'Copy task prompt' }).click();
    await expect(page.locator('page-actions').getByRole('status')).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(prompt);
  });
}

test('copies the exported page, Markdown link, and existing task prompt', async ({ page, context, request }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(origin + path);
  const actions = page.locator('page-actions');
  const response = await request.get(origin + markdown);
  expect(response.ok()).toBe(true);
  const exported = await response.text();
  expect(exported).toContain('Source: <https://www.thruput.network' + path + '>');
  expect(exported).toContain('thruput codegen ts');
  expect(exported).not.toContain('Copy page');
  const more = actions.locator('summary');
  await expect(more).toHaveAccessibleName('More page actions');
  const article = page.locator('.sl-markdown-content');
  const before = await article.boundingBox();
  await more.click();
  const menuBefore = await actions.locator('.options').boundingBox();
  await actions.locator('.options').getByRole('button', { name: 'Copy page', exact: true }).click();
  await expect(actions.getByRole('status')).toHaveText('Copied');
  await expect(actions.locator('.options [data-copy="page"] [data-label]')).toHaveText('Copied');
  expect((await actions.locator('.options').boundingBox())!.height).toBe(menuBefore!.height);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(exported);
  expect((await article.boundingBox())!.y).toBe(before!.y);
  await actions.getByRole('button', { name: 'Copy Markdown link' }).click();
  await expect(actions.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(origin + markdown);
  await expect(actions.locator('[data-copy="link"]')).toBeFocused();
  await expect(actions.locator('[data-copy="link"] [data-label]')).toHaveText('Copied');
  await expect(actions.locator('.options [data-copy="page"] [data-label]')).toHaveText('Copy page');
  await actions.getByRole('button', { name: 'Copy task prompt' }).click();
  await expect(actions.getByRole('status')).toHaveText('Copied');
  const prompt = await page.locator('#work-with-an-agent').evaluate(heading => {
    const section = heading.closest('.sl-heading-wrapper') ?? heading;
    const code = section.nextElementSibling!.querySelector('code')!;
    return [...code.querySelectorAll('.ec-line .code')].map(line => line.textContent).join('\n');
  });
  expect(prompt).toContain('Generate the binding from my part-1 contract spec');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(prompt);
  await expect(actions.locator('[data-copy="prompt"] [data-label]')).toHaveText('Copied');
  await expect(actions.locator('[data-copy="prompt"] [data-label]')).toHaveText('Copy task prompt');
  await expect(actions.getByRole('link', { name: 'View Markdown' })).toHaveAttribute('href', markdown);
  await expect(actions.getByRole('link', { name: 'Set up your agent' })).toHaveAttribute('href', '/docs/start/build-with-an-agent/');
  await page.goto(origin + '/docs/typescript/reads/');
  await page.locator('page-actions summary').click();
  await expect(page.getByRole('button', { name: 'Copy task prompt' })).toHaveCount(0);
});

test('clipboard denial offers selected text and restores focus after closing', async ({ page, context, request }) => {
  const session = await context.newCDPSession(page);
  await session.send('Browser.setPermission', { permission: { name: 'clipboard-write' }, setting: 'denied', origin });
  await page.goto(origin + path);
  await page.locator('page-actions summary').click();
  const copy = page.locator('.options').getByRole('button', { name: 'Copy page', exact: true });
  await copy.click();
  const dialog = page.getByRole('dialog', { name: 'Copy manually' });
  await expect(dialog).toBeVisible();
  const text = dialog.getByRole('textbox', { name: 'Text to copy' });
  const exported = await (await request.get(origin + markdown)).text();
  await expect(text).toBeFocused();
  await expect(text).toHaveValue(exported);
  expect(await text.evaluate((element: HTMLTextAreaElement) => element.value.slice(element.selectionStart, element.selectionEnd))).toBe(exported);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('page-actions summary')).toBeFocused();
});

for (const width of [320, 800, 1280]) {
test(`failed Markdown fetch preserves layout and allows retry at ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 900 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(origin + path);
  await page.route('**' + markdown, route => route.fulfill({ status: 503, body: 'Unavailable' }));
  const actions = page.locator('page-actions');
  const headingBefore = await page.locator('.page-heading').boundingBox();
  const articleBefore = await page.locator('.sl-markdown-content').boundingBox();
  const buttonBefore = await actions.locator('.copy-page').boundingBox();
  await actions.locator('.copy-page').click();
  await expect(actions.locator('.copy-page')).toHaveText('Copy page');
  await expect(actions.locator('.copy-page')).not.toHaveAttribute('aria-disabled');
  await expect(actions.getByRole('status')).toBeEmpty();
  await expect(actions.locator('details')).not.toHaveAttribute('open');
  await expect(actions.getByRole('dialog')).not.toBeVisible();
  expect(await page.locator('.page-heading').boundingBox()).toEqual(headingBefore);
  expect(await page.locator('.sl-markdown-content').boundingBox()).toEqual(articleBefore);
  expect(await actions.locator('.copy-page').boundingBox()).toEqual(buttonBefore);
  await page.unroute('**' + markdown);
  await actions.locator('.copy-page').click();
  await expect(actions.getByRole('status')).toHaveText('Copied');
});
}

for (const width of [320, 768, 1280]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`page actions at ${width}px in ${theme} support keyboard and fit the viewport`, async ({ page, context }, info) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(origin + path);
      const actions = page.locator('page-actions');
      const more = actions.locator('summary');
      const before = await page.locator('.sl-markdown-content').boundingBox();
      await more.focus();
      await page.keyboard.press('Enter');
      await expect(actions.getByRole('link', { name: 'View Markdown' })).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(actions.locator('.options').getByRole('button', { name: 'Copy page', exact: true })).toBeFocused();
      const box = await actions.locator('.options').boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(900);
      expect(await actions.locator('.options').evaluate(element => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + 24));
      })).toBe(true);
      await page.screenshot({ path: info.outputPath('page-actions.png') });
      await actions.locator('.options').getByRole('button', { name: 'Copy page', exact: true }).click();
      await expect(actions.getByRole('status')).toHaveText('Copied');
      expect((await page.locator('.sl-markdown-content').boundingBox())!.y).toBe(before!.y);
      await page.keyboard.press('Escape');
      await expect(more).toBeFocused();
      await expect(actions.getByRole('link', { name: 'View Markdown' })).not.toBeVisible();
      await more.click();
      await page.locator('h1').click();
      await expect(actions.getByRole('link', { name: 'View Markdown' })).not.toBeVisible();
    });
  }
}

test('Markdown and setup links work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(origin + path);
    const actions = page.locator('page-actions');
    await expect(actions.locator('.copy-page')).not.toBeVisible();
    await actions.locator('summary').click();
    await expect(actions.getByRole('button', { name: 'Copy Markdown link' })).not.toBeVisible();
    await expect(actions.getByRole('link', { name: 'View Markdown' })).toBeVisible();
    await actions.getByRole('link', { name: 'Set up your agent' }).click();
    await expect(page).toHaveURL(origin + '/docs/start/build-with-an-agent/');
  } finally { await context.close(); }
});
