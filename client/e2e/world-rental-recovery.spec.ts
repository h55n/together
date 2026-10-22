import { expect, test } from '@playwright/test';
import { enterRentalWorld, observeRentalSessions, openRental, readyRentalWorld } from './transportRental.helpers';

test('a checked-out kayak survives reload and its first safety acknowledgement carries to the next outing', async ({ page }, info) => {
  test.setTimeout(240_000);
  const sessions = observeRentalSessions(page), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await enterRentalWorld(page, 'Rental recovery reviewer');
  let panel = await openRental(page, 'kayak');
  await panel.getByRole('button', { name: 'Rent kayak', exact: true }).click();
  await panel.getByRole('checkbox', { name: 'I understand how to paddle and return safely' }).check();
  await panel.getByRole('button', { name: 'Complete safety introduction', exact: true }).click();
  await panel.getByRole('button', { name: 'Launch kayak', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => { outingReady: boolean } }).__amayaReviewPlayer().outingReady), { timeout: 20_000 }).toBe(true);
  const original = sessions.get('kayak')!.state.transportRental!.rentals[0]!;
  expect(original.status).toBe('in_use'); expect(original.safetyAcknowledged).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  await readyRentalWorld(page); panel = await openRental(page, 'kayak');
  await expect(panel.getByRole('button', { name: 'Continue outing', exact: true })).toBeVisible();
  expect(sessions.get('kayak')!.state.transportRental!.rentals[0]!.rentalId).toBe(original.rentalId);
  await panel.getByRole('button', { name: 'Continue outing', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => { outingReady: boolean } }).__amayaReviewPlayer().outingReady), { timeout: 20_000 }).toBe(true);
  await page.getByLabel('Amaya Bay 3D world').click(); await page.keyboard.press('KeyV');
  await page.screenshot({ path: info.outputPath('resumed-kayak-safety-gear.png') });
  const returnCommands: unknown[] = [];
  let lostReturn = false;
  await page.route('**/api/activities/*/rental/commands', async route => {
    const body = route.request().postDataJSON() as { kind: string };
    if (body.kind !== 'return') { await route.continue(); return; }
    returnCommands.push(body);
    if (!lostReturn) { const accepted = await route.fetch(); expect(accepted.ok()).toBe(true); lostReturn = true; await route.abort('failed'); }
    else await route.continue();
  });
  await page.keyboard.press('KeyX');
  await expect.poll(() => sessions.get('kayak')?.state.transportRental?.rentals[0]?.status).toBe('returned');
  await expect(panel).toContainText('Equipment returned');
  expect(returnCommands.length).toBeGreaterThanOrEqual(1);
  if (returnCommands.length > 1) expect(returnCommands[1]).toEqual(returnCommands[0]);
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  panel = await openRental(page, 'kayak');
  await panel.getByRole('button', { name: 'Rent kayak', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Launch kayak', exact: true })).toBeEnabled();
  await expect(panel.getByRole('heading', { name: 'Safety introduction', exact: true })).toBeHidden();
  await expect.poll(() => sessions.get('kayak')?.state.transportRental?.rentals[0]?.rentalId).not.toBe(original.rentalId);
  const next = sessions.get('kayak')!.state.transportRental!.rentals[0]!;
  expect(next.rentalId).not.toBe(original.rentalId); expect(next.safetyAcknowledged).toBe(true);
  await panel.getByRole('button', { name: 'Return equipment', exact: true }).click();
  await expect(panel).toContainText('Equipment returned');
  expect(errors).toEqual([]);
});

test('returning after an unknown departure resolves the original request before saving the return', async ({ page }) => {
  test.setTimeout(180_000);
  const sessions = observeRentalSessions(page), errors: string[] = [], departures: unknown[] = [];
  let lostDeparture = false, blockSports = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/activities/*/sports', route => blockSports ? route.abort('failed') : route.continue());
  await page.route('**/api/activities/*/rental/commands', async route => {
    const body = route.request().postDataJSON() as { kind: string };
    if (body.kind !== 'depart') { await route.continue(); return; }
    departures.push(body);
    if (!lostDeparture) {
      const accepted = await route.fetch(); expect(accepted.ok()).toBe(true);
      lostDeparture = true; blockSports = true; await route.abort('failed');
    } else await route.continue();
  });
  await enterRentalWorld(page, 'Uncertain departure reviewer');
  const panel = await openRental(page, 'cycling');
  await panel.getByRole('button', { name: 'Rent bicycle', exact: true }).click();
  await panel.getByRole('button', { name: 'Ride bicycle', exact: true }).click();
  await expect(panel.getByRole('status')).not.toBeEmpty();
  blockSports = false;
  await panel.getByRole('button', { name: 'Return equipment', exact: true }).click();
  await expect.poll(() => sessions.get('cycling')?.state.transportRental?.rentals[0]?.status).toBe('returned');
  await expect(panel).toContainText('Equipment returned');
  expect(departures).toHaveLength(2); expect(departures[1]).toEqual(departures[0]);
  expect(await page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => { transport: string; outingReady: boolean } }).__amayaReviewPlayer())).toMatchObject({ transport: 'on_foot', outingReady: false });
  expect(errors).toEqual([]);
});
