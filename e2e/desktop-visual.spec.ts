import { test, expect, type Locator, type Page } from '@playwright/test';
import * as path from 'node:path';
import * as fs from 'node:fs';

const HANDOVER_DIR = path.resolve('doc_CN', 'artifacts', 'desktop_handover');

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080, deviceScaleFactor: 1 },
  { name: '1600x900', width: 1600, height: 900, deviceScaleFactor: 1 },
  { name: '1366x768', width: 1366, height: 768, deviceScaleFactor: 1 },
  { name: '1280x720', width: 1280, height: 720, deviceScaleFactor: 1 },
  { name: '1280x720-scale125', width: 1024, height: 576, deviceScaleFactor: 1.25 },
  { name: '1280x720-scale150', width: 853, height: 480, deviceScaleFactor: 1.5 },
] as const;

test.describe('Desktop visual and responsive handover', () => {
  test.beforeAll(() => {
    fs.mkdirSync(HANDOVER_DIR, { recursive: true });
  });

  async function savePageScreenshot(page: Page, filename: string) {
    await page.screenshot({
      path: path.join(HANDOVER_DIR, filename),
      fullPage: true,
      scale: 'css',
    });
  }

  async function saveLocatorScreenshot(locator: Locator, filename: string) {
    await locator.screenshot({ path: path.join(HANDOVER_DIR, filename) });
  }

  async function fillStandardSample(page: Page) {
    await page.getByLabel('作品名').fill('月光奏鸣曲 (Moonlight Sonata)');
    await page.getByLabel('艺术家', { exact: true }).fill('Ludwig van Beethoven');
    await page.getByLabel('专辑', { exact: true }).fill('Piano Sonata No. 14');
    await page.getByLabel('发行年份').fill('1801');

    const starSliders = page.locator('[data-rating-scroll="stars"] [role="slider"]');
    await starSliders.nth(0).locator('span.group').nth(7).click();
    await starSliders.nth(1).locator('span.group').nth(8).click();
    await starSliders.nth(2).locator('span.group').nth(6).click();
  }

  async function expectHorizontalReachability(page: Page) {
    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);

    const clippedControls = await page
      .locator('button, input, select, textarea, a[href], [role="slider"]')
      .evaluateAll((elements) =>
        elements.flatMap((element) => {
          const htmlElement = element as HTMLElement;
          const style = window.getComputedStyle(htmlElement);
          if (style.display === 'none' || style.visibility === 'hidden') return [];

          const rect = htmlElement.getBoundingClientRect();
          const clipped =
            rect.width <= 0 || rect.height <= 0 || rect.left < -1 || rect.right > innerWidth + 1;
          if (!clipped) return [];

          return [
            htmlElement.getAttribute('aria-label') ||
              htmlElement.textContent?.trim().slice(0, 80) ||
              htmlElement.tagName,
          ];
        }),
      );
    expect(clippedControls).toEqual([]);
  }

  test('captures desktop resolutions and simulated DPR scaling without horizontal clipping', async ({
    browser,
  }) => {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:4174',
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
      });
      const page = await context.newPage();

      await page.goto('/');
      await fillStandardSample(page);
      await expectHorizontalReachability(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await savePageScreenshot(page, `desktop-${viewport.name}-light-zh.png`);

      await context.close();
    }
  });

  test('captures both themes and languages at the reference desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    await page.getByLabel('作品名').fill('Clair de Lune');
    await page.getByLabel('艺术家', { exact: true }).fill('Claude Debussy');
    const starSliders = page.locator('[data-rating-scroll="stars"] [role="slider"]');
    await starSliders.nth(0).locator('span.group').nth(8).click();

    await page.getByRole('combobox', { name: '主题' }).selectOption('dark');
    await savePageScreenshot(page, 'desktop-1920x1080-dark-zh.png');

    await page.locator('main select').first().selectOption('en');
    await savePageScreenshot(page, 'desktop-1920x1080-dark-en.png');

    await page.getByRole('combobox', { name: 'Theme' }).selectOption('light');
    await savePageScreenshot(page, 'desktop-1920x1080-light-en.png');
  });

  test('changes from two columns to one when the desktop window is narrowed', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const editorLayout = page.getByTestId('rating-editor-layout');
    const columnCount = () =>
      editorLayout.evaluate(
        (element) =>
          window.getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,
      );

    await expect.poll(columnCount).toBe(2);

    await page.setViewportSize({ width: 960, height: 720 });
    await expect.poll(columnCount).toBe(1);
    await expectHorizontalReachability(page);

    await page.setViewportSize({ width: 720, height: 720 });
    await expect.poll(columnCount).toBe(1);
    await expectHorizontalReachability(page);
    await savePageScreenshot(page, 'desktop-720x720-single-column-light-zh.png');
  });

  test('captures the archive panel in browser mode', async ({ page }) => {
    await page.goto('/');
    const archivePanel = page
      .getByRole('heading', { name: '存档与模板', exact: true })
      .locator('xpath=ancestor::section[1]');

    await expect(archivePanel).toBeVisible();
    await saveLocatorScreenshot(archivePanel, 'panel-archive-browser-mode.png');
  });

  test('never reports an unassociated disk file as saved', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> }).__TAURI_INTERNALS__ =
        {};
    });

    await page.goto('/');
    const archivePanel = page
      .getByRole('heading', { name: '存档与模板', exact: true })
      .locator('xpath=ancestor::section[1]');

    await expect(archivePanel.getByText('尚未关联文件', { exact: true })).toBeVisible();
    await expect(archivePanel.getByText('有未保存更改', { exact: true })).toHaveCount(0);
    await page.getByLabel('作品名').fill('尚未保存的桌面评价');
    await expect(archivePanel.getByText('有未保存更改', { exact: true })).toBeVisible();
    await expect(archivePanel.getByText('已保存到磁盘', { exact: true })).toHaveCount(0);
    await saveLocatorScreenshot(archivePanel, 'panel-archive-desktop-unassociated.png');
  });
});
