import { expect, test } from '@playwright/test';
import { AMAYA_BAY_VENUES, venueFrontApproach } from '@together/shared';

const bespoke = new Set(['dev_cycle_hut', 'kayak_cove', 'hill_tea_hut']);
const heroImages = new Set(['cafe_roshan', 'lantern_market', 'lantern_cycle_courier', 'ravi_repairs', 'naina_nursery']);

test('ordinary venue prompts are visible from their street-side approaches', async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.TOGETHER_E2E_URL ?? 'http://127.0.0.1:5173/?renderer=webgl2&worldReview=1', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill('Venue reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay' }).click();
  await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewFace?: unknown }).__amayaReviewFace === 'function');

  const missing: string[] = [];
  const selected = process.env.TOGETHER_VENUE_IDS?.split(',');
  for (const venue of AMAYA_BAY_VENUES) {
    if (bespoke.has(venue.id) || (selected && !selected.includes(venue.id))) continue;
    const approach = venue.id === 'cafe_roshan' ? { x: -39, z: 60 } : venueFrontApproach(venue);
    const dx = venue.id === 'cafe_roshan' ? 1 : approach.x - venue.position.x;
    const dz = venue.id === 'cafe_roshan' ? 0 : approach.z - venue.position.z;
    const distance = Math.hypot(dx, dz);
    const outward = { x: dx / distance, z: dz / distance };
    const yaw = Math.atan2(outward.x, outward.z);
    const place = async (extraDistance: number) => page.evaluate(({ x, z, yaw }) => {
      const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
      review.__amayaReviewPlace(x, z);
      review.__amayaReviewFace(yaw);
    }, { x: approach.x + outward.x * extraDistance, z: approach.z + outward.z * extraDistance, yaw });
    if (heroImages.has(venue.id)) {
      await place(6);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `test-results/world-venue-${venue.id}.png` });
    }
    await place(1.3);
    let prompt: string | null = null;
    try {
      await expect.poll(async () => {
        prompt = await page.locator('.interaction-prompt').textContent({ timeout: 1_000 }).catch(() => null);
        return prompt;
      }, { timeout: 8_000 }).toContain(venue.displayName);
    } catch {
      missing.push(`${venue.id}: ${prompt ?? '(no prompt)'}`);
    }
    console.log(venue.id, prompt);
  }
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
});
