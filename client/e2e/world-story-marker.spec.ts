import { expect, test } from '@playwright/test';

type Access = { base: string; householdId: string; headers: Record<string, string> };

test('an active story lights a lantern over its place and arriving records the visit', async ({ page }) => {
  test.setTimeout(180_000);
  let access: Access | undefined;
  page.on('request', request => {
    const match = /^(.*)\/api\/households\/([0-9a-f-]{36})\//.exec(request.url());
    const headers = request.headers(), auth: Record<string, string> = {};
    if (headers.authorization) auth.authorization = headers.authorization;
    if (headers['x-dev-user-id']) auth['x-dev-user-id'] = headers['x-dev-user-id'];
    if (match && !access && Object.keys(auth).length > 0) access = { base: match[1]!, householdId: match[2]!, headers: auth };
  });
  await page.addInitScript(() => localStorage.setItem('together:game-settings', JSON.stringify({ quality: 'low', reducedMotion: true })));
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('Story reviewer');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible({ timeout: 60_000 });
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function', undefined, { timeout: 60_000 });
  await expect.poll(() => access !== undefined).toBe(true);
  const api = (path: string) => `${access!.base}/api/households/${access!.householdId}${path}`;
  const eligible = await (await page.request.get(api('/stories/eligible'), { headers: access!.headers })).json() as Array<{ id: string }>;
  expect(eligible.map(story => story.id)).toContain('move_in_day');
  const started = await page.request.post(api('/stories/move_in_day/start'), { headers: access!.headers });
  expect(started.ok()).toBe(true);
  // Opening and closing the story panel refreshes the active story; the player already stands at home.
  await page.getByLabel('Amaya Bay 3D world').click();
  await page.keyboard.press('KeyJ');
  await page.keyboard.press('KeyJ');
  await expect.poll(async () => {
    const stories = await (await page.request.get(api('/stories'), { headers: access!.headers })).json() as Array<{ eventId: string; taskState: Record<string, string> }>;
    return stories.find(story => story.eventId === 'move_in_day')?.taskState.enter;
  }, { timeout: 30_000 }).toBe('complete');
});
