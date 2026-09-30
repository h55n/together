import { expect, test } from '@playwright/test';

test('normal-speed player journey from the starter home to Bay Steps', async ({ page }) => {
  test.skip(process.env.TOGETHER_RUN_FULL_WALK !== '1', 'Requires a browser that advances simulation near wall-clock rate.');
  test.setTimeout(1_200_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.TOGETHER_E2E_URL ?? 'http://127.0.0.1:5173/?renderer=webgl2&worldReview=1', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill('Walking reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay' }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await canvas.click();
  const position = async () => {
    const overlay = await page.getByTestId('debug-overlay').innerText();
    const match = overlay.match(/position ([-\d.]+), ([-\d.]+)/);
    if (!match) throw new Error('Missing player position: ' + overlay);
    return { x: Number(match[1]), z: Number(match[2]), overlay };
  };
  await page.keyboard.down('KeyS');
  try {
    await expect.poll(async () => (await position()).z, { timeout: 90_000 }).toBeLessThan(195);
  } finally {
    await page.keyboard.up('KeyS');
  }
  await page.screenshot({ path: 'test-results/world-normal-route-mogra.png' });

  let yaw = Math.PI;
  const sensitivity = 0.0022;
  const follow = async (target: { x: number; z: number }, label: string) => {
    let stalled = 0;
    let previousDistance = Number.POSITIVE_INFINITY;
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      const now = await position();
      const distance = Math.hypot(target.x - now.x, target.z - now.z);
      if (distance < 2.3) {
        console.log('Reached', label, now.x, now.z);
        return;
      }
      const desiredYaw = Math.atan2(now.x - target.x, now.z - target.z);
      let turn = desiredYaw - yaw;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      const movementX = -turn / sensitivity;
      await page.evaluate(dx => window.dispatchEvent(new MouseEvent('mousemove', { movementX: dx })), movementX);
      yaw += turn;
      await page.waitForTimeout(1000);
      stalled = distance >= previousDistance - 0.05 ? stalled + 1 : 0;
      if (stalled > 12) throw new Error('Blocked near ' + label + ': ' + now.overlay);
      previousDistance = distance;
    }
    throw new Error('Timed out walking to ' + label + ': ' + (await position()).overlay);
  };
  await page.keyboard.down('KeyW');
  try {
    for (const [x, z, label] of [
      [-275, 187, 'Mogra turn'], [-245, 189, 'Mogra Court'], [-205, 186, 'Mogra street'],
      [-175, 181, 'residential edge'], [-95, 155, 'Lantern approach'], [-30, 145, 'Lantern north'],
      [-30, 75, 'Lantern heart'], [-30, 10, 'Lantern south'], [-20, -65, 'civic turn'],
      [35, -160, 'Bay approach'], [95, -265, 'Bay Steps'],
    ] as const) {
      await follow({ x, z }, label);
      if (label === 'Lantern heart') await page.screenshot({ path: 'test-results/world-normal-route-lantern.png' });
      if (label === 'Bay approach') await page.screenshot({ path: 'test-results/world-normal-route-transition.png' });
    }
  } finally {
    await page.keyboard.up('KeyW');
  }
  await page.screenshot({ path: 'test-results/world-normal-route-bay.png' });
  expect((await position()).z).toBeLessThan(-260);
  expect(errors).toEqual([]);
});
