import { expect, test } from '@playwright/test';

const artifactUrl = new URL('../dist-minitool/index.html', import.meta.url);

test('downsamples a selected cover offline and previews only the compressed blob', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(artifactUrl.href);

  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1000;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    const gradient = context.createLinearGradient(0, 0, 2000, 1000);
    gradient.addColorStop(0, '#4f46e5');
    gradient.addColorStop(1, '#14b8a6');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 2000, 1000);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('PNG encode failed'))),
        'image/png',
      ),
    );
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'cover.png', { type: 'image/png' }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('Cover input missing');
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await expect(page.getByTestId('cover-status')).toContainText('封面已压缩：1280×640');
  const cover = page.getByRole('img', { name: /本地封面/ });
  await expect(cover).toHaveAttribute('src', /^blob:/);
  expect(await cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1280);
  expect(await cover.evaluate((image: HTMLImageElement) => image.naturalHeight)).toBe(640);

  await page.getByRole('button', { name: '移除封面' }).click();
  await expect(cover).toHaveCount(0);
});

test('applies safe-area variables and visualViewport keyboard fallback', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 480,
        addEventListener() {},
        removeEventListener() {},
      },
    });
  });
  await page.goto(artifactUrl.href);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--safe-area-inset-top', '20px');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '12px');
  });

  await expect(page.locator('html')).toHaveClass(/keyboard-open/);
  const measurements = await page.getByTestId('minitool-shell').evaluate((shell) => ({
    top: Number.parseFloat(getComputedStyle(shell).paddingTop),
    bottom: Number.parseFloat(getComputedStyle(shell).paddingBottom),
    keyboard: getComputedStyle(document.documentElement).getPropertyValue('--keyboard-offset'),
  }));
  expect(measurements.top).toBe(38);
  expect(measurements.bottom).toBeGreaterThan(150);
  expect(Number.parseFloat(measurements.keyboard)).toBeGreaterThanOrEqual(120);
});
