import { expect, test } from '@playwright/test';
import { AMAYA_BAY_VENUES, venueFrontApproach } from '@together/shared';

test('visible activity locations have reachable prompts', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?renderer=webgl2&worldReview=1', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill('Activity reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay' }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  await canvas.click();
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { movementX: 1428 })));
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { movementX: 1428 })));
  const selectedSites = process.env.TOGETHER_ACTIVITY_SITES?.split(',');
  const nursery = AMAYA_BAY_VENUES.find(venue => venue.id === 'naina_nursery')!;
  const nurseryApproach = venueFrontApproach(nursery);
  const nurseryDx = nurseryApproach.x - nursery.position.x;
  const nurseryDz = nurseryApproach.z - nursery.position.z;
  const nurseryDistance = Math.hypot(nurseryDx, nurseryDz);
  for (const site of [
    { name: 'picnic', x: 168, z: 119, prompt: 'Lay out a picnic' },
    { name: 'badminton', x: 232, z: 79, prompt: 'Play badminton' },
    { name: 'nursery', x: nurseryApproach.x + nurseryDx / nurseryDistance * 1.3, z: nurseryApproach.z + nurseryDz / nurseryDistance * 1.3, yaw: Math.atan2(nurseryDx, nurseryDz), prompt: 'Naina Nursery' },
    { name: 'cycle-hut', x: 55, z: -260, prompt: 'Rent scooter' },
    { name: 'kayak-hut', x: 137.5, z: -333, prompt: 'Launch kayak' },
    { name: 'mini-golf', x: 278, z: 249, prompt: 'Play a mini-golf hole' },
  ]) {
    if (selectedSites && !selectedSites.includes(site.name)) continue;
    await page.evaluate(({ x, z, yaw }) => {
      const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
      review.__amayaReviewPlace(x, z);
      review.__amayaReviewFace(yaw ?? Math.PI);
    }, { ...site, yaw: 'yaw' in site ? site.yaw : undefined });
    await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/position ([-\d.]+),/)?.[1] ?? 999), { timeout: 30_000 }).toBeCloseTo(site.x, 0);
    await expect(page.locator('.interaction-prompt')).toContainText(site.prompt, { timeout: 30_000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `test-results/world-activity-${site.name}.png` });
    console.log(site.name, await page.getByTestId('debug-overlay').innerText());
  }
  expect(errors).toEqual([]);
});
