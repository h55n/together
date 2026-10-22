import { expect, test, type Locator, type Page } from '@playwright/test';
import { MINI_GOLF_HOLES, simulateGolfShot, type GolfPoint, type GolfShot, type GolfRound } from '@together/shared';
import type { ActivitySessionView } from '../src/ui/game/ActivityPanel';

test.use({ viewport: { width: 1280, height: 800 } });

// Observe real HTTP replies. These fixtures never inject sports state or commands
// into the engine: all gameplay uses the visible controls and server clock.
function observeSessions(page: Page) {
  const sessions = new Map<string, ActivitySessionView>();
  const accept = (session: ActivitySessionView) => {
    if (!session?.id || !session.state) return;
    const previous = sessions.get(session.activityId);
    if (!previous || previous.id !== session.id || (session.state.revision ?? 0) >= (previous.state.revision ?? 0)) sessions.set(session.activityId, session);
  };
  page.on('response', response => {
    if (!response.ok() || !response.url().includes('/api/') || !response.url().includes('/activities')) return;
    void response.json().then(value => {
      if (Array.isArray(value)) value.forEach(accept);
      else accept(value);
    }).catch(() => { /* A deliberately lost reply has no browser body. */ });
  });
  return { sessions, accept };
}

async function identity(page: Page, name: string) {
  await page.addInitScript(() => localStorage.setItem('together:game-settings', JSON.stringify({ quality: 'low', reducedMotion: true })));
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill(name);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

async function readyWorld(page: Page) {
  await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.world-loading')).toBeHidden({ timeout: 60_000 });
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  const dismiss = page.getByRole('button', { name: 'Dismiss first day guide' });
  if (await dismiss.isVisible()) await dismiss.click();
}

async function solo(page: Page, name: string) {
  await identity(page, name);
  await page.getByRole('button', { name: 'Explore Amaya Bay solo', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  await readyWorld(page);
}

async function openSport(page: Page, sport: 'golf' | 'badminton') {
  const site = sport === 'golf' ? { x: 278, z: 249, prompt: 'Play a mini-golf hole', dialog: 'Hill Mini-Golf' }
    : { x: 232, z: 79, prompt: 'Play badminton', dialog: 'Badminton court' };
  await page.evaluate(({ x, z }) => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
    review.__amayaReviewPlace(x, z); review.__amayaReviewFace(Math.PI);
  }, site);
  await page.getByLabel('Amaya Bay 3D world').click();
  await expect(page.locator('.interaction-prompt')).toContainText(site.prompt, { timeout: 30_000 });
  await page.keyboard.press('KeyE');
  const dialog = page.getByRole('dialog', { name: site.dialog, exact: true });
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => document.pointerLockElement === null)).toBe(true);
  return dialog;
}

async function rangeInput(slider: Locator, value: number) {
  await expect(slider).toBeEnabled({ timeout: 20_000 });
  const minimum = Number(await slider.getAttribute('min')), maximum = Number(await slider.getAttribute('max'));
  const step = Number(await slider.getAttribute('step') ?? 1);
  const box = await slider.boundingBox();
  if (!box) throw new Error('The sports slider is not rendered');
  // Click the actual thumb track, then use keyboard increments to compensate
  // for browser thumb widths. Do not dispatch synthetic change events.
  await slider.click({ position: { x: 8 + (box.width - 16) * (value - minimum) / (maximum - minimum), y: box.height / 2 } });
  let current = Number(await slider.inputValue());
  for (let correction = 0; Math.abs(current - value) > step / 2 && correction < 12; correction++) {
    await slider.press(current < value ? 'ArrowRight' : 'ArrowLeft');
    current = Number(await slider.inputValue());
  }
  expect(current).toBeCloseTo(value, 4);
}

async function putt(dialog: Locator, shot: GolfShot) {
  await rangeInput(dialog.getByLabel('Aim', { exact: true }), Math.round(shot.angle * 180 / Math.PI));
  await rangeInput(dialog.getByLabel('Power', { exact: true }), Math.round(shot.power * 100));
  await dialog.getByRole('button', { name: 'Putt', exact: true }).click();
}

// The offline solver selects legal integer-degree/percent inputs, just as a
// player could practise a shot. Accepted state always comes from HTTP replies.
function choosePutt(round: GolfRound): GolfShot {
  const hole = MINI_GOLF_HOLES[round.hole]!, origin: GolfPoint = round.balls[round.turn!]!;
  const bearing = Math.round(Math.atan2(hole.cup.z - origin.z, hole.cup.x - origin.x) * 180 / Math.PI);
  let best: { shot: GolfShot; distance: number } | undefined;
  for (let offset = -25; offset <= 25; offset++) {
    const degrees = ((bearing + offset + 540) % 360) - 180;
    for (let percent = 1; percent <= 100; percent++) {
      const shot = { angle: degrees * Math.PI / 180, power: percent / 100 };
      const result = simulateGolfShot(hole, origin, shot);
      if (result.captured) return shot;
      const distance = Math.hypot(result.ball.x - hole.cup.x, result.ball.z - hole.cup.z);
      if (!best || distance < best.distance) best = { shot, distance };
    }
  }
  if (!best || best.distance >= Math.hypot(origin.x - hole.cup.x, origin.z - hole.cup.z) - 0.01) throw new Error(`No legal progress shot found on hole ${round.hole + 1}`);
  return best.shot;
}

test('six golf holes use real putts, reconcile a lost reply and resume after reload', async ({ page }, testInfo) => {
  test.setTimeout(600_000);
  const observed = observeSessions(page), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let lostReply = false, startRequests = 0, firstReceipt: ActivitySessionView | undefined;
  page.on('request', request => { if (request.method() === 'POST' && /\/activities\/mini_golf$/.test(new URL(request.url()).pathname)) startRequests++; });
  await page.route('**/api/activities/*/golf/shots', async route => {
    const response = await route.fetch();
    if (!lostReply && response.ok()) {
      firstReceipt = await response.json() as ActivitySessionView;
      observed.accept(firstReceipt); lostReply = true;
      await route.abort('failed');
    } else await route.fulfill({ response });
  });
  await solo(page, 'Golf browser reviewer');
  let dialog = await openSport(page, 'golf');
  await expect(dialog.getByRole('heading')).toContainText('Hole 1/6');
  await expect(dialog.getByRole('heading')).toBeInViewport();
  await putt(dialog, { angle: Math.PI / 2, power: 0.01 });
  await expect.poll(() => lostReply).toBe(true);
  await expect(dialog.locator('tbody tr').first().locator('td').first()).toHaveText('1');
  expect(firstReceipt!.state.golf!.lastShot!.result.captured).toBe(false);
  expect(firstReceipt!.state.golf!.revision).toBe(1);
  const sessionId = firstReceipt!.id;
  await page.reload();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  await readyWorld(page); dialog = await openSport(page, 'golf');
  await expect(dialog.locator('tbody tr').first().locator('td').first()).toHaveText('1');
  await expect.poll(() => observed.sessions.get('mini_golf')?.id).toBe(sessionId);
  expect(startRequests).toBe(1);
  for (let stroke = 0; stroke < 50; stroke++) {
    const round = observed.sessions.get('mini_golf')!.state.golf!;
    if (round.status === 'complete') break;
    const revision = round.revision;
    await putt(dialog, choosePutt(round));
    await expect.poll(() => observed.sessions.get('mini_golf')!.state.golf!.revision, { timeout: 20_000 }).toBe(revision + 1);
  }
  await expect(dialog).toContainText('Six greens played. Your outing is complete.', { timeout: 20_000 });
  const finished = observed.sessions.get('mini_golf')!;
  expect(finished.state.status).toBe('complete');
  expect(finished.state.golf!.strokes[finished.state.golf!.players[0]!]!.every(strokes => strokes > 0)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('six-greens-complete.png') });
  await dialog.getByRole('button', { name: 'Leave round' }).click();
  await expect(dialog).toBeHidden(); expect(errors).toEqual([]);
});

test('badminton has a timed NPC return, a missed rally point and deliberate finish', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const observed = observeSessions(page), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await solo(page, 'Badminton browser reviewer');
  const dialog = await openSport(page, 'badminton');
  await expect(dialog.getByRole('button', { name: 'Finish game' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Serve', exact: true }).click();
  const returning = dialog.getByRole('button', { name: 'Return', exact: true });
  await expect.poll(() => dialog.innerText(), { intervals: [25], timeout: 15_000 }).toContain('Within reach — return now!');
  await expect(returning).toBeEnabled();
  await returning.click();
  await expect.poll(() => observed.sessions.get('badminton')?.state.badminton?.rallyHits, { timeout: 10_000 }).toBeGreaterThanOrEqual(3);
  // Deliberately do not hit the next NPC return. The server clock must award a
  // point rather than a generic checklist reporting activity completion.
  await expect.poll(() => observed.sessions.get('badminton')?.state.badminton?.completedRallies, { timeout: 15_000 }).toBe(1);
  const settled = observed.sessions.get('badminton')!.state.badminton!;
  expect(settled.score[0] + settled.score[1]).toBe(1);
  expect(observed.sessions.get('badminton')!.state.status).toBe('active');
  const finish = dialog.getByRole('button', { name: 'Finish game' });
  await expect(finish).toBeEnabled(); await finish.click();
  await expect(dialog).toContainText('Game ended. Take your time here.');
  await expect.poll(() => observed.sessions.get('badminton')?.state.status).toBe('complete');
  await page.screenshot({ path: testInfo.outputPath('badminton-point-and-finish.png') });
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden(); expect(errors).toEqual([]);
});

test('two household browsers share golf turns and a badminton rally', async ({ browser }, testInfo) => {
  test.setTimeout(300_000);
  const hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const guestContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const host = await hostContext.newPage(), guest = await guestContext.newPage();
  const a = observeSessions(host), b = observeSessions(guest), errors: string[] = [];
  host.on('pageerror', error => errors.push(`host: ${error.message}`));
  guest.on('pageerror', error => errors.push(`guest: ${error.message}`));
  try {
    await identity(host, 'Sports host');
    await host.getByLabel('Household name').fill('Browser sports household');
    await host.getByRole('button', { name: 'Create household', exact: true }).click();
    const invite = host.locator('.invite-strip strong');
    await expect(invite).toHaveText(/[A-Z0-9]{6}/);
    const code = (await invite.innerText()).trim();
    await identity(guest, 'Sports guest');
    await guest.getByRole('button', { name: 'Join', exact: true }).click();
    await guest.getByLabel('Six-character invite code').fill(code);
    await guest.getByRole('button', { name: 'Join household', exact: true }).click();
    await host.getByRole('button', { name: 'Refresh household' }).click();
    await expect(host.getByText(/2 members present/)).toBeVisible();
    await host.getByRole('button', { name: 'Propose this home' }).first().click();
    await host.getByRole('button', { name: 'Choose this home', exact: true }).click();
    await guest.getByRole('button', { name: 'Refresh household' }).click();
    await guest.getByRole('button', { name: 'Choose this home', exact: true }).click();
    await host.getByRole('button', { name: 'Refresh household' }).click();
    await guest.getByRole('button', { name: /Unlock the door · Enter Amaya Bay/ }).click();
    await readyWorld(guest);
    await host.getByRole('button', { name: /Unlock the door · Enter Amaya Bay/ }).click();
    await readyWorld(host);

    const hostGolf = await openSport(host, 'golf'), guestGolf = await openSport(guest, 'golf');
    await expect.poll(() => a.sessions.get('mini_golf')?.state.golf?.players.length).toBe(2);
    await expect.poll(() => b.sessions.get('mini_golf')?.id).toBe(a.sessions.get('mini_golf')!.id);
    await expect(hostGolf.getByRole('button', { name: 'Putt', exact: true })).toBeEnabled();
    await expect(guestGolf.getByRole('button', { name: 'Putt', exact: true })).toBeDisabled();
    await putt(hostGolf, { angle: Math.PI / 2, power: 0.01 });
    await expect.poll(() => a.sessions.get('mini_golf')?.state.golf?.revision).toBe(1);
    await expect.poll(() => b.sessions.get('mini_golf')?.state.golf?.revision).toBe(1);
    expect(a.sessions.get('mini_golf')!.state.golf!.turn).toBe(b.sessions.get('mini_golf')!.state.golf!.players[1]);
    await expect(hostGolf.getByRole('button', { name: 'Putt', exact: true })).toBeDisabled();
    await putt(guestGolf, { angle: Math.PI / 2, power: 0.01 });
    await expect.poll(() => a.sessions.get('mini_golf')?.state.golf?.revision).toBe(2);
    await expect.poll(() => b.sessions.get('mini_golf')?.state.golf?.revision).toBe(2);
    expect(a.sessions.get('mini_golf')!.state.golf!.strokes).toEqual(b.sessions.get('mini_golf')!.state.golf!.strokes);
    await hostGolf.getByRole('button', { name: 'Leave round' }).click();
    await guestGolf.getByRole('button', { name: 'Leave round' }).click();

    const hostCourt = await openSport(host, 'badminton'), guestCourt = await openSport(guest, 'badminton');
    await expect.poll(() => a.sessions.get('badminton')?.state.badminton?.players[1]).toBeTruthy();
    await expect.poll(() => b.sessions.get('badminton')?.id).toBe(a.sessions.get('badminton')!.id);
    await expect(hostCourt).toContainText('Two players');
    await expect(guestCourt).toContainText('Two players');
    await hostCourt.getByRole('button', { name: 'Serve', exact: true }).click();
    const guestReturn = guestCourt.getByRole('button', { name: 'Return', exact: true });
    await expect(guestReturn).toBeEnabled({ timeout: 12_000 });
    await guestReturn.focus();
    await expect.poll(() => guestCourt.innerText(), { intervals: [25], timeout: 12_000 }).toContain('Within reach — return now!');
    // Activate the already-focused visible control at contact. Pointer action
    // stability checks on two GPU worlds can consume the remaining flight.
    await guest.keyboard.press('Enter');
    await expect.poll(() => b.sessions.get('badminton')?.state.badminton?.rallyHits).toBe(2);
    // Host deliberately misses the human opponent's return.
    await expect.poll(() => a.sessions.get('badminton')?.state.badminton?.completedRallies, { timeout: 12_000 }).toBe(1);
    await expect.poll(() => b.sessions.get('badminton')?.state.badminton?.completedRallies).toBe(1);
    expect(a.sessions.get('badminton')!.state.badminton!.score).toEqual([0, 1]);
    expect(a.sessions.get('badminton')!.state.badminton!.score).toEqual(b.sessions.get('badminton')!.state.badminton!.score);
    await guestCourt.getByRole('button', { name: 'Finish game' }).click();
    await expect(hostCourt).toContainText('Game ended. Take your time here.');
    await expect(guestCourt).toContainText('Game ended. Take your time here.');
    await expect.poll(() => a.sessions.get('badminton')?.state.status).toBe('complete');
    await expect.poll(() => b.sessions.get('badminton')?.state.status).toBe('complete');
    await host.screenshot({ path: testInfo.outputPath('two-browser-sports-host.png') });
    await guest.screenshot({ path: testInfo.outputPath('two-browser-sports-guest.png') });
    expect(errors).toEqual([]);
  } finally { await hostContext.close(); await guestContext.close(); }
});
