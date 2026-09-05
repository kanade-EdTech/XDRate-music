import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

interface CardCase {
  ratio: string;
  theme: 'light' | 'dark';
  family: 'landscape' | 'standard' | 'square' | 'portrait';
  filename: string;
  width: number;
  height: number;
}

const HANDOVER_ROOT = path.resolve('doc_CN', 'artifacts', 'ui02_handover');
const BEFORE_DIR = path.join(HANDOVER_ROOT, 'before');
const AFTER_DIR = path.join(HANDOVER_ROOT, 'after');

const CARD_CASES: CardCase[] = [
  {
    ratio: '16:9',
    theme: 'light',
    family: 'landscape',
    filename: 'card-landscape-16-9-light.png',
    width: 2400,
    height: 1350,
  },
  {
    ratio: '16:9',
    theme: 'dark',
    family: 'landscape',
    filename: 'card-landscape-16-9-dark.png',
    width: 2400,
    height: 1350,
  },
  {
    ratio: '4:3',
    theme: 'light',
    family: 'standard',
    filename: 'card-standard-4-3-light.png',
    width: 2400,
    height: 1800,
  },
  {
    ratio: '4:3',
    theme: 'dark',
    family: 'standard',
    filename: 'card-standard-4-3-dark.png',
    width: 2400,
    height: 1800,
  },
  {
    ratio: '1:1',
    theme: 'light',
    family: 'square',
    filename: 'card-square-1-1-light.png',
    width: 2000,
    height: 2000,
  },
  {
    ratio: '1:1',
    theme: 'dark',
    family: 'square',
    filename: 'card-square-1-1-dark.png',
    width: 2000,
    height: 2000,
  },
  {
    ratio: '4:5',
    theme: 'light',
    family: 'portrait',
    filename: 'card-portrait-4-5-light.png',
    width: 1920,
    height: 2400,
  },
  {
    ratio: '4:5',
    theme: 'dark',
    family: 'portrait',
    filename: 'card-portrait-4-5-dark.png',
    width: 1920,
    height: 2400,
  },
];

async function rateDefaultAxes(page: Page) {
  const sliders = page.locator('[data-rating-scroll="stars"] [role="slider"]');
  await expect(sliders).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await sliders.nth(index).locator('span.group').nth(4).click();
  }
}

async function fillCardFixture(page: Page) {
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

async function exportCard(page: Page, cardCase: CardCase) {
  await page.getByRole('combobox', { name: '主题' }).selectOption(cardCase.theme);
  await page.getByRole('combobox', { name: '比例' }).selectOption(cardCase.ratio);
  await page.evaluate(async () => document.fonts.ready);

  const downloadButton = page.getByRole('button', { name: '下载 PNG' });
  await expect(downloadButton).toBeEnabled({ timeout: 10_000 });
  const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()]);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  const png = await readFile(downloadPath!);
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(cardCase.width);
  expect(png.readUInt32BE(20)).toBe(cardCase.height);
  expect(png).toMatchSnapshot(cardCase.filename, { maxDiffPixelRatio: 0.002 });
  await copyFile(downloadPath!, path.join(AFTER_DIR, cardCase.filename));
}

async function cropEvidence(
  page: Page,
  sourcePath: string,
  outputPath: string,
  crop: { x: number; y: number; width: number; height: number },
) {
  const source = await readFile(sourcePath);
  const dataUrl = `data:image/png;base64,${source.toString('base64')}`;
  await page.setViewportSize({ width: crop.width, height: crop.height });
  await page.setContent(`
    <style>
      html, body { margin: 0; width: ${crop.width}px; height: ${crop.height}px; overflow: hidden; }
      #crop { position: relative; width: ${crop.width}px; height: ${crop.height}px; overflow: hidden; }
      #crop img { position: absolute; left: -${crop.x}px; top: -${crop.y}px; width: 1152px; max-width: none; }
    </style>
    <div id="crop"><img alt="UI evidence crop" src="${dataUrl}" /></div>
  `);
  await expect(page.getByAltText('UI evidence crop')).toBeVisible();
  await page.locator('#crop').screenshot({ path: outputPath });
}

async function writeEvidenceManifest() {
  const evidence: Array<{
    path: string;
    bytes: number;
    sha256: string;
  }> = [];

  for (const phase of ['before', 'after'] as const) {
    const directory = path.join(HANDOVER_ROOT, phase);
    const filenames = (await readdir(directory))
      .filter((filename) => filename.endsWith('.png'))
      .sort();
    for (const filename of filenames) {
      const filePath = path.join(directory, filename);
      const [contents, metadata] = await Promise.all([readFile(filePath), stat(filePath)]);
      evidence.push({
        path: `${phase}/${filename}`,
        bytes: metadata.size,
        sha256: createHash('sha256').update(contents).digest('hex'),
      });
    }
  }

  await writeFile(
    path.join(HANDOVER_ROOT, 'manifest.json'),
    `${JSON.stringify(
      {
        task: 'V02-UI-02',
        generatedBy: 'npm run handover:ui02',
        fixture: 'Beethoven fixed visual fixture shared with e2e/baselines.spec.ts',
        evidence,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

test.describe('V02-UI-02 reproducible visual handover', () => {
  test.beforeAll(async () => {
    await mkdir(BEFORE_DIR, { recursive: true });
    await mkdir(AFTER_DIR, { recursive: true });
    await Promise.all([
      ...CARD_CASES.map((cardCase) => access(path.join(BEFORE_DIR, cardCase.filename))),
      access(path.join(BEFORE_DIR, 'editor-professional-full-light.png')),
    ]);
  });

  test.afterAll(async () => {
    await writeEvidenceManifest();
  });

  test('compares all four card families in light and dark themes', async ({ page }) => {
    await page.goto('/');
    await fillCardFixture(page);

    for (const cardCase of CARD_CASES) {
      await exportCard(page, cardCase);
    }
  });

  test('compares the professional editor and captures star and banana controls', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/');
    await page.getByLabel('专业模式').check();
    await page.locator('[role="slider"]').first().locator('span.group').nth(7).click();
    await page.getByRole('button', { name: '添加负面项' }).click();
    await page
      .locator('[role="slider"][aria-valuemin="-5"]')
      .first()
      .locator('span.group')
      .nth(2)
      .click();

    await expect(page.getByText('已保存到此浏览器', { exact: true })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole('button', { name: '下载 PNG' })).toBeEnabled({
      timeout: 10_000,
    });

    const main = page.locator('main').first();
    await expect(main).toHaveScreenshot('editor-professional-full-light.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.002,
    });
    await main.screenshot({
      path: path.join(AFTER_DIR, 'editor-professional-full-light.png'),
      animations: 'disabled',
    });

    await page.getByRole('combobox', { name: '主题' }).selectOption('dark');
    await main.screenshot({
      path: path.join(AFTER_DIR, 'editor-professional-full-dark.png'),
      animations: 'disabled',
    });
    await page
      .locator('[data-rating-scroll="stars"] [role="slider"]')
      .first()
      .screenshot({ path: path.join(AFTER_DIR, 'control-stars-dark.png') });
    await page
      .locator('[role="slider"][aria-valuemin="-5"]')
      .first()
      .screenshot({ path: path.join(AFTER_DIR, 'control-bananas-dark.png') });

    const beforeEditor = path.join(BEFORE_DIR, 'editor-professional-full-light.png');
    const afterEditor = path.join(AFTER_DIR, 'editor-professional-full-light.png');
    await cropEvidence(page, beforeEditor, path.join(BEFORE_DIR, 'control-stars-light.png'), {
      x: 280,
      y: 760,
      width: 440,
      height: 230,
    });
    await cropEvidence(page, afterEditor, path.join(AFTER_DIR, 'control-stars-light.png'), {
      x: 280,
      y: 760,
      width: 440,
      height: 230,
    });
    await cropEvidence(page, beforeEditor, path.join(BEFORE_DIR, 'control-bananas-light.png'), {
      x: 330,
      y: 3090,
      width: 440,
      height: 300,
    });
    await cropEvidence(page, afterEditor, path.join(AFTER_DIR, 'control-bananas-light.png'), {
      x: 330,
      y: 3090,
      width: 440,
      height: 300,
    });
  });
});
