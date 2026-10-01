import { expect, test, type Locator, type Page } from '@playwright/test';

test('Couple household joins, chooses a home and replicates movement across two real browser contexts', async ({ browser }) => {
  test.setTimeout(120_000);
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const runtimeErrors: string[] = [];

  captureRuntimeErrors(host, 'host', runtimeErrors);
  captureRuntimeErrors(guest, 'guest', runtimeErrors);

  try {
    await enterIdentity(host, 'Host browser');
    await host.getByLabel('Household name').fill('Browser Couple Home');
    await host.getByRole('button', { name: 'Create household', exact: true }).click();

    const invite = host.locator('.invite-strip strong');
    await expect(invite).toHaveText(/[A-Z0-9]{6}/);
    const inviteCode = (await invite.textContent())?.trim();
    if (!inviteCode) throw new Error('Host did not receive an invite code');

    await enterIdentity(guest, 'Guest browser');
    await guest.getByRole('button', { name: 'Join', exact: true }).click();
    await guest.getByLabel('Six-character invite code').fill(inviteCode);
    await guest.getByRole('button', { name: 'Join household', exact: true }).click();

    await host.getByRole('button', { name: 'Refresh household' }).click();
    await expect(host.getByText(/2 members present/)).toBeVisible();
    await expect(guest.getByText(/2 members present/)).toBeVisible();

    await host.getByRole('button', { name: 'Propose this home' }).first().click();
    await expect(host.getByText('Shared property decision')).toBeVisible();
    await host.getByRole('button', { name: 'Choose this home' }).click();

    await guest.getByRole('button', { name: 'Refresh household' }).click();
    await expect(guest.getByText('Shared property decision')).toBeVisible();
    await guest.getByRole('button', { name: 'Choose this home' }).click();

    await host.getByRole('button', { name: 'Refresh household' }).click();
    const hostEnter = host.getByRole('button', { name: /Unlock the door · Enter Amaya Bay/ });
    const guestEnter = guest.getByRole('button', { name: /Unlock the door · Enter Amaya Bay/ });
    await expect(hostEnter).toBeVisible();
    await expect(guestEnter).toBeVisible();

    await guestEnter.click();
    await expect(guest.getByLabel('Amaya Bay 3D world')).toBeVisible();
    await expect(guest.locator('.world-loading')).toBeHidden();

    await hostEnter.click();
    await expect(host.getByLabel('Amaya Bay 3D world')).toBeVisible();
    await expect(host.locator('.world-loading')).toBeHidden();

    const hostDebug = host.getByTestId('debug-overlay');
    const guestDebug = guest.getByTestId('debug-overlay');
    await expect.poll(async () => (await readNetworkSnapshot(hostDebug)).remotePlayers.length, { timeout: 20_000 }).toBe(1);
    await expect.poll(async () => (await readNetworkSnapshot(guestDebug)).remotePlayers.length, { timeout: 20_000 }).toBe(1);

    const before = (await readNetworkSnapshot(guestDebug)).remotePlayers[0]!.position;
    await host.keyboard.down('w');
    await host.waitForTimeout(550);
    await host.keyboard.up('w');

    await expect.poll(async () => {
      const after = (await readNetworkSnapshot(guestDebug)).remotePlayers[0]?.position;
      return after ? Math.hypot(after.x - before.x, after.z - before.z) : 0;
    }, { timeout: 12_000 }).toBeGreaterThan(0.12);

    if (runtimeErrors.length > 0) {
      throw new Error(`Multiplayer browser runtime errors:\n${runtimeErrors.join('\n---\n')}`);
    }
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

async function enterIdentity(page: Page, displayName: string): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('together:game-settings', JSON.stringify({ quality: 'low', reducedMotion: true }));
  });
  await page.goto('/?renderer=webgl2', { waitUntil: 'networkidle' });
  await page.getByLabel('Display name').fill(displayName);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Create a household' })).toBeVisible();
}

function captureRuntimeErrors(page: Page, label: string, errors: string[]): void {
  page.on('pageerror', (error) => errors.push(`${label}: ${error.stack ?? error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()}`);
  });
}

type NetworkSnapshot = {
  remotePlayers: Array<{
    userId: string;
    position: { x: number; y: number; z: number };
  }>;
};

async function readNetworkSnapshot(locator: Locator): Promise<NetworkSnapshot> {
  return locator.evaluate((element) => {
    const raw = (element as HTMLElement).dataset.networkSnapshot;
    if (!raw) throw new Error('Network snapshot was not published');
    return JSON.parse(raw) as NetworkSnapshot;
  });
}


test('Friends household sustains six real browser contexts with movement and reconnect', async ({ browser }) => {
  test.setTimeout(240_000);
  const contexts = [];
  const pages: Page[] = [];
  const runtimeErrors: string[] = [];

  try {
    for (let index = 0; index < 6; index += 1) {
      const context = await browser.newContext();
      const page = await context.newPage();
      captureRuntimeErrors(page, `friend-${index}`, runtimeErrors);
      contexts.push(context);
      pages.push(page);
    }

    const host = pages[0]!;
    await enterIdentity(host, 'Friends host');
    await host.getByRole('button', { name: 'Friends' }).click();
    await host.getByLabel('Household name').fill('Six Player Friends Home');
    await host.getByRole('button', { name: 'Create household', exact: true }).click();

    const invite = host.locator('.invite-strip strong');
    await expect(invite).toHaveText(/[A-Z0-9]{6}/);
    const inviteCode = (await invite.textContent())?.trim();
    if (!inviteCode) throw new Error('Friends host did not receive an invite code');

    for (let index = 1; index < pages.length; index += 1) {
      const page = pages[index]!;
      await enterIdentity(page, `Friend ${index + 1}`);
      await page.getByRole('button', { name: 'Join', exact: true }).click();
      await page.getByLabel('Six-character invite code').fill(inviteCode);
      await page.getByRole('button', { name: 'Join household', exact: true }).click();
    }

    await host.getByRole('button', { name: 'Refresh household' }).click();
    await expect(host.getByText(/6 members present/)).toBeVisible();

    await host.getByRole('button', { name: 'Propose this home' }).first().click();
    await expect(host.getByText('Shared property decision')).toBeVisible();
    await host.getByRole('button', { name: 'Choose this home' }).click();

    for (let index = 1; index <= 3; index += 1) {
      const page = pages[index]!;
      await page.getByRole('button', { name: 'Refresh household' }).click();
      await expect(page.getByText('Shared property decision')).toBeVisible();
      await page.getByRole('button', { name: 'Choose this home' }).click();
    }

    for (const page of pages) {
      await page.getByRole('button', { name: 'Refresh household' }).click();
      const enter = page.getByRole('button', { name: /Unlock the door · Enter Amaya Bay/ });
      await expect(enter).toBeVisible();
      await enter.click();
      await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible();
      await expect(page.locator('.world-loading')).toBeHidden({ timeout: 30_000 });
    }

    const hostDebug = host.getByTestId('debug-overlay');
    await expect.poll(async () => (await readNetworkSnapshot(hostDebug)).remotePlayers.length, { timeout: 30_000 }).toBe(5);

    const before = await readNetworkSnapshot(hostDebug);
    const mover = pages[5]!;
    await mover.keyboard.down('w');
    await mover.waitForTimeout(600);
    await mover.keyboard.up('w');

    await expect.poll(async () => {
      const after = await readNetworkSnapshot(hostDebug);
      return after.remotePlayers.some((remote) => {
        const previous = before.remotePlayers.find((candidate) => candidate.userId === remote.userId);
        return previous ? Math.hypot(remote.position.x - previous.position.x, remote.position.z - previous.position.z) > 0.12 : false;
      });
    }, { timeout: 15_000 }).toBe(true);

    await pages[4]!.reload({ waitUntil: 'networkidle' });
    await expect.poll(async () => (await readNetworkSnapshot(hostDebug)).remotePlayers.length, { timeout: 20_000 }).toBeLessThanOrEqual(4);
    const rejoinEnter = pages[4]!.getByRole('button', { name: /Unlock the door · Enter Amaya Bay/ });
    if (await rejoinEnter.isVisible().catch(() => false)) await rejoinEnter.click();
    await expect(pages[4]!.getByLabel('Amaya Bay 3D world')).toBeVisible();
    await expect(pages[4]!.locator('.world-loading')).toBeHidden({ timeout: 30_000 });
    await expect.poll(async () => (await readNetworkSnapshot(hostDebug)).remotePlayers.length, { timeout: 30_000 }).toBe(5);

    if (runtimeErrors.length > 0) {
      throw new Error(`Six-player browser runtime errors:\n${runtimeErrors.join('\n---\n')}`);
    }
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
