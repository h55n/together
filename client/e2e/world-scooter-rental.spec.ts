import { expect, test } from '@playwright/test';
import { enterRentalWorld, observeRentalSessions, openRental } from './transportRental.helpers';

test('a rented scooter needs a helmet, rides through real travel and parks its owned lease', async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const sessions = observeRentalSessions(page);
  await enterRentalWorld(page, 'Scooter reviewer');
  const panel = await openRental(page, 'scooter_ride');
  await panel.getByRole('button', { name: 'Rent scooter', exact: true }).click();
  await expect.poll(() => sessions.get('scooter_ride')?.state.transportRental?.rentals.length).toBe(1);
  await expect(panel.getByRole('heading', { name: 'Helmet on', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Put on helmet', exact: true })).toBeDisabled();
  await panel.getByRole('checkbox', { name: 'My helmet is on and fastened' }).check();
  await panel.getByRole('button', { name: 'Put on helmet', exact: true }).click();
  await panel.getByRole('button', { name: 'Ride scooter', exact: true }).click();
  const hint = page.getByRole('complementary', { name: 'Scooter outing', exact: true });
  await expect(hint).toBeVisible();
  await expect.poll(() => sessions.get('scooter_ride')?.state.transportRental?.rentals[0]?.status).toBe('in_use');
  await expect.poll(() => page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => { outingReady: boolean } }).__amayaReviewPlayer().outingReady), { timeout: 20_000 }).toBe(true);
  const transport = () => page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => { transport: string } }).__amayaReviewPlayer().transport);
  expect(await transport()).toBe('scooter');
  // Turn away from the hut toward the open promenade before throttling.
  await page.evaluate(() => (window as Window & { __amayaReviewFace: (yaw: number) => void }).__amayaReviewFace(Math.PI / 2));
  const canvas = page.getByLabel('Amaya Bay 3D world'); await canvas.click();
  const position = () => page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => { position: { x: number; z: number } } }).__amayaReviewPlayer().position);
  const origin = await position();
  try { await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); }
  finally { await page.keyboard.up('KeyW'); }
  const moved = await position();
  expect(Math.hypot(moved.x - origin.x, moved.z - origin.z)).toBeGreaterThan(1);
  await page.screenshot({ path: info.outputPath('scooter-riding.png') });
  await page.keyboard.press('KeyX');
  await expect(panel).toBeVisible();
  await expect.poll(() => sessions.get('scooter_ride')?.state.transportRental?.rentals[0]?.status).toBe('returned');
  expect(await transport()).toBe('on_foot');
  expect(errors).toEqual([]);
});
