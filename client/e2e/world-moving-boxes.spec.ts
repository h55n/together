import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });
type Access = { base: string; householdId: string; headers: Record<string, string> };

function watchAccess(page: Page): () => Access {
  let access: Access | undefined;
  page.on('request', request => {
    const match = /^(.*)\/api\/households\/([0-9a-f-]{36})\//.exec(request.url());
    const headers = request.headers(), auth: Record<string, string> = {};
    if (headers.authorization) auth.authorization = headers.authorization;
    if (headers['x-dev-user-id']) auth['x-dev-user-id'] = headers['x-dev-user-id'];
    if (match && !access && Object.keys(auth).length > 0) access = { base: match[1]!, householdId: match[2]!, headers: auth };
  });
  return () => { if (!access) throw new Error('No household request yet'); return access; };
}

test('packing for a move stacks tagged boxes inside the home', async ({ browser }, info) => {
  test.setTimeout(240_000);
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const host = await contexts[0]!.newPage(), guest = await contexts[1]!.newPage();
  const hostAccess = watchAccess(host), guestAccess = watchAccess(guest);
  const identity = async (page: Page, name: string) => {
    await page.addInitScript(() => localStorage.setItem('together:game-settings', JSON.stringify({ quality: 'medium' })));
    await page.goto('/?renderer=webgl2&worldReview=1');
    await page.getByLabel('Display name').fill(name);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
  };
  try {
    await identity(host, 'Moving host');
    await host.getByLabel('Household name').fill('Moving household');
    await host.getByRole('button', { name: 'Create household', exact: true }).click();
    const invite = host.locator('.invite-strip strong');
    await expect(invite).toHaveText(/[A-Z0-9]{6}/);
    await identity(guest, 'Moving guest');
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
    await expect(host.getByLabel('Amaya Bay 3D world')).toBeVisible({ timeout: 60_000 });
    await host.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function', undefined, { timeout: 60_000 });
    const access = hostAccess();
    const api = (path: string) => `${access.base}/api${path}`;
    const home = await (await host.request.get(api(`/households/${access.householdId}/home`), { headers: access.headers })).json() as { objects: Array<{ objectId: string }> };
    let vote: Response | null = null;
    for (const target of ['courtyard_2bhk', 'one_bhk', 'couple_studio']) {
      const attempt = await host.request.post(api(`/households/${access.householdId}/moving/votes`), { headers: { ...access.headers, 'content-type': 'application/json' }, data: { targetPropertyId: target } });
      if (attempt.ok()) { vote = attempt as unknown as Response; break; }
    }
    expect(vote).not.toBeNull();
    const voteId = ((await (vote as unknown as { json(): Promise<{ id: string }> }).json())).id;
    for (const [page, who] of [[host, hostAccess], [guest, guestAccess]] as const) {
      const cast = await page.request.post(api(`/moving/votes/${voteId}/cast`), { headers: { ...who().headers, 'content-type': 'application/json' }, data: { choice: 'yes' } });
      expect(cast.ok()).toBe(true);
    }
    // A fresh home packs its authored starter box; furnished homes pack placed objects.
    const packable = home.objects.length > 0 ? home.objects.slice(0, 3).map(object => object.objectId) : ['starter-box:core'];
    const dispositions = ['sell', 'donate', 'keep'] as const;
    for (const [index, objectId] of packable.entries()) {
      const packed = await host.request.post(api(`/households/${access.householdId}/moving/pack`), { headers: { ...access.headers, 'content-type': 'application/json' }, data: { objectId, disposition: dispositions[index % 3] } });
      expect(packed.ok()).toBe(true);
    }
    // A reload proves the boxes come from saved moving state, not only from the panel.
    await host.reload();
    await host.getByRole('button', { name: /Unlock the door · Enter Amaya Bay/ }).click();
    await expect(host.getByLabel('Amaya Bay 3D world')).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => host.evaluate(() => {
      const review = window as Window & { __amayaReviewMovingBoxes?: () => number };
      return review.__amayaReviewMovingBoxes?.() ?? -1;
    }), { timeout: 60_000 }).toBe(packable.length);
    await host.evaluate(() => { const overlay = document.querySelector<HTMLElement>('[data-testid=debug-overlay]'); if (overlay) overlay.style.display = 'none'; });
    await host.waitForTimeout(1500);
    await host.screenshot({ path: info.outputPath('moving-boxes.png') });
  } finally { await Promise.all(contexts.map(context => context.close())); }
});
