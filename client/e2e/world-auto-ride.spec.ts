import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

type ReviewWindow = Window & {
  __amayaReviewRide: (id: string) => void;
  __amayaReviewTravel: (id: string) => void;
  __amayaReviewPlayer: () => { position: { x: number; z: number }; transport: string };
};

test('an auto-rickshaw ride drives along the streets and drops the rider at the stand', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => localStorage.setItem('together:game-settings', JSON.stringify({ quality: 'low', reducedMotion: true })));
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('Auto rider');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible({ timeout: 60_000 });
  await page.waitForFunction(() => typeof (window as Partial<ReviewWindow>).__amayaReviewRide === 'function', undefined, { timeout: 60_000 });
  // Start from the Mogra Court stand, then ride to Bay Steps across the city.
  await page.evaluate(() => (window as unknown as ReviewWindow).__amayaReviewTravel('auto_mogra_court'));
  const start = await page.evaluate(() => (window as unknown as ReviewWindow).__amayaReviewPlayer().position);
  await page.evaluate(() => (window as unknown as ReviewWindow).__amayaReviewRide('auto_bay_steps'));
  const end = { x: 66, z: -258 };
  const samples: Array<{ x: number; z: number; transport: string }> = [];
  await expect.poll(async () => {
    const player = await page.evaluate(() => (window as unknown as ReviewWindow).__amayaReviewPlayer());
    samples.push({ ...player.position, transport: player.transport });
    return player.transport === 'on_foot' && Math.hypot(player.position.x - end.x, player.position.z - end.z) < 2;
  }, { timeout: 60_000, intervals: [400] }).toBe(true);
  const riding = samples.filter(sample => sample.transport === 'auto_rickshaw');
  expect(riding.length).toBeGreaterThan(3);
  // A straight-line ride would stay on the direct segment; a street ride bends away from it.
  const dx = end.x - start.x, dz = end.z - start.z, length = Math.hypot(dx, dz);
  const deviation = Math.max(...riding.map(sample => Math.abs((sample.x - start.x) * dz - (sample.z - start.z) * dx) / length));
  expect(deviation).toBeGreaterThan(8);
});
