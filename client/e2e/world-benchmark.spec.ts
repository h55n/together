import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PerformanceSnapshot } from '../src/game/debug/PerformanceMonitor';
import { AUTO_DESTINATIONS } from '@together/shared';

type ReviewWindow = Window & {
  __amayaReviewTravel: (id: string) => void;
  __amayaReviewFace: (yaw: number) => void;
  __amayaReviewPlace: (x: number, z: number) => void;
  __amayaReviewTime: (minutes: number) => void;
  __amayaReviewWeather: (weather: 'clear' | 'light_rain') => void;
  __amayaReviewMetrics: (reset?: boolean) => PerformanceSnapshot;
};

test.use({ viewport: { width: 960, height: 540 }, video: 'on', launchOptions: { args: ['--use-angle=d3d11'] } });
test('captures fixed district frames and separates warm rendering from streaming', async ({ page }, info) => {
  test.skip(process.env.AMAYA_BENCHMARK !== '1', 'Opt-in visual/performance capture');
  test.setTimeout(480_000);
  const output = path.resolve('../.art-review/current-world');
  await mkdir(output, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.TOGETHER_E2E_URL ?? 'http://127.0.0.1:5188/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('World visual review');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible();
  await page.waitForFunction(() => typeof (window as ReviewWindow).__amayaReviewMetrics === 'function');
  await page.getByRole('button', { name: 'Dismiss first day guide' }).click();
  const records: unknown[] = [];
  await expect(page.getByTestId('debug-overlay')).toContainText(/WEBGL2|WEBGPU/);
  const backend = (await page.getByTestId('debug-overlay').innerText()).split(' ')[0];
  const gpu = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const context = canvas?.getContext('webgl2');
    const extension = context?.getExtension('WEBGL_debug_renderer_info');
    return extension ? context!.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'Unavailable';
  });
  console.log('GPU', gpu);
  for (const [id, name, yaw] of [
    ['auto_mogra_court', 'mogra', Math.PI],
    ['auto_lantern_street', 'lantern', Math.PI],
    ['auto_bay_steps', 'bay', 0],
    ['auto_mogra_park', 'park', Math.PI],
    ['auto_rain_tree_lane', 'rain-tree', Math.PI],
    ['auto_the_common', 'common', Math.PI],
    ['auto_hill_garden', 'hill', Math.PI],
  ] as const) {
    await page.evaluate(({ id, yaw }) => {
      const review = window as ReviewWindow;
      review.__amayaReviewTime(13 * 60);
      review.__amayaReviewWeather('clear');
      review.__amayaReviewMetrics(true);
      review.__amayaReviewTravel(id);
      review.__amayaReviewFace(yaw);
    }, { id, yaw });
    await page.waitForTimeout(2000);
    const loading = await page.evaluate(() => (window as ReviewWindow).__amayaReviewMetrics());
    await expect.poll(() => page.evaluate(() => (window as ReviewWindow).__amayaReviewMetrics().pendingStreamingJobs), { timeout: 90_000 }).toBe(0);
    await page.evaluate(() => (window as ReviewWindow).__amayaReviewMetrics(true));
    await page.waitForTimeout(5000);
    const warm = await page.evaluate(() => (window as ReviewWindow).__amayaReviewMetrics());
    const destination = AUTO_DESTINATIONS.find(entry => entry.id === id)!;
    const positionText = await page.getByTestId('debug-overlay').innerText();
    const positionMatch = positionText.match(/position ([-\d.]+), ([-\d.]+)/);
    expect(Number(positionMatch?.[1])).toBeCloseTo(destination.position.x, 0);
    expect(Number(positionMatch?.[2])).toBeCloseTo(destination.position.z, 0);
    await page.screenshot({ path: path.join(output, `${name}-day.png`) });
    records.push({ name, yaw, loading, warm });
    await writeFile(path.join(output, 'metrics.json'), JSON.stringify({ capturedAt: new Date().toISOString(), resolution: [960, 540], renderer: backend, gpu, environment: 'Automated browser; not a hardware acceptance benchmark', records, errors }, null, 2));
    console.log(name, JSON.stringify({ loading, warm }));
  }
  for (const [name, x, z, yaw] of [
    ['lantern-cafe', -30, 60, Math.PI / 2],
    ['mogra-street', -205, 181, Math.PI / 2],
    ['bay-shore', 67, -293, 0],
  ] as const) {
    await page.evaluate(({ x, z, yaw }) => {
      const review = window as ReviewWindow;
      review.__amayaReviewPlace(x, z); review.__amayaReviewFace(yaw);
      review.__amayaReviewWeather('clear'); review.__amayaReviewTime(17.8 * 60);
    }, { x, z, yaw });
    await expect.poll(() => page.evaluate(() => (window as ReviewWindow).__amayaReviewMetrics().pendingStreamingJobs), { timeout: 90_000 }).toBe(0);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(output, `${name}.png`) });
  }
  await page.evaluate(() => {
    const review = window as ReviewWindow;
    review.__amayaReviewWeather('clear'); review.__amayaReviewTime(13 * 60);
    review.__amayaReviewPlace(-30, 144); review.__amayaReviewFace(0);
  });
  await expect.poll(() => page.evaluate(() => (window as ReviewWindow).__amayaReviewMetrics().pendingStreamingJobs), { timeout: 90_000 }).toBe(0);
  await page.getByLabel('Amaya Bay 3D world').click();
  await page.evaluate(() => (window as ReviewWindow).__amayaReviewMetrics(true));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(20_000);
  await page.keyboard.up('KeyW');
  const walk = await page.evaluate(() => (window as ReviewWindow).__amayaReviewMetrics());
  const overlay = await page.getByTestId('debug-overlay').innerText();
  const endZ = Number(overlay.match(/position [-\d.]+, ([-\d.]+)/)?.[1]);
  expect(endZ).toBeLessThan(130);
  records.push({ name: 'normal-walk-across-chunk', start: [-30, 144], endZ, seconds: 20, walk });
  await page.screenshot({ path: path.join(output, 'normal-walk-end.png') });
  await writeFile(path.join(output, 'metrics.json'), JSON.stringify({ capturedAt: new Date().toISOString(), resolution: [960, 540], renderer: backend, gpu, environment: 'Automated browser; not a hardware acceptance benchmark', records, errors }, null, 2));
  for (const [name, id, minutes, weather, yaw] of [
    ['bay-sunset', 'auto_bay_steps', 17.8 * 60, 'clear', 0],
    ['lantern-rain', 'auto_lantern_street', 16 * 60, 'light_rain', Math.PI],
  ] as const) {
    await page.evaluate(({ id, minutes, weather, yaw }) => {
      const review = window as ReviewWindow;
      review.__amayaReviewTravel(id); review.__amayaReviewTime(minutes);
      review.__amayaReviewWeather(weather); review.__amayaReviewFace(yaw);
    }, { id, minutes, weather, yaw });
    await expect.poll(() => page.evaluate(() => (window as ReviewWindow).__amayaReviewMetrics().pendingStreamingJobs), { timeout: 90_000 }).toBe(0);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(output, `${name}.png`) });
  }
  await info.attach('world-metrics', { path: path.join(output, 'metrics.json'), contentType: 'application/json' });
  expect(errors).toEqual([]);
});
