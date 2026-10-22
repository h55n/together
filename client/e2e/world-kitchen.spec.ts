import { expect, test } from '@playwright/test';
import { AMAYA_BAY_VENUES, venueFrontApproach } from '@together/shared';
import { PROPERTY_WORLD_PLACEMENTS } from '../src/game/world/PropertyLocations';

test('groceries become a completed meal through world prompts and animated kitchen steps', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('Kitchen reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss first day guide' }).click();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  const place = async (x: number, z: number, yaw: number) => {
    await page.evaluate(({ x, z, yaw }) => {
      const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
      review.__amayaReviewPlace(x, z); review.__amayaReviewFace(yaw);
    }, { x, z, yaw });
    await canvas.click();
  };
  const grocery = AMAYA_BAY_VENUES.find(venue => venue.category === 'grocery')!;
  const front = venueFrontApproach(grocery);
  const dx = front.x - grocery.position.x, dz = front.z - grocery.position.z;
  const distance = Math.hypot(dx, dz);
  await place(front.x + dx / distance, front.z + dz / distance, Math.atan2(dx, dz));
  await expect(page.locator('.interaction-prompt')).toContainText(grocery.displayName);
  await page.keyboard.press('KeyE');
  const shop = page.getByRole('dialog', { name: grocery.displayName });
  await expect(shop).toBeVisible();
  for (const ingredient of ['Tea Leaves', 'Milk']) {
    const purchase = shop.getByRole('button', { name: new RegExp(`^${ingredient}`) });
    await purchase.click();
    await expect(purchase).toBeEnabled();
    await expect(shop.locator('.status-copy')).toContainText(ingredient);
  }
  await shop.getByRole('button', { name: 'Close', exact: true }).click();
  const home = PROPERTY_WORLD_PLACEMENTS.one_bhk;
  const kitchenX = home.center.x - home.width / 2 + 2.5;
  const kitchenZ = home.center.z + home.depth / 2 - 1.35;
  await place(kitchenX, kitchenZ - 1.2, Math.PI);
  await expect(page.locator('.interaction-prompt')).toContainText('Cook a meal');
  await page.keyboard.press('KeyE');
  const kitchen = page.getByRole('dialog', { name: 'Cook at home' });
  await kitchen.getByLabel('Recipe', { exact: true }).selectOption('chai');
  await kitchen.getByRole('button', { name: 'Start cooking', exact: true }).click();
  for (const step of ['Measure', 'Boil', 'Pour', 'Serve']) {
    const button = kitchen.locator('.cooking-step').filter({ hasText: step });
    await expect(button).toBeEnabled();
    await button.click();
    await expect(button).toBeHidden();
  }
  await expect(kitchen.locator('.cooking-outcome')).toContainText('Meal ready');
  await expect(kitchen.locator('.cooking-progress')).toContainText('4 / 4 actions');
  await kitchen.getByRole('button', { name: 'Close', exact: true }).click();
  await page.keyboard.press('KeyE');
  await expect(kitchen.locator('.cooking-outcome')).toContainText('Meal ready');
  expect(errors).toEqual([]);
});
