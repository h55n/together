import { expect, test } from '@playwright/test';
import { KAYAK_PLAYER_SUPPORT_Y, KAYAK_RETURN_POSITION, KAYAK_WATER_BOUNDS } from '@together/shared';
import { enterRentalWorld, observeRentalSessions, openRental } from './transportRental.helpers';

type ReviewPlayer = { position: { x: number; y: number; z: number }; transport: string };

test('a rented kayak floats with safety equipment through real keyboard travel and returns to shore', async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const sessions = observeRentalSessions(page);
  await enterRentalWorld(page, 'Kayak waterline reviewer');
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlayer?: unknown }).__amayaReviewPlayer === 'function');
  const player = () => page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => ReviewPlayer }).__amayaReviewPlayer());
  const settleStreaming = async () => {
    await expect.poll(() => page.evaluate(() => (window as Window & { __amayaReviewMetrics: () => { pendingStreamingJobs: number } }).__amayaReviewMetrics().pendingStreamingJobs), { timeout: 90_000 }).toBe(0);
    await page.waitForTimeout(2000);
  };
  const panel = await openRental(page, 'kayak');
  await panel.getByRole('button', { name: 'Rent kayak', exact: true }).click();
  await panel.getByRole('checkbox', { name: 'I understand how to paddle and return safely' }).check();
  await panel.getByRole('button', { name: 'Complete safety introduction', exact: true }).click();
  const travelSaves: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/rental/commands') && request.postDataJSON().kind === 'return') travelSaves.push('return'); });
  await panel.getByRole('button', { name: 'Launch kayak', exact: true }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByRole('complementary', { name: 'Kayak outing' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => { outingReady: boolean } }).__amayaReviewPlayer().outingReady), { timeout: 20_000 }).toBe(true);
  await settleStreaming();
  await canvas.click(); await page.keyboard.press('KeyV');
  const launched = await player();
  expect(launched.transport).toBe('kayak');
  expect(launched.position.y).toBeCloseTo(KAYAK_PLAYER_SUPPORT_Y, 2);
  expect(travelSaves).toEqual([]);
  await page.screenshot({ path: info.outputPath('kayak-third-person-launch.png') });
  try {
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(3000);
    const straight = await player();
    expect(Math.hypot(straight.position.x - launched.position.x, straight.position.z - launched.position.z)).toBeGreaterThan(2);
    expect(straight.position.y).toBeCloseTo(KAYAK_PLAYER_SUPPORT_Y, 2);
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(4000);
    const turned = await player();
    expect(Math.abs(turned.position.x - straight.position.x)).toBeGreaterThan(1);
    expect(turned.position.y).toBeCloseTo(KAYAK_PLAYER_SUPPORT_Y, 2);
    expect(turned.position.x).toBeGreaterThanOrEqual(KAYAK_WATER_BOUNDS.minX);
    expect(turned.position.x).toBeLessThanOrEqual(KAYAK_WATER_BOUNDS.maxX);
    expect(turned.position.z).toBeGreaterThanOrEqual(KAYAK_WATER_BOUNDS.minZ);
    expect(turned.position.z).toBeLessThanOrEqual(KAYAK_WATER_BOUNDS.maxZ);
    await page.screenshot({ path: info.outputPath('kayak-third-person-active-stroke.png') });
  } finally { await page.keyboard.up('KeyW'); await page.keyboard.up('KeyA'); }
  try { await page.keyboard.down('KeyS'); await page.waitForTimeout(2000); }
  finally { await page.keyboard.up('KeyS'); }
  await settleStreaming();
  const resting = await player();
  await page.waitForTimeout(1000);
  const still = await player();
  expect(still.transport).toBe('kayak');
  expect(still.position.y).toBeCloseTo(KAYAK_PLAYER_SUPPORT_Y, 2);
  expect(Math.hypot(still.position.x - resting.position.x, still.position.z - resting.position.z)).toBeLessThan(0.2);
  await page.screenshot({ path: info.outputPath('kayak-third-person-after-paddle.png') });
  await page.keyboard.press('KeyX');
  await expect.poll(async () => (await player()).transport).toBe('on_foot');
  await expect.poll(() => sessions.get('kayak')?.state.transportRental?.rentals[0]?.status).toBe('returned');
  await expect(panel).toContainText('Equipment returned');
  expect(travelSaves).toEqual(['return']);
  const returned = await player();
  expect(returned.position.x).toBeCloseTo(KAYAK_RETURN_POSITION.x, 0);
  expect(returned.position.z).toBeCloseTo(KAYAK_RETURN_POSITION.z, 0);
  await page.screenshot({ path: info.outputPath('kayak-return-to-shore.png') });
  expect(errors).toEqual([]);
});
