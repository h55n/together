import { expect, test } from '@playwright/test';

test('hero street and waterfront hold up from pedestrian viewpoints', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.TOGETHER_E2E_URL ?? 'http://127.0.0.1:5173/?renderer=webgl2&worldReview=1', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill('Street reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay' }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  await canvas.click();
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { movementX: 1428 })));
  for (const point of [
    { name: 'lantern-hero', x: -30, z: 118 },
    { name: 'bay-water', x: 75, z: -285 },
    { name: 'bay-steps', x: 67.5, z: -300 },
  ]) {
    await page.evaluate(({ x, z }) => (window as Window & { __amayaReviewPlace: (x: number, z: number) => void }).__amayaReviewPlace(x, z), point);
    await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/position ([-\d.]+),/)?.[1] ?? 999), { timeout: 30_000 }).toBeCloseTo(point.x, 0);
    await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/(\d+) draws/)?.[1] ?? 0), { timeout: 30_000 }).toBeGreaterThan(50);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/world-${point.name}.png` });
    console.log(point.name, await page.getByTestId('debug-overlay').innerText());
  }
  await page.evaluate(() => (window as Window & { __amayaReviewPlace: (x: number, z: number) => void }).__amayaReviewPlace(69.5, -276.5));
  await expect(page.locator('.interaction-prompt')).toContainText('Watch the bay from the bench');
  expect(errors).toEqual([]);
});
