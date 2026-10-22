import { expect, test } from '@playwright/test';
import { enterRentalWorld, observeRentalSessions, openRental, readyRentalWorld } from './transportRental.helpers';

test('saved bicycle and kayak rentals depart through real travel and return their owned equipment', async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const sessions = observeRentalSessions(page);
  await enterRentalWorld(page, 'Transport reviewer');
  for (const kind of ['cycling', 'kayak'] as const) {
    let panel = await openRental(page, kind);
    await panel.getByRole('button', { name: kind === 'cycling' ? 'Rent bicycle' : 'Rent kayak', exact: true }).click();
    await expect.poll(() => sessions.get(kind)?.state.transportRental?.rentals.length).toBe(1);
    const lease = sessions.get(kind)!.state.transportRental!.rentals[0]!;
    expect(lease.status).toBe('rented');
    if (kind === 'cycling') {
      await page.reload();
      await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
      await readyRentalWorld(page);
      panel = await openRental(page, kind);
      expect(sessions.get(kind)!.state.transportRental!.rentals[0]!.rentalId).toBe(lease.rentalId);
      await page.evaluate(() => {
        const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
        review.__amayaReviewPlace(-30, 144); review.__amayaReviewFace(0);
      });
    } else {
      await expect(panel.getByRole('heading', { name: 'Safety introduction', exact: true })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Complete safety introduction', exact: true })).toBeDisabled();
      await panel.getByRole('checkbox', { name: 'I understand how to paddle and return safely' }).check();
      await panel.getByRole('button', { name: 'Complete safety introduction', exact: true }).click();
    }
    await panel.getByRole('button', { name: kind === 'cycling' ? 'Ride bicycle' : 'Launch kayak', exact: true }).click();
    const hint = page.getByRole('complementary', { name: kind === 'cycling' ? 'Cycling outing' : 'Kayak outing', exact: true });
    await expect(hint).toBeVisible(); await expect(panel).toBeHidden();
    await expect.poll(() => sessions.get(kind)?.state.transportRental?.rentals[0]?.status).toBe('in_use');
    await expect.poll(() => page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => { outingReady: boolean } }).__amayaReviewPlayer().outingReady), { timeout: 20_000 }).toBe(true);
    const canvas = page.getByLabel('Amaya Bay 3D world'); await canvas.click();
    const position = () => page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => { position: { x: number; z: number } } }).__amayaReviewPlayer().position);
    const origin = await position();
    try { await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); }
    finally { await page.keyboard.up('KeyW'); }
    const moved = await position(); expect(Math.hypot(moved.x - origin.x, moved.z - origin.z)).toBeGreaterThan(1);
    await page.waitForTimeout(500); await expect(hint).toBeVisible();
    await page.keyboard.press('KeyX');
    await expect(panel).toBeVisible();
    await expect.poll(() => sessions.get(kind)?.state.transportRental?.rentals[0]?.status).toBe('returned');
    expect(sessions.get(kind)!.state.transportRental!.rentals[0]!.rentalId).toBe(lease.rentalId);
    await expect(panel).toContainText('Equipment returned');
    await page.screenshot({ path: info.outputPath(`${kind}-owned-return.png`) });
    await panel.getByRole('button', { name: 'Close', exact: true }).click();
  }
  expect(errors).toEqual([]);
});
