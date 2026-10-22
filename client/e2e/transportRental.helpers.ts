import { expect, type Page } from '@playwright/test';
import type { ActivitySessionView } from '../src/ui/game/ActivityPanel';

export const rentalSites = {
  cycling: { x: -40.1, z: 46.4, yaw: 0, prompt: 'Take a bicycle', dialog: 'Bicycle rental' },
  kayak: { x: 137.5, z: -333, yaw: Math.PI, prompt: 'Launch kayak', dialog: 'Kayak rental' },
  scooter_ride: { x: 55, z: -259, yaw: Math.PI, prompt: 'Rent a scooter', dialog: 'Scooter rental' },
} as const;

export function observeRentalSessions(page: Page) {
  const sessions = new Map<string, ActivitySessionView>();
  page.on('response', async response => {
    if (!response.ok() || !response.url().includes('/activities')) return;
    try {
      const payload = await response.json() as ActivitySessionView | ActivitySessionView[];
      for (const value of Array.isArray(payload) ? payload : [payload]) {
        if (!value?.state?.transportRental) continue;
        const previous = sessions.get(value.activityId);
        const newerSession = previous && Date.parse(value.createdAt) > Date.parse(previous.createdAt);
        const newerRevision = previous?.id === value.id && (value.state.revision ?? 0) >= (previous.state.revision ?? 0);
        if (!previous || newerSession || newerRevision) sessions.set(value.activityId, value);
      }
    } catch { /* Lost responses are reconciled by the real client. */ }
  });
  return sessions;
}

export async function enterRentalWorld(page: Page, name: string) {
  await page.addInitScript(() => localStorage.setItem('together:game-settings', JSON.stringify({ quality: 'low', reducedMotion: true })));
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill(name);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  await readyRentalWorld(page);
}

export async function readyRentalWorld(page: Page) {
  await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.world-loading')).toBeHidden({ timeout: 60_000 });
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  const guide = page.getByRole('button', { name: 'Dismiss first day guide' });
  if (await guide.isVisible()) await guide.click();
}

export async function openRental(page: Page, kind: keyof typeof rentalSites) {
  const site = rentalSites[kind];
  await page.evaluate(({ x, z, yaw }) => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
    review.__amayaReviewPlace(x, z); review.__amayaReviewFace(yaw);
  }, site);
  await page.getByLabel('Amaya Bay 3D world').click();
  await expect(page.locator('.interaction-prompt')).toContainText(site.prompt);
  await page.keyboard.press('KeyE');
  const panel = page.getByRole('dialog', { name: site.dialog, exact: true });
  await expect(panel).toBeVisible();
  return panel;
}
