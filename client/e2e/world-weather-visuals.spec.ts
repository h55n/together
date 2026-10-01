import { expect, test } from '@playwright/test';

test('evening streets and rainy waterfront render from pedestrian viewpoints', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.TOGETHER_E2E_URL ?? 'http://127.0.0.1:5173/?renderer=webgl2&worldReview=1', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill('Weather reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay' }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewTime?: unknown }).__amayaReviewTime === 'function');
  await canvas.click();
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { movementX: 1428 })));

  await page.evaluate(() => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewTime: (minutes: number) => void };
    review.__amayaReviewTime(20 * 60);
    review.__amayaReviewPlace(-30, 118);
  });
  await expect(page.getByTestId('debug-overlay')).toContainText(/20:\d\d/, { timeout: 30_000 });
  await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/(\d+) draws/)?.[1] ?? 0), { timeout: 30_000 }).toBeGreaterThan(50);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/world-lantern-evening.png' });

  await page.evaluate(() => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewTime: (minutes: number) => void };
    review.__amayaReviewTime(17 * 60 + 40);
    review.__amayaReviewPlace(75, -285);
  });
  await page.evaluate(() => (window as Window & { __amayaReviewWeather: (weather: 'light_rain') => void }).__amayaReviewWeather('light_rain'));
  await expect(page.getByTestId('debug-overlay')).toContainText(/17:4\d · light rain/, { timeout: 30_000 });
  await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/(\d+) draws/)?.[1] ?? 0), { timeout: 30_000 }).toBeGreaterThan(50);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'test-results/world-bay-rain.png' });
  expect(errors).toEqual([]);
});