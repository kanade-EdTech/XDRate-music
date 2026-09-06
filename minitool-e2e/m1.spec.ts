import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const artifactUrl = new URL('../dist-minitool/index.html', import.meta.url);

test('final M1 artifact is classic-script, relative-resource, and offline', async ({ page }) => {
  const html = await readFile(artifactUrl, 'utf8');
  expect(html).toContain('<script defer src="./assets/app.js"></script>');
  expect(html).toContain('<link rel="stylesheet" href="./assets/style.css" />');
  expect(html).not.toContain('type="module"');
  expect(html).not.toMatch(/https?:\/\//);

  await page.goto(artifactUrl.href);
  await expect(page.getByRole('heading', { name: '多维音乐评价' })).toBeVisible();
  await expect(page.getByText(/未检测到 JSBridge/)).toBeVisible();
  await expect(page.getByText(/不会联网/)).toBeVisible();
});

test('calculates the 100-point score and restores a complete local draft', async ({ page }) => {
  await page.goto(artifactUrl.href);
  await page.getByLabel('作品名').fill('海棠仙');
  await page.getByRole('button', { name: '艺术品质 评分 8', exact: true }).click();
  await page.getByRole('button', { name: '听感 评分 7', exact: true }).click();
  await page.getByRole('button', { name: '个人喜好 评分 9', exact: true }).click();
  await expect(page.getByTestId('overall-score')).toHaveText('80.0');
  await expect(page.getByText('草稿已自动保存')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('作品名')).toHaveValue('海棠仙');
  await expect(page.getByTestId('overall-score')).toHaveText('80.0');
  await expect(page.getByText(/已恢复上次草稿|草稿已自动保存/)).toBeVisible();
});

test('keeps ten positive levels and five deduction levels touchable without horizontal scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto(artifactUrl.href);

  const firstStarGroup = page.getByRole('group', { name: /艺术品质: 加分项/ });
  const stars = firstStarGroup.getByRole('button');
  await expect(stars).toHaveCount(10);
  const lastStarBox = await stars.nth(9).boundingBox();
  expect(lastStarBox).not.toBeNull();
  expect(lastStarBox!.height).toBeGreaterThanOrEqual(44);
  expect(lastStarBox!.x + lastStarBox!.width).toBeLessThanOrEqual(360);

  await page.getByRole('button', { name: '添加扣分项' }).click();
  const bananas = page.getByRole('group', { name: '其他讨厌' }).getByRole('button');
  await expect(bananas).toHaveCount(5);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('generates a PNG and calls only the documented album-save bridge chain', async ({ page }) => {
  await page.addInitScript(() => {
    const callLog: Array<{ api: string; value: string }> = [];
    Object.defineProperty(window, '__MINITOOL_CALL_LOG__', { value: callLog });
    Object.defineProperty(window, 'xhs', {
      value: {
        miniTool: {
          async writeTempFile(options: { data: string }) {
            callLog.push({ api: 'writeTempFile', value: options.data });
            return { filePath: 'xhs://temp/m1-engineering.png' };
          },
          async saveImageToPhotosAlbum(options: { filePath: string }) {
            callLog.push({ api: 'saveImageToPhotosAlbum', value: options.filePath });
            return { errMsg: 'saveImageToPhotosAlbum:ok' };
          },
        },
      },
    });
  });

  await page.goto(artifactUrl.href);
  await expect(page.getByText('JSBridge 已检测到')).toBeVisible();
  await page.getByRole('button', { name: '生成评分卡 PNG' }).click();
  const preview = page.getByRole('img', { name: '评分卡 PNG 预览' });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('src', /^data:image\/png;base64,/);

  await page.getByRole('button', { name: '保存评分卡到系统相册' }).click();
  await expect(page.getByText('已保存到系统相册')).toBeVisible();
  const calls = await page.evaluate(() =>
    (
      window as unknown as { __MINITOOL_CALL_LOG__: Array<{ api: string; value: string }> }
    ).__MINITOOL_CALL_LOG__.map((call) => ({
      api: call.api,
      value: call.api === 'writeTempFile' ? call.value.slice(0, 22) : call.value,
    })),
  );
  expect(calls).toEqual([
    { api: 'writeTempFile', value: 'data:image/png;base64,' },
    { api: 'saveImageToPhotosAlbum', value: 'xhs://temp/m1-engineering.png' },
  ]);
});
