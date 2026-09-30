import { expect, test } from '@playwright/test';

test('first playable frame contains world geometry', async ({ page }) => {
  test.setTimeout(180_000);
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.stack ?? error.message));
  page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });

  await page.goto(process.env.TOGETHER_E2E_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill('Browser tester');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay' }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(2500);

  const screenshot = await page.screenshot({ path: 'test-results/world-visible.png' });
  const frame = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const sample = document.createElement('canvas');
    sample.width = 48;
    sample.height = 32;
    const context = sample.getContext('2d');
    context?.drawImage(image, 0, 0, sample.width, sample.height);
    const pixels = context?.getImageData(0, 0, sample.width, sample.height).data ?? new Uint8ClampedArray();
    const colors = new Set<string>();
    for (let index = 0; index < pixels.length; index += 16) {
      colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`);
    }
    return { colors: colors.size };
  }, screenshot.toString('base64'));

  await expect(page.getByTestId('debug-overlay')).toContainText(/\d+ draws/);
  console.log('Before movement:', await page.getByTestId('debug-overlay').innerText());
  await canvas.click();
  await page.keyboard.down('KeyS');
  try {
    await expect.poll(async () => {
      const overlay = await page.getByTestId('debug-overlay').innerText();
      return Number(overlay.match(/position [-\d.]+, ([-\d.]+)/)?.[1] ?? 999);
    }, { timeout: 90_000 }).toBeLessThan(195);
  } finally {
    await page.keyboard.up('KeyS');
  }
  await page.screenshot({ path: 'test-results/world-outside.png' });
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { movementX: 1428 })));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/world-mogra-street.png' });

  console.log('World telemetry:', await page.getByTestId('debug-overlay').innerText());
  expect(runtimeErrors).toEqual([]);
  expect(frame.colors).toBeGreaterThan(12);
});
