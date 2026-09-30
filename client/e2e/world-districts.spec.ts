import { expect, test } from '@playwright/test';

test('all seven districts render from reachable arrival points', async ({ page }) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.TOGETHER_E2E_URL ?? 'http://127.0.0.1:5173/?renderer=webgl2&worldReview=1', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill('District reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay' }).click();
  await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewTravel?: unknown }).__amayaReviewTravel === 'function');
  await page.getByLabel('Amaya Bay 3D world').click();
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { movementX: 1428 })));

  for (const [id, name, x] of [
    ['auto_mogra_court', 'mogra', -200],
    ['auto_lantern_street', 'lantern', 28],
    ['auto_bay_steps', 'bay', 66],
    ['auto_mogra_park', 'park', 178],
    ['auto_rain_tree_lane', 'rain-tree', -250],
    ['auto_the_common', 'common', 225],
    ['auto_hill_garden', 'hill', 282],

  ] as const) {
    await page.evaluate(destinationId => (window as Window & { __amayaReviewTravel: (id: string) => void }).__amayaReviewTravel(destinationId), id);
    await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/position ([-\d.]+),/)?.[1] ?? 999), { timeout: 30_000 }).toBeCloseTo(x, 0);
    await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/(\d+) draws/)?.[1] ?? 0), { timeout: 30_000 }).toBeGreaterThan(50);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-results/world-${name}.png` });
    console.log(name, await page.getByTestId('debug-overlay').innerText());
    if (name === 'common') {
      await page.evaluate(() => (window as Window & { __amayaReviewPlace: (x: number, z: number) => void }).__amayaReviewPlace(225.5, -61.7));
      await expect(page.locator('.interaction-prompt')).toContainText('Read on the library bench');
    }

  }
  expect(errors).toEqual([]);
});
