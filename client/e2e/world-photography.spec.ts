import { expect, test } from '@playwright/test';
import type { ActivitySessionView } from '../src/ui/game/ActivityPanel';

test.use({ viewport: { width: 1280, height: 800 } });
test('photography frames through movement and saves one real image after a lost Memory reply', async ({ page }, info) => {
  test.setTimeout(180_000);
  let saved: ActivitySessionView | undefined;
  let imageUploads = 0, lostReply = false;
  const requests: Record<string, unknown>[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/memory-images/')) imageUploads++; });
  page.on('response', async response => {
    if (!response.ok() || !response.url().includes('/activities')) return;
    try { const value = await response.json() as ActivitySessionView; if (value.activityId === 'photography') saved = value; } catch { /* Deliberate lost replies have no body. */ }
  });
  await page.route('**/api/households/*/memories', async route => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    requests.push(route.request().postDataJSON() as Record<string, unknown>);
    if (!lostReply) { const accepted = await route.fetch(); expect(accepted.ok()).toBe(true); lostReply = true; await route.abort('failed'); }
    else await route.continue();
  });
  await page.addInitScript(() => localStorage.setItem('together:game-settings', JSON.stringify({ quality: 'low', reducedMotion: true })));
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('Photo reviewer');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  const canvas = page.getByLabel('Amaya Bay 3D world');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.world-loading')).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Dismiss first day guide' }).click();
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  await page.evaluate(() => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
    review.__amayaReviewPlace(40, -278); review.__amayaReviewFace(0);
  });
  await canvas.click();
  await expect(page.locator('.interaction-prompt')).toContainText('Frame a waterfront photo');
  await page.keyboard.press('KeyE');
  await page.getByRole('button', { name: 'Frame the scene', exact: true }).click();
  const outing = page.getByRole('complementary', { name: 'Photography outing' });
  await expect(outing).toBeVisible();
  await canvas.click(); await page.keyboard.down('KeyW'); await page.waitForTimeout(1200); await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyP');
  await expect(outing).toContainText('retry the original photo', { timeout: 20_000 });
  expect(saved!.state.status).toBe('active');
  await page.keyboard.press('KeyP');
  await expect.poll(() => saved?.state.status).toBe('complete');
  expect(saved!.state.photographyMemoryId).toBeTruthy();
  expect(imageUploads).toBe(1); expect(requests).toHaveLength(2); expect(requests[1]).toEqual(requests[0]);
  await page.keyboard.press('Escape'); await page.keyboard.press('KeyB');
  const image = page.getByRole('dialog', { name: 'Household Memory Book' }).locator('img').first();
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath('photography-memory.png') });
  expect(errors).toEqual([]);
});
