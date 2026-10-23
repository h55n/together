import { expect, test, type Page } from '@playwright/test';
import { CAFE_MENU } from '@together/shared';
import type { ActivitySessionView } from '../src/ui/game/ActivityPanel';

test.use({ viewport: { width: 1280, height: 800 } });

async function arrangementObjects(page: Page, picnic: boolean): Promise<number> {
  return page.evaluate(kind => {
    const read = (window as Window & { __amayaReviewLeisure?: () => Array<{ kind: string; objects: number }> }).__amayaReviewLeisure;
    return read?.().find(value => value.kind === kind)?.objects ?? 0;
  }, picnic ? 'picnic-presentation' : 'cafe-presentation');
}

function carriedDrink(page: Page): Promise<string | null> {
  return page.evaluate(() => (window as Window & { __amayaReviewCarriedDrink?: () => string | null }).__amayaReviewCarriedDrink?.() ?? null);
}


type HouseholdAccess = { base: string; householdId: string; headers: Record<string, string> };
function watchHouseholdAccess(page: Page): () => HouseholdAccess {
  let access: HouseholdAccess | undefined;
  page.on('request', request => {
    const match = /^(.*)\/api\/households\/([0-9a-f-]{36})(\/|$)/.exec(request.url());
    const headers = request.headers(), auth: Record<string, string> = {};
    if (headers.authorization) auth.authorization = headers.authorization;
    if (headers['x-dev-user-id']) auth['x-dev-user-id'] = headers['x-dev-user-id'];
    if (match && !access && Object.keys(auth).length > 0) access = { base: match[1]!, householdId: match[2]!, headers: auth };
  });
  return () => { if (!access) throw new Error('No household API request observed yet'); return access; };
}

/** Buys real groceries through the household API so picnic food is spent from actual inventory. */
async function stockGroceries(page: Page, access: HouseholdAccess, items: readonly string[]) {
  for (const itemId of items) {
    const response = await page.request.post(`${access.base}/api/households/${access.householdId}/groceries`, {
      headers: { ...access.headers, 'content-type': 'application/json' },
      data: { itemId, quantity: 1, wallet: 'household', idempotencyKey: `e2e-stock-${itemId}-${Date.now()}` },
    });
    expect(response.ok()).toBe(true);
  }
}

async function enter(page: Page, x: number, z: number, prompt: string, name: string) {
  await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.world-loading')).toBeHidden({ timeout: 60_000 });
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  const guide = page.getByRole('button', { name: 'Dismiss first day guide' });
  if (await guide.isVisible()) await guide.click();
  await page.evaluate(({ x, z }) => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
    review.__amayaReviewPlace(x, z); review.__amayaReviewFace(0);
  }, { x, z });
  await page.getByLabel('Amaya Bay 3D world').click();
  await expect(page.locator('.interaction-prompt')).toContainText(prompt);
  await page.keyboard.press('KeyE');
  const dialog = page.getByRole('dialog', { name, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('a household guest joins an existing picnic and receives the host food', async ({ browser }, info) => {
  test.setTimeout(240_000);
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const host = await contexts[0]!.newPage(), guest = await contexts[1]!.newPage();
  const hostAccess = watchHouseholdAccess(host);
  const errors: string[] = [];
  for (const page of [host, guest]) page.on('pageerror', error => errors.push(error.message));
  const identity = async (page: Page, name: string) => {
    await page.addInitScript(() => localStorage.setItem('together:game-settings', JSON.stringify({ quality: 'low', reducedMotion: true })));
    await page.goto('/?renderer=webgl2&worldReview=1');
    await page.getByLabel('Display name').fill(name);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  };
  try {
    await identity(host, 'Picnic host');
    await host.getByLabel('Household name').fill('Picnic sharing household');
    await host.getByRole('button', { name: 'Create household', exact: true }).click();
    const invite = host.locator('.invite-strip strong');
    await expect(invite).toHaveText(/[A-Z0-9]{6}/);
    await identity(guest, 'Picnic guest');
    await guest.getByRole('button', { name: 'Join', exact: true }).click();
    await guest.getByLabel('Six-character invite code').fill((await invite.innerText()).trim());
    await guest.getByRole('button', { name: 'Join household', exact: true }).click();
    await host.getByRole('button', { name: 'Refresh household' }).click();
    await expect(host.getByText(/2 members present/)).toBeVisible();
    await host.getByRole('button', { name: 'Propose this home' }).first().click();
    await host.getByRole('button', { name: 'Choose this home', exact: true }).click();
    await guest.getByRole('button', { name: 'Refresh household' }).click();
    await guest.getByRole('button', { name: 'Choose this home', exact: true }).click();
    await host.getByRole('button', { name: 'Refresh household' }).click();
    await guest.getByRole('button', { name: /Unlock the door · Enter Amaya Bay/ }).click();
    await host.getByRole('button', { name: /Unlock the door · Enter Amaya Bay/ }).click();
    await stockGroceries(host, hostAccess(), ['fruit']);
    const hostPanel = await enter(host, 168, 124, 'Lay out a picnic', 'Picnic on the lawn');
    await hostPanel.getByRole('button', { name: 'Place picnic mat', exact: true }).click();
    await hostPanel.getByRole('button', { name: 'Add Mangoes', exact: true }).click();
    const guestPanel = await enter(guest, 168, 124, 'Lay out a picnic', 'Picnic on the lawn');
    await expect(hostPanel).toContainText('2 guests');
    await hostPanel.getByLabel('Recipient for Mangoes').selectOption({ label: 'Picnic guest' });
    await hostPanel.getByRole('button', { name: 'Serve Mangoes', exact: true }).click();
    await guestPanel.getByRole('button', { name: 'Eat Mangoes', exact: true }).click();
    await expect(hostPanel).toContainText('Enjoyed by Picnic guest');
    await expect(guestPanel).toContainText('Enjoyed by You');
    await host.screenshot({ path: info.outputPath('shared-picnic-host.png') });
    await guest.screenshot({ path: info.outputPath('shared-picnic-guest.png') });
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

for (const outing of ['picnic', 'cafe_hangout'] as const) {
  test(`${outing} retains actual food or drink through a lost reply and reload`, async ({ page }, info) => {
    test.setTimeout(180_000);
    const picnic = outing === 'picnic';
    const path = picnic ? 'picnic' : 'cafe';
    const name = picnic ? 'Picnic on the lawn' : 'Coffee at Café Roshan';
    const prompt = picnic ? 'Lay out a picnic' : 'Sit for coffee';
    const [x, z] = picnic ? [168, 124] : [-43, 70];
    let saved: ActivitySessionView | undefined;
    const errors: string[] = [], requests: unknown[] = [];
    let lostReply = false;
    const access = watchHouseholdAccess(page);
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', async response => {
      if (!response.ok() || !response.url().includes('/activities')) return;
      try {
        const value = await response.json() as ActivitySessionView;
        if (value.activityId === outing && (!saved || (value.state.revision ?? 0) >= (saved.state.revision ?? 0))) saved = value;
      } catch { /* A deliberately lost response has no readable body. */ }
    });
    await page.route(`**/api/activities/*/${path}/commands`, async route => {
      const body = route.request().postDataJSON() as { kind: string };
      if (body.kind !== (picnic ? 'bring_food' : 'order_drink')) { await route.continue(); return; }
      requests.push(body);
      if (!lostReply) {
        const accepted = await route.fetch(); expect(accepted.ok()).toBe(true);
        lostReply = true; await route.abort('failed');
      } else await route.continue();
    });
    await page.addInitScript(() => localStorage.setItem('together:game-settings', JSON.stringify({ quality: 'low', reducedMotion: true })));
    await page.goto('/?renderer=webgl2&worldReview=1');
    await page.getByLabel('Display name').fill('Leisure reviewer');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Explore Amaya Bay solo', exact: true }).click();
    await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
    if (picnic) await stockGroceries(page, access(), ['fruit']);
    let dialog = await enter(page, x!, z!, prompt, name);
    await dialog.getByRole('button', { name: picnic ? 'Place picnic mat' : 'Choose seat 1', exact: true }).click();
    await expect.poll(() => saved?.state.revision).toBeGreaterThan(0);
    await dialog.getByRole('button', { name: picnic ? /^Add / : /^Order / }).click();
    await expect.poll(() => picnic ? saved?.state.picnic?.portions.length : saved?.state.cafe?.orders.length).toBe(1);
    expect(requests.length).toBeGreaterThanOrEqual(1);
    if (requests.length > 1) expect(requests[1]).toEqual(requests[0]);
    const id = saved!.id;
    await page.screenshot({ path: info.outputPath(`${path}-placed.png`) });
    await expect.poll(() => arrangementObjects(page, picnic)).toBeGreaterThan(0);
    const arrangedObjects = await arrangementObjects(page, picnic);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(await arrangementObjects(page, picnic)).toBe(arrangedObjects);
    const position = () => page.evaluate(() => (window as Window & { __amayaReviewPlayer: () => { position: { x: number; z: number } } }).__amayaReviewPlayer().position);
    const origin = await position();
    await page.getByLabel('Amaya Bay 3D world').click();
    // Walking eases in from rest, so hold long enough for a slow headless frame rate to cover ground.
    try { await page.keyboard.down('KeyW'); await page.waitForTimeout(1000); }
    finally { await page.keyboard.up('KeyW'); }
    const walked = await position();
    expect(Math.hypot(walked.x - origin.x, walked.z - origin.z)).toBeGreaterThan(0.2);
    expect(await arrangementObjects(page, picnic)).toBe(arrangedObjects);
    await page.screenshot({ path: info.outputPath(`${path}-ambient-after-close.png`) });
    await page.reload();
    await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
    await expect.poll(() => arrangementObjects(page, picnic), { timeout: 60_000 }).toBe(arrangedObjects);
    await expect(page.getByRole('dialog', { name, exact: true })).toBeHidden();
    dialog = await enter(page, x!, z!, prompt, name);
    expect(saved!.id).toBe(id);
    expect(picnic ? saved!.state.picnic!.portions.length : saved!.state.cafe!.orders.length).toBe(1);
    await dialog.getByRole('button', { name: /^Serve / }).first().click();
    if (!picnic) {
      const served = access();
      await expect.poll(() => saved?.state.cafe?.orders[0]?.servedTo).toBeTruthy();
      const stock = await page.request.get(`${served.base}/api/households/${served.householdId}/inventory`, { headers: served.headers });
      const inventory = await stock.json() as { itemId: string; quantity: number }[];
      expect(inventory.find(entry => entry.itemId === 'drink:chai')?.quantity).toBe(1);
      const ledger = await page.request.get(`${served.base}/api/households/${served.householdId}/transactions`, { headers: served.headers });
      const transactions = await ledger.json() as Array<{ type: string; itemRef?: string; amount: number; userId: string }>;
      const purchase = transactions.find(entry => entry.type === 'purchase' && entry.itemRef === 'drink:chai');
      expect(purchase?.amount).toBe(-CAFE_MENU.chai);
      expect(purchase?.userId).toBeTruthy();
      await page.screenshot({ path: info.outputPath('cafe-carried.png') });
      await expect.poll(() => carriedDrink(page)).toBe('chai');
    }
    await dialog.getByRole('button', { name: picnic ? /^Eat / : /^Sip / }).click();
    await expect.poll(() => picnic ? saved?.state.picnic?.portions[0]?.eatenBy : saved?.state.cafe?.orders[0]?.sippedBy).toBeTruthy();
    if (!picnic) {
      await expect.poll(() => carriedDrink(page)).toBe(null);
      const sipped = access();
      const stock = await page.request.get(`${sipped.base}/api/households/${sipped.householdId}/inventory`, { headers: sipped.headers });
      const inventory = await stock.json() as { itemId: string; quantity: number }[];
      expect(inventory.find(entry => entry.itemId === 'drink:chai')?.quantity ?? 0).toBe(0);
    }
    expect(saved!.state.status).toBe('active');
    await dialog.getByRole('button', { name: picnic ? 'Finish picnic' : 'Finish café visit', exact: true }).click();
    await expect.poll(() => saved?.state.status).toBe('complete');
    await expect.poll(() => arrangementObjects(page, picnic)).toBe(0);
    await page.screenshot({ path: info.outputPath(`${path}-finished.png`) });
    expect(errors).toEqual([]);
  });
}
