import { expect, test } from '@playwright/test';

test('hill tea hut has a visible front and a reachable visit prompt', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.TOGETHER_E2E_URL ?? 'http://127.0.0.1:5173/?renderer=webgl2&worldReview=1', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill('Hill reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay' }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  await canvas.click();
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { movementX: 1428 })));
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { movementX: 1428 })));
  await page.evaluate(() => (window as Window & { __amayaReviewPlace: (x: number, z: number) => void }).__amayaReviewPlace(283, 262.4));
  await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/position ([-\d.]+),/)?.[1] ?? 999), { timeout: 30_000 }).toBeCloseTo(283, 0);
  await expect(page.locator('.interaction-prompt')).toContainText('Visit Hill Tea Hut', { timeout: 30_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/world-hill-tea-hut.png' });
  expect(errors).toEqual([]);
});
