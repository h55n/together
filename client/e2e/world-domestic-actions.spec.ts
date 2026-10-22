import { expect, test } from '@playwright/test';
import { laundryFoldSequence } from '@together/shared';
import { PROPERTY_WORLD_PLACEMENTS } from '../src/game/world/PropertyLocations';

test('laundry publishes completed physical steps and opening a menu cancels pending work', async ({ page }) => {
  test.setTimeout(180_000);
  const steps: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/domestic-steps')) {
      steps.push((request.postDataJSON() as { stepId: string }).stepId);
    }
  });
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('Chore reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss first day guide' }).click();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  const home = PROPERTY_WORLD_PLACEMENTS.one_bhk;
  await page.evaluate(({ x, z }) => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
    review.__amayaReviewPlace(x, z); review.__amayaReviewFace(Math.PI);
  }, { x: home.center.x - home.width / 2 + 1.2, z: home.center.z - home.depth / 2 + 0.9 });
  await canvas.click();
  await expect(page.locator('.interaction-prompt')).toContainText('Fold laundry');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.interaction-prompt')).toBeHidden();
  await page.keyboard.press('KeyM');
  await expect(page.getByRole('dialog', { name: 'Map of Amaya Bay' })).toBeVisible();
  await page.waitForTimeout(1200);
  expect(steps).toEqual([]);
  await page.keyboard.press('Escape');
  await canvas.click();
  await expect(page.locator('.interaction-prompt')).toContainText('Fold laundry');
  await page.keyboard.press('KeyE');
  for (const [index, step] of laundryFoldSequence.entries()) {
    if (index > 0) {
      await expect(page.locator('.interaction-prompt')).toContainText(step.id.replaceAll('_', ' ').replace(/^./, value => value.toUpperCase()));
      await page.keyboard.press('KeyE');
    }
    await expect.poll(() => steps).toEqual(laundryFoldSequence.slice(0, index + 1).map(entry => entry.id));
  }
  await expect(page.locator('.interaction-prompt')).toContainText('Fold laundry');
  expect(errors).toEqual([]);
});
