import { expect, test } from '@playwright/test';

const artifactUrl = new URL('../dist-minitool/index.html', import.meta.url);
const workspaceKey = 'xdrate.music.minitool.workspace.v1';
const catalogKey = 'xdrate.music.minitool.content-templates.v1';

test('first launch seeds the ordinary 海棠仙 template and opens its exact 80.0 fixture', async ({
  page,
}) => {
  await page.goto(artifactUrl.href);

  await expect(page.getByLabel('作品名')).toHaveValue('海棠仙');
  await expect(page.getByLabel('艺术家')).toHaveValue('纯白；星尘');
  await expect(page.getByLabel('专辑')).toHaveValue('中华少女');
  await expect(page.getByLabel('发行年份')).toHaveValue('2004');
  await expect(page.getByTestId('overall-score')).toHaveText('80.0');
  await expect(page.getByText('采用了高几个八度的离调')).toBeVisible();
  await expect(page.getByText('当时全新出炉的星尘V4')).toBeVisible();
  await expect(page.getByText('禁忌组99')).toBeVisible();
  await expect(page.getByText(/17年网易云从甲铁城/)).toBeVisible();
  await expect(page.locator('[data-template-id="template-haitangxian-v1"]')).toHaveCount(1);
});

test('a recent draft wins over the seed and current content round-trips through a cover-free template', async ({
  page,
}) => {
  await page.goto(artifactUrl.href);
  await page.getByLabel('作品名').fill('最近修改');
  await expect(page.getByText('草稿已自动保存')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('作品名')).toHaveValue('最近修改');

  await page.getByLabel('新模板名称', { exact: true }).fill('我的模板');
  await page.getByRole('button', { name: '将当前内容存为模板' }).click();
  await expect(page.getByText('内容模板已保存')).toBeVisible();
  const storedCover = await page.evaluate((key) => {
    const stored = JSON.parse(localStorage.getItem(key) || '{}') as {
      templates?: Array<{ name: string; rating: { work: { coverDataUrl: string | null } } }>;
    };
    return stored.templates?.find((template) => template.name === '我的模板')?.rating.work
      .coverDataUrl;
  }, catalogKey);
  expect(storedCover).toBeNull();

  await page.getByLabel('作品名').fill('套用前修改');
  page.once('dialog', (dialog) => dialog.accept());
  const row = page
    .locator('.template-row')
    .filter({ has: page.getByRole('textbox', { name: '新模板名称: 我的模板' }) });
  await row.getByRole('button', { name: '套用' }).click();
  await expect(page.getByLabel('作品名')).toHaveValue('最近修改');
  await expect(page.getByText(/模板已套用/)).toBeVisible();
});

test('the startup template can be renamed and deleted without resurrection', async ({ page }) => {
  await page.goto(artifactUrl.href);
  let row = page.locator('[data-template-id="template-haitangxian-v1"]');
  await row.getByRole('textbox').fill('我的开局');
  await row.getByRole('button', { name: '改名' }).click();
  await expect(page.getByText('模板已改名')).toBeVisible();

  await page.reload();
  row = page.locator('[data-template-id="template-haitangxian-v1"]');
  await expect(row.getByRole('textbox')).toHaveValue('我的开局');
  await expect(page.getByRole('textbox', { name: '新模板名称: 海棠仙' })).toHaveCount(0);

  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: '删除' }).click();
  await expect(page.getByText(/模板已删除/)).toBeVisible();
  await expect(page.getByTestId('template-list').locator('.template-row')).toHaveCount(0);

  await page.addInitScript((key) => localStorage.removeItem(key), workspaceKey);
  await page.reload();
  await expect(page.getByLabel('作品名')).toHaveValue('');
  await expect(page.getByTestId('template-list').locator('.template-row')).toHaveCount(0);
  await expect(page.getByText('暂无内容模板。')).toBeVisible();
});

test('template controls remain reachable without horizontal overflow at 360px in both languages', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto(artifactUrl.href);
  const row = page.locator('[data-template-id="template-haitangxian-v1"]');
  await expect(row.getByRole('button')).toHaveCount(3);

  const language = page.getByLabel('界面语言');
  await language.selectOption('en');
  await expect(page.getByRole('heading', { name: 'Content templates' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  for (const button of await row.getByRole('button').all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test('adds and removes positive items while keeping icon metaphors out of UI descriptions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto(artifactUrl.href);
  await expect(page.locator('.axis-list .axis-card')).toHaveCount(3);

  await page.getByRole('button', { name: '添加加分项' }).click();
  await expect(page.locator('.axis-list .axis-card')).toHaveCount(4);
  await expect(page.getByLabel('评分模式')).toHaveValue('custom');
  const added = page.locator('.axis-list .axis-card').last();
  await added
    .getByRole('textbox', { name: /加分项/ })
    .first()
    .fill('创新表达');
  await added.getByRole('button', { name: '创新表达 评分 10' }).click();
  await expect(page.getByTestId('overall-score')).toHaveText('85.0');

  await page.waitForTimeout(400);
  await page.reload();
  await expect(page.getByLabel('评分模式')).toHaveValue('custom');
  await expect(page.locator('.axis-list .axis-card')).toHaveCount(4);
  await expect(page.getByTestId('overall-score')).toHaveText('85.0');

  const restoredAdded = page.locator('.axis-list .axis-card').last();
  await expect(restoredAdded.getByRole('textbox', { name: /加分项/ }).first()).toHaveValue(
    '创新表达',
  );
  await restoredAdded.getByRole('button', { name: /移除加分项/ }).click();
  await expect(page.locator('.axis-list .axis-card')).toHaveCount(3);
  await expect(page.getByTestId('overall-score')).toHaveText('80.0');
  await expect(page.locator('body')).not.toContainText('香蕉皮');
  await expect(page.locator('body')).not.toContainText('五角星');

  await page.getByLabel('界面语言').selectOption('en');
  await expect(page.locator('body')).not.toContainText(/banana[- ]?peel/i);
  await expect(page.locator('body')).not.toContainText(/five[- ]?pointed star/i);
});

test('enforces the complete one-to-twelve positive-item range', async ({ page }) => {
  await page.goto(artifactUrl.href);
  const items = page.locator('.axis-list .axis-card');
  const add = page.getByRole('button', { name: '添加加分项' });

  await expect(items).toHaveCount(3);
  for (let count = 3; count < 12; count += 1) await add.click();
  await expect(items).toHaveCount(12);
  await expect(add).toBeDisabled();
  await expect(page.getByLabel('评分模式')).toHaveValue('custom');

  for (let count = 12; count > 1; count -= 1) {
    await items
      .last()
      .getByRole('button', { name: /移除加分项/ })
      .click();
  }
  await expect(items).toHaveCount(1);
  await expect(items.getByRole('button', { name: /移除加分项/ })).toBeDisabled();
});
