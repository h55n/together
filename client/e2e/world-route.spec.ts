import { expect, test } from '@playwright/test';

test('the browser player walks from home through Lantern Street to Bay Steps', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.TOGETHER_E2E_URL ?? 'http://127.0.0.1:5173/?renderer=webgl2&worldReview=1', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill('Route reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay' }).click();
  await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewWalkRoute?: unknown }).__amayaReviewWalkRoute === 'function');
  const result = await page.evaluate(() => (window as Window & {
    __amayaReviewWalkRoute: () => { reachedBay: boolean; checkpoints: string[]; blockedAt?: { x: number; z: number; distance: number } };
  }).__amayaReviewWalkRoute());
  console.log('Browser route audit:', result);
  console.log('Browser overlay:', await page.getByTestId('debug-overlay').innerText());
  expect(result.blockedAt).toBeUndefined();
  expect(result.checkpoints).toContain('lantern_street');
  expect(result.checkpoints).toContain('bay_steps');
  expect(result.reachedBay).toBe(true);
  await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/(\d+) draws/)?.[1] ?? 0), { timeout: 30_000 }).toBeGreaterThan(50);
  await page.getByLabel('Amaya Bay 3D world').click();
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { movementX: 1428 })));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/world-browser-route-finish.png' });
  expect(errors).toEqual([]);
});
