import { expect, test } from '@playwright/test';

test('first playable WebGL2 compatibility frame contains world geometry', async ({ page }, testInfo) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.stack ?? error.message));
  page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });

  await page.goto('/?renderer=webgl2', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill('Browser tester');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay' }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.world-loading')).toBeHidden();
  await page.waitForTimeout(1200);
  if (runtimeErrors.length > 0) throw new Error(`Browser runtime errors:\n${runtimeErrors.join('\n---\n')}`);
  const debugOverlay = page.getByTestId('debug-overlay');
  await expect(debugOverlay).toContainText('WEBGL2');
  await expect.poll(async () => debugOverlay.getAttribute('data-performance-snapshot')).not.toBeNull();

  const metrics = await debugOverlay.evaluate((element) => {
    const raw = (element as HTMLElement).dataset.performanceSnapshot;
    if (!raw) throw new Error('Performance snapshot was not published');
    return JSON.parse(raw) as {
      renderer: string;
      fps: number;
      cpuFrameMs: number;
      p95FrameMs: number;
      p99FrameMs: number;
      drawCalls: number;
      triangles: number;
      meshes: number;
      instancedMeshes: number;
      instances: number;
      activeColliders: number;
      activeChunks: number;
      visualChunks: number;
      horizonChunks: number;
      pendingStreamingJobs: number;
      streamingGenerationMs: number;
      streamingCommitMs: number;
      systemTimings: Record<string, number>;
    };
  });

  expect(metrics.renderer).toBe('webgl2');
  expect(metrics.drawCalls).toBeGreaterThan(0);
  expect(metrics.triangles).toBeGreaterThan(0);
  expect(metrics.meshes).toBeGreaterThan(0);
  expect(metrics.instancedMeshes).toBeGreaterThanOrEqual(2);
  expect(metrics.instances).toBeGreaterThanOrEqual(32);
  expect(metrics.activeColliders).toBeGreaterThan(0);
  expect(metrics.activeChunks).toBeGreaterThan(0);
  await testInfo.attach('first-playable-performance.json', {
    body: JSON.stringify(metrics, null, 2),
    contentType: 'application/json',
  });

  const screenshot = await canvas.screenshot();
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

  expect(frame.colors).toBeGreaterThan(12);
});