import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

interface ExportCase {
  ratio: string;
  theme: 'light' | 'dark';
  filename: string;
  width: number;
  height: number;
}

const CARD_CASES: ExportCase[] = [
  {
    ratio: '1:1',
    theme: 'light',
    filename: 'baseline-square-1-1-light.png',
    width: 2000,
    height: 2000,
  },
  {
    ratio: '1:1',
    theme: 'dark',
    filename: 'baseline-square-1-1-dark.png',
    width: 2000,
    height: 2000,
  },
  {
    ratio: '4:5',
    theme: 'light',
    filename: 'baseline-portrait-4-5-light.png',
    width: 1920,
    height: 2400,
  },
  {
    ratio: '4:5',
    theme: 'dark',
    filename: 'baseline-portrait-4-5-dark.png',
    width: 1920,
    height: 2400,
  },
  {
    ratio: '9:16',
    theme: 'light',
    filename: 'baseline-portrait-9-16-light.png',
    width: 1350,
    height: 2400,
  },
  {
    ratio: '9:16',
    theme: 'dark',
    filename: 'baseline-portrait-9-16-dark.png',
    width: 1350,
    height: 2400,
  },
  {
    ratio: '16:9',
    theme: 'light',
    filename: 'baseline-landscape-16-9-light.png',
    width: 2400,
    height: 1350,
  },
  {
    ratio: '16:9',
    theme: 'dark',
    filename: 'baseline-landscape-16-9-dark.png',
    width: 2400,
    height: 1350,
  },
  {
    ratio: '4:3',
    theme: 'light',
    filename: 'baseline-standard-4-3-light.png',
    width: 2400,
    height: 1800,
  },
  {
    ratio: '4:3',
    theme: 'dark',
    filename: 'baseline-standard-4-3-dark.png',
    width: 2400,
    height: 1800,
  },
];

async function rateDefaultAxes(page: Page) {
  const sliders = page.locator('[data-rating-scroll="stars"] [role="slider"]');
  await expect(sliders).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await sliders.nth(index).locator('span.group').nth(4).click();
  }
}

async function fillFullCardData(page: Page) {
  await rateDefaultAxes(page);
  await page.getByLabel('作品名').fill('月光奏鸣曲 (Moonlight Sonata)');
  await page.getByLabel('艺术家', { exact: true }).fill('Ludwig van Beethoven');
  await page.getByLabel('专辑', { exact: true }).fill('Piano Sonata No. 14 in C-sharp minor');
  await page.getByLabel('发行年份').fill('1801');

  const reasonInputs = page.getByLabel('评分理由（选填）');
  await reasonInputs.nth(0).fill('古典时期巅峰乐章，赋格与夜曲交织的情感波澜。');
  await reasonInputs.nth(1).fill('如月色倾泻于琉塞恩湖面，静谧中孕育风暴。');
  await reasonInputs.nth(2).fill('百听不厌的传世名作，钢琴艺术不可逾越的里程碑。');

  await page
    .getByLabel('总体评价（选填）')
    .fill(
      '第一乐章的缓板如梦似幻，第二乐章的小快板轻巧优雅，第三乐章的激板则如狂风骤雨般震撼心灵。',
    );
  await page
    .getByLabel('你和它的故事（选填）')
    .fill('无数个深夜伏案写作时的精神伴侣，每个音符都深深烙印在记忆深处。');
}

async function exportAndMatch(page: Page, exportCase: ExportCase) {
  const ratioSelect = page.getByRole('combobox', { name: '比例' });
  const themeSelect = page.getByRole('combobox', { name: '主题' });
  const downloadButton = page.getByRole('button', { name: '下载 PNG' });

  await themeSelect.selectOption(exportCase.theme);
  await ratioSelect.selectOption(exportCase.ratio);
  await page.evaluate(async () => document.fonts.ready);
  await expect(downloadButton).toBeEnabled({ timeout: 10_000 });

  const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()]);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  const png = await readFile(downloadPath!);
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(exportCase.width);
  expect(png.readUInt32BE(20)).toBe(exportCase.height);
  expect(png).toMatchSnapshot(exportCase.filename, { maxDiffPixelRatio: 0.002 });
}

test.describe('M0-VIS: deterministic visual regression', () => {
  test('matches exported PNGs for four layout families in light and dark themes', async ({
    page,
  }) => {
    await page.goto('/');
    await fillFullCardData(page);

    for (const exportCase of CARD_CASES) {
      await exportAndMatch(page, exportCase);
    }
  });

  test('matches exported PNGs for sparse reasons and minimal poster states', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('作品名').fill('月光奏鸣曲 (Moonlight Sonata)');
    await page.getByLabel('艺术家', { exact: true }).fill('Ludwig van Beethoven');
    await rateDefaultAxes(page);
    await page.getByRole('combobox', { name: '比例' }).selectOption('1:1');
    await page.getByRole('combobox', { name: '主题' }).selectOption('light');

    await page.getByLabel('总体评价（选填）').fill('');
    await page.getByLabel('你和它的故事（选填）').fill('');
    const reasonInputs = page.getByLabel('评分理由（选填）');
    await reasonInputs.nth(0).fill('');
    await reasonInputs.nth(1).fill('听感专属理由：动态自然，声场开阔。');
    await reasonInputs.nth(2).fill('');

    await exportAndMatch(page, {
      ratio: '1:1',
      theme: 'light',
      filename: 'baseline-square-sparse-reasons-light.png',
      width: 2000,
      height: 2000,
    });

    await reasonInputs.nth(1).fill('');
    await page.getByLabel('显示分项与理由').uncheck();
    await exportAndMatch(page, {
      ratio: '1:1',
      theme: 'light',
      filename: 'baseline-square-minimal-poster-light.png',
      width: 2000,
      height: 2000,
    });
  });

  test('matches the full professional-mode editor', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/');
    await page.getByLabel('专业模式').check();

    const starSlider = page.locator('[role="slider"]').first();
    await starSlider.locator('span.group').nth(7).click();

    await page.getByRole('button', { name: '添加负面项' }).click();
    const bananaSlider = page.locator('[role="slider"][aria-valuemin="-5"]').first();
    await bananaSlider.locator('span.group').nth(2).click();

    await expect(page.getByText('已保存到此浏览器', { exact: true })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole('button', { name: '下载 PNG' })).toBeEnabled({ timeout: 10_000 });
    await expect(page.locator('main').first()).toHaveScreenshot('baseline-rating-editor-full.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
  });
});
