import { expect, test } from '@playwright/test';

test('keyboard strafing and diagonals follow the camera at a diagonal heading', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('Directional movement reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss first day guide' }).click();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewFace?: unknown }).__amayaReviewFace === 'function');
  const position = async () => {
    const text = await page.getByTestId('debug-overlay').innerText();
    const match = text.match(/position (-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)/);
    expect(match, 'player position is observable').not.toBeNull();
    return { x: Number(match![1]), z: Number(match![2]) };
  };
  for (const keys of [['KeyD'], ['KeyW'], ['KeyW', 'KeyD']]) {
    await page.evaluate(() => {
      const review = window as Window & {
        __amayaReviewPlace: (x: number, z: number) => void;
        __amayaReviewFace: (yaw: number) => void;
      };
      // Wide, level Lantern Street carriageway; ample clearance for a short step.
      review.__amayaReviewPlace(-30, 144);
      review.__amayaReviewFace(Math.PI / 4);
    });
    await page.waitForTimeout(1_000);
    await canvas.click();
    const before = await position();
    try {
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForTimeout(1_500);
    } finally {
      for (const key of keys) await page.keyboard.up(key);
    }
    await page.waitForTimeout(300);
    const after = await position();
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    expect(Math.hypot(dx, dz)).toBeGreaterThan(0.5);
    if (keys.length === 2) {
      // At 45 degrees, forward+right points directly along world -Z.
      expect(Math.abs(dx)).toBeLessThan(0.3);
      expect(dz).toBeLessThan(-0.5);
    } else {
      expect(dx * (keys[0] === 'KeyD' ? 1 : -1)).toBeGreaterThan(0.3);
      expect(dz).toBeLessThan(-0.3);
      expect(Math.abs(Math.abs(dx) - Math.abs(dz))).toBeLessThan(0.3);
    }
  }
  expect(errors).toEqual([]);
});
