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
