import { expect, test } from '@playwright/test';
import { PROPERTY_WORLD_PLACEMENTS } from '../src/game/world/PropertyLocations';
import type { ActivitySessionView } from '../src/ui/game/ActivityPanel';

test('table cards preserve a mismatch through reload and complete six real pairs', async ({ page }, info) => {
  test.setTimeout(180_000);
  let saved: ActivitySessionView | undefined;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', async response => {
    if (!response.ok() || !response.url().includes('/activities/')) return;
    try {
      const value = await response.json() as ActivitySessionView;
      if (value.state?.boardGame && (!saved || (value.state.revision ?? 0) >= (saved.state.revision ?? 0))) saved = value;
    } catch { /* Unrelated responses have no activity snapshot. */ }
  });
  const enter = async () => {
    await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.world-loading')).toBeHidden({ timeout: 60_000 });
    await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
    const guide = page.getByRole('button', { name: 'Dismiss first day guide' });
    if (await guide.isVisible()) await guide.click();
    const home = PROPERTY_WORLD_PLACEMENTS.one_bhk;
    await page.evaluate(({ x, z }) => {
      const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
      review.__amayaReviewPlace(x, z); review.__amayaReviewFace(0);
    }, { x: home.center.x - .4, z: home.center.z + 1 });
    await page.getByLabel('Amaya Bay 3D world').click();
    await expect(page.locator('.interaction-prompt')).toContainText('Play a board/card game', { timeout: 30_000 });
    await page.keyboard.press('KeyE');
    const dialog = page.getByRole('dialog', { name: 'Pairs around the table' });
    await expect(dialog).toBeVisible();
    return dialog;
  };
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('Card reviewer');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  let dialog = await enter();
  await expect.poll(() => saved?.state.boardGame?.revision).toBe(0);
  const deck = saved!.state.boardGame!.cards;
  const different = deck.findIndex(card => card.pair !== deck[0]!.pair);
  const flip = async (index: number) => {
    const revision = saved!.state.boardGame!.revision;
    await dialog.getByRole('button', { name: `Card ${index + 1}, face down`, exact: true }).click();
    await expect.poll(() => saved?.state.boardGame?.revision).toBe(revision + 1);
  };
  await flip(0); await flip(different);
  await expect(dialog).toContainText('Those cards are different');
  const id = saved!.id;
  await page.reload();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  dialog = await enter();
  expect(saved!.id).toBe(id);
  await expect(dialog).toContainText('Those cards are different');
  await dialog.getByRole('button', { name: /Continue/ }).click();
  await expect.poll(() => saved?.state.boardGame?.phase).toBe('awaiting_first');
  for (let pair = 0; pair < 6; pair++) {
    const indices = deck.flatMap((card, index) => card.pair === pair ? [index] : []);
    for (const index of indices) await flip(index);
  }
  await expect(dialog).toContainText('All six pairs found');
  expect(saved!.state.status).toBe('complete');
  await page.screenshot({ path: info.outputPath('six-pairs-complete.png') });
  await dialog.getByRole('button', { name: 'Leave table' }).click();
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});
