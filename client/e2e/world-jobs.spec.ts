import { expect, test } from '@playwright/test';
import { AMAYA_BAY_VENUES, jobForVenue, venueFrontApproach } from '@together/shared';

test('all venue jobs finish, a shift resumes after reload, and lost replies do not repeat progress or payment', async ({ page }) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  let lostAdvance = false, lostPayment = false, firstPaidWallet: number | undefined;
  let cafeStarts = 0, lastWallet = 1500;
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/jobs/cafe_roshan/start')) cafeStarts++; });
  await page.route('**/api/job-sessions/*/advance', async route => {
    const response = await route.fetch();
    if (!lostAdvance && response.ok()) { lostAdvance = true; await route.abort('failed'); }
    else await route.fulfill({ response });
  });
  await page.route('**/api/job-sessions/*/complete', async route => {
    const response = await route.fetch();
    if (response.ok()) {
      const data = await response.json() as { economy: { personalWallet: number } };
      if (!lostPayment) { firstPaidWallet = data.economy.personalWallet; lostPayment = true; await route.abort('failed'); return; }
      lastWallet = data.economy.personalWallet;
    }
    await route.fulfill({ response });
  });
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('Job reviewer');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo' }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss first day guide' }).click();
  for (const venueId of ['cafe_roshan', 'lantern_market', 'lantern_cycle_courier', 'naina_nursery', 'common_coffee_desk']) {
    const venue = AMAYA_BAY_VENUES.find(candidate => candidate.id === venueId)!;
    const job = jobForVenue(venueId)!;
    const beforeWallet = lastWallet;
    const openShift = async () => {
      await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
      const front = venueId === 'cafe_roshan' ? { x: -39, z: 60 } : venueFrontApproach(venue);
      const dx = venueId === 'cafe_roshan' ? 1 : front.x - venue.position.x;
      const dz = venueId === 'cafe_roshan' ? 0 : front.z - venue.position.z;
      const length = Math.hypot(dx, dz);
      await page.evaluate(({ x, z, yaw }) => {
        const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
        review.__amayaReviewPlace(x, z); review.__amayaReviewFace(yaw);
      }, { x: front.x + 1.3 * dx / length, z: front.z + 1.3 * dz / length, yaw: Math.atan2(dx, dz) });
      await canvas.click();
      await expect(page.locator('.interaction-prompt')).toContainText(venue.displayName);
      await page.keyboard.press('KeyE');
      await page.getByRole('dialog', { name: venue.displayName, exact: true }).getByRole('button', { name: 'Start shift' }).click();
    };
    await openShift();
    const panel = page.getByRole('dialog', { name: `${job.displayName} shift`, exact: true });
    await expect(panel).toBeVisible();
    for (const [index, action] of job.actions.entries()) {
      const label = action.replaceAll('_', ' ').replace(/^./, value => value.toUpperCase());
      await panel.getByRole('button', { name: `Do · ${label}`, exact: true }).click();
      await expect(panel.getByLabel(`${index + 1} of ${job.actions.length} tasks completed`)).toBeVisible();
      if (venueId === 'cafe_roshan' && index === 0) {
        await page.reload();
        await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
        await expect(canvas).toBeVisible(); await openShift();
        await expect(panel.getByLabel(`1 of ${job.actions.length} tasks completed`)).toBeVisible();
        expect(cafeStarts).toBe(1);
      }
    }
    const clockOut = panel.getByRole('button', { name: 'Clock out & get paid', exact: true });
    await clockOut.click();
    if (venueId === 'cafe_roshan') {
      await expect(clockOut).toBeEnabled();
      await expect(panel.locator('.status-copy')).toContainText(/fetch|network/i);
      await clockOut.click();
    }
    await expect(panel).toContainText('Shift complete. Your pay has gone to your personal wallet.');
    expect(lastWallet).toBe(beforeWallet + job.payouts.standard);
    if (venueId === 'cafe_roshan') expect(lastWallet).toBe(firstPaidWallet);
    await panel.getByRole('button', { name: 'Leave shift view' }).click();
  }
  expect(lostAdvance).toBe(true); expect(lostPayment).toBe(true);
  expect(errors).toEqual([]);
});
