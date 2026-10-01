import { expect, test, type Page } from '@playwright/test';

const origin = 'http://127.0.0.1:4322';
const sections = [
  ['Get Started', '/get-started/', 'Get Started'],
  ['Understand Groundhog', '/architecture/', 'Introduction'],
  ['CLI', '/cli/', 'CLI'],
  ['Smart Contracts', '/contracts/', 'Smart Contracts'],
  ['TypeScript', '/typescript/', 'TypeScript'],
  ['React', '/react/', 'React'],
  ['Guides', '/guides/', 'Guides'],
] as const;

function sectionGroup(page: Page, label: string) {
  return page.locator('.sidebar .top-level > li > details').filter({
    has: page.locator(':scope > summary').getByText(label, { exact: true }),
  });
}

test('entry pages keep site navigation separate from expandable documentation sections', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const checked = new Set<string>();
  for (const [label, path, title] of [
    ...sections,
    ['Get Started', '/get-started/cli/', 'CLI quickstart'],
    ['Get Started', '/get-started/contract/', 'Contract quickstart'],
    ['Get Started', '/get-started/typescript/', 'TypeScript quickstart'],
    ['Get Started', '/get-started/react/', 'React quickstart'],
    ['CLI', '/cli/install/', 'Install the CLI'],
    ['TypeScript', '/typescript/setup/', 'Package setup'],
    ['Smart Contracts', '/contracts/project-structure/', 'Project structure'],
    ['Tools', '/tools/faucet/', 'Faucet'],
    ['Tools', '/tools/block-explorer/', 'Block Explorer'],
  ]) {
    const response = await page.goto(origin + path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toHaveText(title);
    const navigation = page.locator('header .site-navigation');
    await expect(navigation.getByRole('link')).toHaveText(['About', 'Get Started', 'Documentation', 'Community']);
    await expect(page.locator('.sidebar .top-level > li > details > summary .large')).toHaveText([
      ...sections.map(([name]) => name), 'Tools', 'Reference',
    ]);
    await expect(sectionGroup(page, label)).toHaveAttribute('open', '');
    await expect(sectionGroup(page, label).locator('a[aria-current="page"]')).toHaveAttribute('href', path);
    await expect(page.locator('main .section-context')).toHaveCount(0);

    const links = await page.locator('main a[href^="/"]').evaluateAll(elements =>
      elements.map(element => element.getAttribute('href')!)
    );
    for (const link of new Set(links)) {
      if (checked.has(link)) continue;
      checked.add(link);
      const target = await page.request.get(origin + link);
      expect(target.status(), link).toBe(200);
      const hash = new URL(origin + link).hash.slice(1);
      if (hash) expect(await target.text(), link).toContain(`id="${hash}"`);
    }
  }
});

test('deep links open their section and tutorials belong to Guides', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const [path, label] of [
    ['/reference/storage-types/', 'Smart Contracts'],
    ['/tools/typescript-bindings/', 'TypeScript'],
    ['/tutorials/develop-locally/', 'CLI'],
    ['/start/build-with-an-agent/', 'Get Started'],
    ['/tutorials/connect-a-wallet-to-your-app/', 'Guides'],
    ['/start/for-blockchain-developers/', 'Understand Groundhog'],
    ['/tools/faucet/', 'Tools'],
    ['/tools/block-explorer/', 'Tools'],
  ]) {
    await page.goto(origin + path);
    await expect(sectionGroup(page, label)).toHaveAttribute('open', '');
    await expect(page.locator('.sidebar a[aria-current="page"]')).toHaveAttribute('href', path);
    await expect(page.locator('.sidebar a[aria-current="page"]')).toBeVisible();
  }

  const typescript = sectionGroup(page, 'TypeScript');
  await expect(typescript.locator('a[href="/tutorials/connect-a-wallet-to-your-app/"]')).toHaveCount(0);
  await expect(sectionGroup(page, 'CLI').locator('details')).toHaveCount(0);
  await expect(sectionGroup(page, 'Get Started').locator('a[href="/tools/faucet/"], a[href="/tools/block-explorer/"]')).toHaveCount(0);
  await expect(sectionGroup(page, 'Understand Groundhog').getByRole('link', { name: 'Introduction', exact: true, includeHidden: true })).toHaveCount(1);
  await expect(page.locator('.sidebar .top-level a[href="/start/"]')).toHaveCount(0);

  await page.goto(origin + '/react/');
  await expect(page.locator('.pagination-links a')).toHaveCount(0);
  await page.goto(origin + '/reference/json-rpc-api/');
  await expect(page.locator('.sidebar a[aria-current="page"]')).toHaveAttribute('href', '/reference/json-rpc-api/');
  await expect(page.locator('.sidebar a[aria-current="page"]')).toBeVisible();
  const reference = sectionGroup(page, 'Reference');
  await expect(reference.getByRole('link', { name: 'TypeScript Client API', exact: true }))
    .toHaveAttribute('href', 'https://client-ts.thruput.network/');
  await expect(reference.getByRole('link', { name: 'TypeScript Protocol API', exact: true }))
    .toHaveAttribute('href', 'https://protocol-ts.thruput.network/');
});

test('sidebar disclosures work with keyboard and mobile links close the menu', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto(origin + '/cli/');
  const contracts = sectionGroup(page, 'Smart Contracts');
  await expect(contracts).not.toHaveAttribute('open', '');
  await contracts.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await expect(contracts).toHaveAttribute('open', '');
  await expect(page).toHaveURL(origin + '/cli/');
  await page.keyboard.press('Tab');
  await expect(contracts.getByRole('link', { name: 'Overview', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(origin + '/contracts/');
  await page.screenshot({ path: testInfo.outputPath('sidebar-desktop.png'), fullPage: false });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const typescript = sectionGroup(page, 'TypeScript');
  await typescript.locator(':scope > summary').click();
  await expect(typescript).toHaveAttribute('open', '');
  await typescript.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(page).toHaveURL(origin + '/typescript/');
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(sectionGroup(page, 'TypeScript')).toHaveAttribute('open', '');
  await expect(sectionGroup(page, 'TypeScript').locator('a[aria-current="page"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sidebar-mobile.png'), fullPage: false });
});

test('the old Start Here URL reaches the single introduction', async ({ page }) => {
  await page.goto(origin + '/start/');
  await expect(page).toHaveURL(origin + '/architecture/');
  await expect(page.locator('main h1')).toHaveText('Introduction');
});

test('the old getting-started URL reaches the contract quickstart', async ({ page }) => {
  await page.goto(origin + '/start/getting-started/');
  await expect(page).toHaveURL(origin + '/get-started/contract/');
  await expect(page.locator('main h1')).toHaveText('Contract quickstart');
});

test('a deep link reveals its active page after another section was collapsed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(origin + '/typescript/');
  await sectionGroup(page, 'TypeScript').locator(':scope > summary').click();
  await expect(sectionGroup(page, 'TypeScript')).not.toHaveAttribute('open', '');
  await page.goto(origin + '/tools/typescript-bindings/');
  await expect(page.locator('.sidebar a[aria-current="page"]')).toBeVisible();
});
