import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

test.use({ viewport: { width: 1280, height: 800 }, launchOptions: { args: ['--use-angle=d3d11'] }, video: 'on' });
test('custom arrival leads into a playable, resumable first day', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const output = path.resolve('../.art-review/playtest-entry'); await mkdir(output, { recursive: true });
  await page.goto('http://127.0.0.1:5188/?renderer=webgl2&worldReview=1');
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible();
  expect(await page.locator('.arrival-landscape').evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(400);
  expect(await page.locator('.arrival-card').evaluate(element => getComputedStyle(element).borderTopLeftRadius)).toBe('0px');
  await page.screenshot({ path: path.join(output, 'welcome.png') });
  await page.getByLabel('Display name').fill('Mira');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'How will you arrive?' })).toBeVisible();
  await page.screenshot({ path: path.join(output, 'company.png') });
  await page.getByRole('button', { name: 'Explore Amaya Bay solo', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  const guide = page.getByTestId('first-session-guide');
  await expect(guide.getByRole('heading', { name: 'Take a look around' })).toBeVisible({ timeout: 45_000 });
  await page.waitForFunction(() => typeof (window as Window & { __amayaReviewPlace?: unknown }).__amayaReviewPlace === 'function');
  await page.evaluate(() => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void };
    review.__amayaReviewPlace(-205, 181); review.__amayaReviewFace(Math.PI / 2);
  });
  await page.getByLabel('Amaya Bay 3D world').click({ position: { x: 620, y: 350 } });
  await page.mouse.move(720, 370);
  await expect(guide.getByRole('heading', { name: 'Find your feet' })).toBeVisible();
  await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
  await expect(guide.getByRole('heading', { name: 'Make yourself at home' })).toBeVisible();
  await page.evaluate(() => {
    const review = window as Window & { __amayaReviewPlace: (x: number, z: number) => void; __amayaReviewFace: (yaw: number) => void; __amayaReviewWeather: (weather: string) => void };
    review.__amayaReviewPlace(135, -332); review.__amayaReviewFace(Math.PI);
    review.__amayaReviewWeather('monsoon_rain');
  });
  await expect(page.locator('.interaction-prompt')).toContainText('Launch kayak', { timeout: 30_000 });
  await page.keyboard.press('KeyE');
  await expect(page.locator('.memory-toast')).toContainText('closed in heavy weather');
  await expect(guide.getByRole('heading', { name: 'Make yourself at home' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.pointerLockElement === null)).toBe(true);
  await guide.getByRole('button', { name: /Open the town map/ }).click();
  await expect(page.getByRole('heading', { name: /Amaya Bay/ }).last()).toBeVisible();
  expect(await page.evaluate(() => document.pointerLockElement === null)).toBe(true);
  const beforeMenuWalk = (await page.getByTestId('debug-overlay').innerText()).match(/position [-\d.]+, [-\d.]+/)?.[0];
  await page.keyboard.down('KeyW'); await page.waitForTimeout(400); await page.keyboard.up('KeyW');
  expect((await page.getByTestId('debug-overlay').innerText()).match(/position [-\d.]+, [-\d.]+/)?.[0]).toBe(beforeMenuWalk);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: path.join(output, 'first-day-world.png') });
  await page.getByRole('button', { name: 'Dismiss first day guide' }).click();
  await expect(guide).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  await expect(page.getByRole('button', { name: 'First day guide ↗' })).toBeVisible({ timeout: 45_000 });
  expect(await page.evaluate(() => Object.entries(localStorage).some(([key, value]) => key.startsWith('together:first-day:v1:') && !key.endsWith(':hidden') && JSON.parse(value).includes('walk')))).toBe(true);
  await page.getByRole('button', { name: 'First day guide ↗' }).click();
  await expect(guide.getByRole('heading', { name: 'Take a look around' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('arrival remains usable in a small browser window', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5188/');
  await expect(page.getByLabel('Display name')).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('the ordinary browser URL selects a working renderer', async ({ page }) => {
  test.setTimeout(120_000);
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') console.log('Browser graphics:', message.text().slice(0, 600)); });
  await page.goto('http://127.0.0.1:5188/?worldReview=1');
  await page.getByLabel('Display name').fill('Browser playtest');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  await expect(page.getByTestId('first-session-guide')).toBeVisible({ timeout: 45_000 });
  await expect.poll(async () => Number((await page.getByTestId('debug-overlay').innerText()).match(/(\d+) draws/)?.[1] ?? 0), { timeout: 45_000 }).toBeGreaterThan(50);
  await expect.poll(() => page.evaluate(() => (window as Window & { __amayaReviewMetrics: () => { pendingStreamingJobs: number } }).__amayaReviewMetrics().pendingStreamingJobs), { timeout: 90_000 }).toBe(0);
  await page.waitForTimeout(3000);
  console.log('Default browser renderer:', (await page.getByTestId('debug-overlay').innerText()).split('\n')[0]);
  await page.screenshot({ path: path.resolve('../.art-review/playtest-entry/default-browser-world.png') });
});
