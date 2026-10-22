import { expect, test } from '@playwright/test';

test('evening streets and rainy waterfront render from pedestrian viewpoints', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?renderer=webgl2&worldReview=1', { waitUntil: 'networkidle' });
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
    // Hold the review clock against the server's periodic time sync.
    (window as Window & { __weatherPin?: number }).__weatherPin = window.setInterval(() => review.__amayaReviewTime(20 * 60), 100);
    review.__amayaReviewPlace(-30, 118);
  });
  await expect(page.getByTestId('debug-overlay')).toContainText(/20:\d\d/, { timeout: 30_000 });
  await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/(\d+) draws/)?.[1] ?? 0), { timeout: 30_000 }).toBeGreaterThan(50);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/world-lantern-evening.png' });

  await page.evaluate(() => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewTime: (minutes: number) => void };
    const pinned = window as Window & { __weatherPin?: number; __amayaReviewWeather: (weather: 'light_rain') => void };
    if (pinned.__weatherPin) clearInterval(pinned.__weatherPin);
    // Hold time and weather against the server's periodic sync for this capture.
    pinned.__weatherPin = window.setInterval(() => { review.__amayaReviewTime(17 * 60 + 40); pinned.__amayaReviewWeather('light_rain'); }, 100);
    review.__amayaReviewPlace(75, -285);
  });
  await expect(page.getByTestId('debug-overlay')).toContainText(/17:4\d · light rain/, { timeout: 30_000 });
  await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/(\d+) draws/)?.[1] ?? 0), { timeout: 30_000 }).toBeGreaterThan(50);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'test-results/world-bay-rain.png' });
  expect(errors).toEqual([]);
});