import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

type ReviewWindow = Window & {
  __amayaReviewPlace: (x: number, z: number) => void;
  __amayaReviewFace: (yaw: number) => void;
  __amayaReviewTime: (minutes: number) => void;
  __amayaReviewWeather: (weather: string) => void;
  __amayaReviewMetrics: () => { pendingStreamingJobs: number };
};

/** Pins the clock against server sync, then waits for nearby streaming to settle. */
async function frame(page: Page, x: number, z: number, yaw: number, minutes: number, weather = 'clear'): Promise<void> {
  await page.evaluate(({ x, z, yaw, minutes, weather }) => {
    const review = window as unknown as ReviewWindow & { __artPin?: number };
    if (review.__artPin) clearInterval(review.__artPin);
    // Hold time and weather against the server's periodic sync for the duration of the capture.
    review.__artPin = window.setInterval(() => { review.__amayaReviewTime(minutes); review.__amayaReviewWeather(weather); }, 100);
    review.__amayaReviewPlace(x, z);
    review.__amayaReviewFace(yaw);
  }, { x, z, yaw, minutes, weather });
  await expect.poll(() => page.evaluate(() => (window as unknown as ReviewWindow).__amayaReviewMetrics().pendingStreamingJobs), { timeout: 60_000 }).toBeLessThan(3);
  // Weather and atmosphere ease in over a few seconds.
  await page.waitForTimeout(weather === 'clear' ? 1500 : 9000);
}

test('captures painterly art-review frames across home, streets and the bay', async ({ page }, info) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => localStorage.setItem('together:game-settings', JSON.stringify({ quality: 'medium' })));
  await page.goto('/?renderer=webgl2&worldReview=1');
  await page.getByLabel('Display name').fill('Art review');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay solo', exact: true }).click();
  await page.getByRole('button', { name: 'Explore Amaya Bay', exact: true }).click();
  await expect(page.getByLabel('Amaya Bay 3D world')).toBeVisible({ timeout: 60_000 });
  await page.waitForFunction(() => typeof (window as Partial<ReviewWindow>).__amayaReviewPlace === 'function', undefined, { timeout: 60_000 });
  await page.evaluate(() => { const overlay = document.querySelector<HTMLElement>('[data-testid=debug-overlay]'); if (overlay) overlay.style.display = 'none'; });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: info.outputPath('home-interior.png') });
  const frames: Array<[string, number, number, number, number, string?]> = [
    ['lantern-street', -30, 40, Math.PI, 10 * 60],
    ['residential-lane', -215, 107, -Math.PI / 2, 15 * 60],
    ['promenade-sunset', 100, -276, Math.PI / 2 + 0.15, 17.6 * 60],
    ['picnic-lawn', 168, 112, 0.3, 16 * 60],
    ['rain-tree-homes', -207, -75, 0, 9.5 * 60],
    ['lane-overcast', -215, 107, -Math.PI / 2, 13 * 60, 'overcast'],
    ['promenade-misty-morning', 30, -268, -Math.PI / 2 + 0.3, 6.5 * 60, 'misty_morning'],
  ];
  for (const [name, x, z, yaw, minutes, weather] of frames) {
    await frame(page, x, z, yaw, minutes, weather);
    await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
  // Third-person look at the player avatar on the promenade in warm afternoon light.
  await frame(page, 60, -268, Math.PI * 0.85, 16 * 60);
  await page.getByLabel('Amaya Bay 3D world').click();
  await page.keyboard.press('KeyV');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: info.outputPath('avatar-third-person.png') });
});
