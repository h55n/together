import { expect, test } from '@playwright/test';

test('third-person walk, jog and stop retain normal movement and render without errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('Motion reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world'); await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss first day guide' }).click();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  await page.evaluate(() => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
    review.__amayaReviewPlace(-30, 144); review.__amayaReviewFace(0);
  });
  await expect.poll(() => page.evaluate(() => (window as Window & { __amayaReviewMetrics: () => { pendingStreamingJobs: number } }).__amayaReviewMetrics().pendingStreamingJobs), { timeout: 90_000 }).toBe(0);
  await page.waitForTimeout(2000);
  await canvas.click(); await page.keyboard.press('KeyV');
  const position = async () => {
    const match = (await page.getByTestId('debug-overlay').innerText()).match(/position ([-\d.]+), ([-\d.]+)/)!;
    return { x: Number(match[1]), z: Number(match[2]) };
  };
  const start = await position();
  try {
    await page.keyboard.down('KeyW'); await page.waitForTimeout(1200);
    await page.screenshot({ path: 'test-results/motion-third-person-walk.png' });
    await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(1200);
    await page.screenshot({ path: 'test-results/motion-third-person-jog.png' });
  } finally { await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft'); }
  await page.waitForTimeout(300); const stopped = await position();
  expect(stopped.z).toBeLessThan(start.z - 2);
  await page.waitForTimeout(500); const settled = await position();
  expect(Math.hypot(settled.x - stopped.x, settled.z - stopped.z)).toBeLessThan(0.15);
  await page.screenshot({ path: 'test-results/motion-third-person-stop.png' });
  expect(errors).toEqual([]);
});
