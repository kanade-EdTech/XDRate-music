import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';

async function rateDefaultAxes(page: Page, scores: readonly number[] = [7, 7, 8]) {
  const sliders = page.locator('[data-rating-scroll="stars"] [role="slider"]');
  await expect(sliders).toHaveCount(scores.length);
  for (let index = 0; index < scores.length; index += 1) {
    await sliders
      .nth(index)
      .locator('span.group')
      .nth(scores[index] - 1)
      .click();
  }
}

test('completes full happy path without third-party requests or a11y violations', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      externalRequests.push(request.url());
    }
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('app-version')).toContainText(
    '版本 0.3.3 · Kehun_EdTech · 浏览器模式',
  );
  await expect(page.getByRole('heading', { name: '综合评分' })).toBeVisible();
  await expect(page.getByText('无法计算：请至少为一个 LV1–LV6 评价轴打 1–10 分。')).toBeVisible();
  await rateDefaultAxes(page);
  await expect(page.getByText('/ 100').first()).toBeVisible();

  await page.getByLabel('作品名').fill('月光曲 (Clair de Lune)');
  await page.getByLabel('艺术家', { exact: true }).fill('Claude Debussy');
  const artistLabelInput = page.getByLabel('字段名称（默认为“艺术家”）');
  const albumLabelInput = page.getByLabel('字段名称（默认为“专辑”）');
  await expect(artistLabelInput).toHaveValue('艺术家');
  await expect(artistLabelInput).toHaveClass(/\binput-label-edit\b/);
  await expect(albumLabelInput).toHaveValue('专辑');
  await expect(
    page.locator('[data-card-region="card"]').getByText('Claude Debussy', { exact: true }),
  ).toBeVisible();
  const restingLabelStyle = await albumLabelInput.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, borderColor: style.borderColor };
  });
  expect(restingLabelStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(restingLabelStyle.borderColor).not.toBe('rgba(0, 0, 0, 0)');

  await albumLabelInput.click();
  await expect(albumLabelInput).toBeFocused();
  await expect(albumLabelInput).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const focusedLabelStyle = await albumLabelInput.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, boxShadow: style.boxShadow };
  });
  expect(focusedLabelStyle.backgroundColor).toBe('rgb(255, 255, 255)');
  expect(focusedLabelStyle.boxShadow).not.toBe('none');

  await artistLabelInput.fill('');
  await expect(artistLabelInput).toHaveClass(/\binput\b/);
  await expect(artistLabelInput).toHaveAttribute('placeholder', '艺术家');
  await expect(
    page.locator('[data-card-region="card"]').getByText('Claude Debussy', { exact: true }),
  ).toBeVisible();
  await artistLabelInput.fill('艺术家');
  await expect(artistLabelInput).toHaveValue('艺术家');
  await expect(
    page.locator('[data-card-region="card"]').getByText('Claude Debussy', { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-card-region="card"]').getByText('艺术家：Claude Debussy'),
  ).toHaveCount(0);
  await albumLabelInput.fill('');
  await expect(albumLabelInput).toHaveClass(/\binput\b/);
  await expect(albumLabelInput).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await albumLabelInput.fill('作品集');
  await page.getByLabel('作品集', { exact: true }).fill('Images');
  await page.getByRole('button', { name: '添加作品信息条目' }).click();
  const customFieldName = page.getByLabel('条目名称');
  await expect(customFieldName).toHaveClass('input');
  await customFieldName.fill('调式');
  await page.getByLabel('条目内容').fill('升C小调');
  await page.getByRole('button', { name: '添加作品信息条目' }).click();
  await page.getByLabel('条目名称').nth(1).fill('临时条目');
  await page.getByRole('button', { name: '移除条目' }).nth(1).click();
  await expect(page.getByLabel('条目名称')).toHaveCount(1);
  await page.getByLabel('总体评价（选填）').fill('印象派代表作，月色如流水般倾泻。');

  await expect(
    page.locator('[data-card-region="card"]').getByText('Claude Debussy', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-card-region="card"]').getByText('作品集：Images')).toBeVisible();
  await expect(page.locator('[data-card-region="card"]').getByText('调式：升C小调')).toBeVisible();

  await page.waitForTimeout(500);

  const axeResults = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
  expect(axeResults.violations).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('clears seeded content while preserving the rating-card structure', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('作品名').fill('默认示例作品');
  await page.getByLabel('总体评价（选填）').fill('需要被清除的说明');
  await page.locator('[data-rating-scroll="stars"] [role="slider"]').first().locator('span.group').nth(7).click();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '一键清除默认内容' }).click();

  await expect(page.getByLabel('作品名')).toHaveValue('');
  await expect(page.getByLabel('总体评价（选填）')).toHaveValue('');
  await expect(page.locator('[data-rating-scroll="stars"] [role="slider"]').first()).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await expect(page.getByText('已清除默认内容，当前是一张空白评分卡。', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: '综合评分' })).toBeVisible();
});

test('professional mode restores its preset axes instead of opening as custom', async ({ page }) => {
  await page.goto('/');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('专业模式').check();

  await expect(page.locator('input[value="填词 / 立意"]')).toBeVisible();
  await expect(page.locator('input[value="作曲 / 编曲"]')).toBeVisible();
  await expect(page.locator('input[value="演唱 / 调音 / 混音"]')).toBeVisible();
  await expect(page.locator('input[value="创新"]')).toBeVisible();
  await expect(page.locator('input[value="其他"]')).toBeVisible();
  await expect(page.getByText('自定义模式', { exact: true })).toHaveCount(0);
});

test('auto-saves draft to localStorage and restores on page reload', async ({ page }) => {
  await page.goto('/');

  const titleInput = page.getByLabel('作品名');
  await titleInput.fill('夜曲 Op.9 No.2');
  await page.getByLabel('艺术家', { exact: true }).fill('Chopin');
  await page.getByLabel('字段名称（默认为“专辑”）').fill('系列');
  await page.getByLabel('系列', { exact: true }).fill('Opus Collection');
  await page.getByRole('button', { name: '添加作品信息条目' }).click();
  await page.getByLabel('条目名称').fill('编号');
  await page.getByLabel('条目内容').fill('9-2');

  await expect(page.getByText('已保存到此浏览器')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);

  await page.reload();

  const recoveryDialog = page.getByRole('dialog', { name: '发现可恢复的自动草稿' });
  await expect(recoveryDialog).toBeVisible();
  await expect(recoveryDialog).toContainText('夜曲 Op.9 No.2');
  await recoveryDialog.getByRole('button', { name: '恢复此草稿' }).click();

  await expect(page.getByLabel('作品名')).toHaveValue('夜曲 Op.9 No.2');
  await expect(page.getByLabel('艺术家', { exact: true })).toHaveValue('Chopin');
  await expect(page.getByLabel('字段名称（默认为“专辑”）')).toHaveValue('系列');
  await expect(page.getByLabel('系列', { exact: true })).toHaveValue('Opus Collection');
  await expect(page.getByLabel('条目名称')).toHaveValue('编号');
  await expect(page.getByLabel('条目内容')).toHaveValue('9-2');
});

test('updates the window title for new, edited, and saved states without exposing paths', async ({
  page,
}) => {
  await page.goto('/');
  await expect.poll(() => page.title()).toBe('未命名评价 — XDRate Music');

  await page.getByLabel('作品名').fill('窗口标题测试');
  await expect.poll(() => page.title()).toBe('窗口标题测试 * — XDRate Music');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出完整 JSON' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('xdrate-music.xdrate.json');
  await expect.poll(() => page.title()).toBe('窗口标题测试 — XDRate Music');
  expect(await page.title()).not.toContain('\\');
  expect(await page.title()).not.toContain(':/');
});

test('previews an abnormal-session draft before adoption and can discard it safely', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('作品名').fill('异常退出草稿');
  await page.getByLabel('总体评价（选填）').fill('这是恢复前必须先看到的摘要。');
  await expect(page.getByText('已保存到此浏览器')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);

  await page.reload();
  const dialog = page.getByRole('dialog', { name: '发现可恢复的自动草稿' });
  await expect(dialog).toContainText('异常退出草稿');
  await expect(dialog).toContainText('这是恢复前必须先看到的摘要。');
  const restoreButton = dialog.getByRole('button', { name: '恢复此草稿' });
  const discardButton = dialog.getByRole('button', { name: '放弃并新建' });
  await expect(restoreButton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(discardButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(restoreButton).toBeFocused();
  await expect(page.getByLabel('作品名')).toHaveValue('');
  await discardButton.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel('作品名')).toHaveValue('');
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('xdrate.music.recovery-state.v1') ?? '{}').pending,
      ),
    )
    .toBe(false);
});

test('exposes desktop commands and preserves focused text when shortcuts are cancelled', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> }).__TAURI_INTERNALS__ =
      {};
  });
  await page.goto('/');

  const shortcuts = [
    ['新建评价', 'Control+N'],
    ['打开存档', 'Control+O'],
    ['保存存档', 'Control+S'],
    ['存档另存为', 'Control+Shift+S'],
    ['退出应用', 'Control+Q'],
    ['下载 PNG', 'Control+Shift+E'],
  ] as const;
  for (const [name, shortcut] of shortcuts) {
    await expect(page.getByRole('button', { name })).toHaveAttribute('aria-keyshortcuts', shortcut);
  }

  const titleInput = page.getByLabel('作品名');
  await titleInput.fill('快捷键不应破坏这段文字');
  await titleInput.focus();
  await page.keyboard.press('Control+N');
  const dialog = page.getByRole('dialog', { name: '保存未保存的修改？' });
  await expect(dialog).toContainText('新建评价会替换当前内容');
  await page.keyboard.press('Escape');
  await expect(titleInput).toHaveValue('快捷键不应破坏这段文字');
  await expect(titleInput).toBeFocused();

  await page.keyboard.press('Control+O');
  await expect(dialog).toContainText('打开其他存档会替换当前内容');
  await page.keyboard.press('Escape');
  await expect(titleInput).toHaveValue('快捷键不应破坏这段文字');
});

test('lists, removes, and clears recent file metadata without scanning or opening files', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { __TAURI_INTERNALS__: Record<string, unknown> }).__TAURI_INTERNALS__ =
      {};
    localStorage.setItem(
      'xdrate.music.recent-files.v1',
      JSON.stringify([
        {
          displayName: 'first.xdrate.json',
          path: 'C:/Ratings/first.xdrate.json',
          lastOpenedAt: '2026-09-03T10:00:00.000Z',
        },
        {
          displayName: 'missing.xdrate.json',
          path: 'D:/Moved/missing.xdrate.json',
          lastOpenedAt: '2026-09-02T10:00:00.000Z',
        },
      ]),
    );
  });
  await page.goto('/');

  const recentRegion = page
    .getByRole('heading', { name: '最近文件' })
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await expect(recentRegion).toContainText('不会自动打开文件或扫描目录');
  await expect(recentRegion).toContainText('first.xdrate.json');
  await expect(recentRegion).toContainText('missing.xdrate.json');
  await recentRegion.getByRole('button', { name: '从最近文件中移除：missing.xdrate.json' }).click();
  await expect(recentRegion).not.toContainText('missing.xdrate.json');
  await recentRegion.getByRole('button', { name: '清空最近文件' }).click();
  await expect(recentRegion).toContainText('尚无最近文件');
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('xdrate.music.recent-files.v1')))
    .toBeNull();
});

test('protects unsaved edits before new and open actions', async ({ page }) => {
  await page.goto('/');
  const titleInput = page.getByLabel('作品名');

  await titleInput.fill('必须保留的修改');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const event = new Event('beforeunload', { cancelable: true });
        return !window.dispatchEvent(event);
      }),
    )
    .toBe(true);

  const newButton = page.getByRole('button', { name: '新建评价' });
  await newButton.click();
  const dialog = page.getByRole('dialog', { name: '保存未保存的修改？' });
  await expect(dialog).toBeVisible();
  const cancelButton = dialog.getByRole('button', { name: '取消' });
  await expect(cancelButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: '保存并继续' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancelButton).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(titleInput).toHaveValue('必须保留的修改');
  await expect(newButton).toBeFocused();

  await page.getByRole('button', { name: '导入 JSON' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('打开其他存档会替换当前内容');
  await dialog.getByRole('button', { name: '取消' }).click();
  await expect(titleInput).toHaveValue('必须保留的修改');

  await newButton.focus();
  await page.keyboard.press('Enter');
  await dialog.getByRole('button', { name: '放弃修改' }).click();
  await expect(titleInput).toHaveValue('');

  await titleInput.fill('保存后再新建');
  await newButton.click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: '保存并继续' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('xdrate-music.xdrate.json');
  await expect(dialog).toHaveCount(0);
  await expect(titleInput).toHaveValue('');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const event = new Event('beforeunload', { cancelable: true });
        return !window.dispatchEvent(event);
      }),
    )
    .toBe(false);
});

test('displays 100-point aggregate and short algorithm version in preview and export', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByText('music-linear-100-v4').first()).toBeVisible();
  await rateDefaultAxes(page);

  const scoreBadge = page.locator('[data-card-region="card"]');
  await expect(scoreBadge).toBeVisible();
  await expect(scoreBadge.getByText('/ 100')).toBeVisible();
  await expect(scoreBadge.getByText('music-linear-100-v4')).toBeVisible();
});

test('all ratios and themes keep their logical canvases free of DOM overflow', async ({ page }) => {
  test.slow();
  await page.goto('/');
  await page.getByLabel('作品名').fill('DOM Overflow Gate Album');
  await page.getByLabel('艺术家', { exact: true }).fill('Test Artist');
  await page
    .getByLabel('总体评价（选填）')
    .fill('标准长度评价用于验证 11 种比例在明暗主题下均无 DOM 溢出。');
  await page
    .getByLabel('你和它的故事（选填）')
    .fill('标准故事文本用于验证 11 种比例在明暗主题下均无 DOM 溢出。');

  const card = page.locator('[data-card-region="card"]');
  const ratioSelect = page.getByRole('combobox', { name: '比例' });
  const themeSelect = page.getByRole('combobox', { name: '主题' });

  const ratios: Array<[string, number, number]> = [
    ['16:9', 16, 9],
    ['8:5', 8, 5],
    ['3:2', 3, 2],
    ['4:3', 4, 3],
    ['5:4', 5, 4],
    ['1:1', 1, 1],
    ['4:5', 4, 5],
    ['3:4', 3, 4],
    ['2:3', 2, 3],
    ['5:8', 5, 8],
    ['9:16', 9, 16],
  ];

  for (const theme of ['light', 'dark']) {
    await themeSelect.selectOption(theme);
    for (const [ratio, ratioWidth, ratioHeight] of ratios) {
      await ratioSelect.selectOption(ratio);
      await expect(ratioSelect).toHaveValue(ratio);
      await page.waitForTimeout(150);

      const dimensions = await card.evaluate((element) => ({
        width: element.clientWidth,
        height: element.clientHeight,
      }));
      expect(dimensions.width / dimensions.height).toBeCloseTo(ratioWidth / ratioHeight, 4);

      const overflowingRegions = await card
        .locator('[data-card-region]')
        .evaluateAll((regions) =>
          regions
            .filter(
              (region) =>
                region.scrollHeight > region.clientHeight + 1.5 ||
                region.scrollWidth > region.clientWidth + 1.5,
            )
            .map((region) => region.getAttribute('data-card-region')),
        );
      expect(overflowingRegions).toEqual([]);

      const footerMetrics = await card.locator('[data-card-region="footer"]').evaluate((footer) => {
        const footerRect = footer.getBoundingClientRect();
        const parentRect = footer.parentElement?.getBoundingClientRect();
        const labels = Array.from(footer.querySelectorAll('span')).map((label) =>
          label.getBoundingClientRect(),
        );
        return {
          footerWidth: footerRect.width,
          parentWidth: parentRect?.width ?? 0,
          labelGap: labels.length === 2 ? labels[1].left - labels[0].right : -1,
        };
      });
      expect(footerMetrics.footerWidth).toBeGreaterThanOrEqual(footerMetrics.parentWidth - 1);
      expect(footerMetrics.labelGap).toBeGreaterThanOrEqual(8);
    }
  }
});

test('signals ratio-specific truncation while keeping an over-capacity narrative safe to export', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('作品名').fill('A Very Long 中英文混排作品标题 For Overflow Regression');
  await page.getByRole('combobox', { name: '比例' }).selectOption('16:9');
  await page
    .getByLabel('总体评价（选填）')
    .fill('这是一段用于检验卡片溢出门禁的中英文混排长文本。Overflow regression text. '.repeat(12));
  await page
    .getByLabel('你和它的故事（选填）')
    .fill('故事文本用于验证超出容量时系统会明确阻止导出。Story overflow fixture. '.repeat(12));

  await expect(page.getByText('评价已截取', { exact: false })).toBeVisible();
  await expect(page.getByText('故事已截取', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '下载 PNG' })).toBeEnabled({ timeout: 10_000 });
});

test('exports a 2x PNG with the selected ratio', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('作品名').fill('PNG Export Regression');
  await rateDefaultAxes(page);
  await page.getByRole('combobox', { name: '比例' }).selectOption('4:5');
  const downloadButton = page.getByRole('button', { name: '下载 PNG' });
  await expect(downloadButton).toBeEnabled({ timeout: 10_000 });

  const [download] = await Promise.all([page.waitForEvent('download'), downloadButton.click()]);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  const png = await readFile(downloadPath!);
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(1920);
  expect(png.readUInt32BE(20)).toBe(2400);
});

test('square 1:1 card renders radar legend axes and scores without line wrapping or truncation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('作品名').fill('Square 1:1 Visual Fixture');
  await rateDefaultAxes(page);
  await page.getByRole('combobox', { name: '比例' }).selectOption('1:1');

  const chart = page.locator('[data-card-region="chart"]');
  await expect(chart).toBeVisible();

  // Verify all default axis names are visible in full in the legend
  await expect(chart.getByText('艺术品质', { exact: true })).toBeVisible();
  await expect(chart.getByText('听感', { exact: true })).toBeVisible();
  await expect(chart.getByText('个人喜好', { exact: true })).toBeVisible();

  // Verify score elements have single-line format
  const scoreSpans = chart.locator('span.font-mono');
  const count = await scoreSpans.count();
  expect(count).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < count; i++) {
    const text = await scoreSpans.nth(i).innerText();
    expect(text).toMatch(/^\d+\.\d$/);
  }
});

test('show reasons renders enabled axis descriptions and removes the region when disabled', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('作品名').fill('Reason Flow Fixture');
  await rateDefaultAxes(page);
  await page.getByRole('combobox', { name: '比例' }).selectOption('1:1');

  const reasonInputs = page.getByLabel('评分理由（选填）');
  await reasonInputs.nth(0).fill('艺术品质理由：结构完整。');
  await reasonInputs.nth(1).fill('听感理由：动态自然。');
  await reasonInputs.nth(2).fill('个人喜好理由：愿意反复聆听。');

  const card = page.locator('[data-card-region="card"]');
  const reasons = card.locator('[data-card-region="reasons"]');
  await expect(reasons).toBeVisible();
  await expect(reasons.getByText('艺术品质理由：结构完整。')).toBeVisible();
  await expect(reasons.getByText('听感理由：动态自然。')).toBeVisible();
  await expect(reasons.getByText('个人喜好理由：愿意反复聆听。')).toBeVisible();

  await page.getByLabel('显示分项与理由').uncheck();
  await expect(reasons).toHaveCount(0);
});

test('sparse reasons are rendered without silent loss when only a subset of axes has reasons', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('作品名').fill('Sparse Reasons Fixture');
  await rateDefaultAxes(page);
  await page.getByRole('combobox', { name: '比例' }).selectOption('1:1');

  const reasonInputs = page.getByLabel('评分理由（选填）');
  // Fill only the 2nd axis reason, leaving 1st and 3rd reasons empty
  await reasonInputs.nth(0).fill('');
  await reasonInputs.nth(1).fill('听感专属理由：星尘V4全新离调。');
  await reasonInputs.nth(2).fill('');

  const card = page.locator('[data-card-region="card"]');
  const reasons = card.locator('[data-card-region="reasons"]');
  await expect(reasons).toBeVisible();

  // Unified contract: All enabled axes are retained in the list
  await expect(reasons.getByText('艺术品质', { exact: true })).toBeVisible();
  await expect(reasons.getByText('听感', { exact: true })).toBeVisible();
  await expect(reasons.getByText('听感专属理由：星尘V4全新离调。')).toBeVisible();
  await expect(reasons.getByText('个人喜好', { exact: true })).toBeVisible();

  // Verify no DOM overflow
  const overflowingRegions = await card
    .locator('[data-card-region]')
    .evaluateAll((regions) =>
      regions
        .filter((region) => region.scrollHeight > region.clientHeight + 1.5)
        .map((region) => region.getAttribute('data-card-region')),
    );
  expect(overflowingRegions).toEqual([]);
});

test('supports interactive 10-star rating and 5-banana-peel deduction controls with keyboard accessibility', async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/');

  // Find the first axis star rating slider
  const starSlider = page.locator('[role="slider"]').first();
  await expect(starSlider).toBeVisible();
  await expect(starSlider).toHaveAttribute('aria-valuemin', '0');
  await expect(starSlider).toHaveAttribute('aria-valuemax', '10');
  await expect(starSlider).toHaveAttribute('aria-valuenow', '0');
  await expect(starSlider).toHaveAttribute('aria-valuetext', '未评分，不计入综合分');
  await expect(page.locator('input[type="number"][min="1"]')).toHaveCount(0);

  // Portrait targets are 32x40 CSS px: height is exactly 25% greater than width.
  const starIcons = starSlider.locator('span.group');
  await expect(starIcons).toHaveCount(10);
  for (let i = 0; i < 10; i++) {
    const box = await starIcons.nth(i).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBe(32);
    expect(box!.height).toBe(40);
    expect(box!.height / box!.width).toBeCloseTo(1.25, 2);
  }

  // At the 1280px desktop acceptance viewport, all ten stars fit without local scrolling.
  const starStrip = page.locator('[data-rating-scroll="stars"]').first();
  const desktopStarStripWidths = await starStrip.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(desktopStarStripWidths.scroll).toBeLessThanOrEqual(desktopStarStripWidths.client);

  await expect(page.getByRole('button', { name: '归零' })).toHaveCount(0);

  // Click 8th star (spans inside the slider)
  await starIcons.nth(7).click(); // 8th star
  await expect(starSlider).toHaveAttribute('aria-valuenow', '8');

  // Keyboard navigation changes positive scores by one whole star.
  await starSlider.focus();
  await page.keyboard.press('ArrowDown');
  await expect(starSlider).toHaveAttribute('aria-valuenow', '7');

  // Press ArrowUp to increase by one whole star.
  await page.keyboard.press('ArrowUp');
  await expect(starSlider).toHaveAttribute('aria-valuenow', '8');

  // Once rated, keyboard input cannot go below one star.
  await page.keyboard.press('Home');
  await expect(starSlider).toHaveAttribute('aria-valuenow', '1');
  await page.keyboard.press('ArrowDown');
  await expect(starSlider).toHaveAttribute('aria-valuenow', '1');

  // Switch to Professional mode to test Negative items with Banana Rating
  await page.getByLabel('专业模式').check();
  await page.waitForTimeout(200);

  // Add a negative item if none exists
  const addNegativeBtn = page.getByRole('button', { name: '添加负面项' });
  await addNegativeBtn.click();
  await page.waitForTimeout(100);

  // Find banana peel slider
  const bananaSlider = page.locator('[role="slider"][aria-valuemin="-5"]').first();
  await expect(bananaSlider).toBeVisible();
  await expect(bananaSlider).toHaveAttribute('aria-valuemax', '0');
  await expect(bananaSlider).toHaveAttribute('aria-valuenow', '0');

  // Verify that banana peel touch target bounding boxes are >= 44x44 CSS px
  const bananaIcons = bananaSlider.locator('span.group');
  await expect(bananaIcons).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    const box = await bananaIcons.nth(i).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  // Click 3rd banana peel
  await bananaIcons.nth(2).click(); // 3rd banana
  await expect(bananaSlider).toHaveAttribute('aria-valuenow', '-3');

  // Keyboard navigation on banana slider: press ArrowLeft (decrease deduction magnitude -> less negative -> -2.9)
  await bananaSlider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(bananaSlider).toHaveAttribute('aria-valuenow', '-2.9');

  // Reset deduction to 0
  const bananaReset = page
    .locator('[data-rating-scroll="bananas"]')
    .first()
    .locator('..')
    .getByRole('button', { name: '归零' });
  await bananaReset.click();
  await expect(bananaSlider).toHaveAttribute('aria-valuenow', '0');

  // Test i18n locale switching on controls
  const languageSelect = page.locator('header select, main select').first();
  await languageSelect.selectOption('en');
  await expect(page.getByRole('button', { name: 'Reset' }).first()).toBeVisible();
  await expect(starSlider).toHaveAttribute(
    'aria-valuetext',
    'Not rated; excluded from the aggregate',
  );

  // Switch back to zh-CN
  await languageSelect.selectOption('zh-CN');
  await expect(page.getByRole('button', { name: '归零' }).first()).toBeVisible();

  // At the narrow acceptance viewport, the icon strip scrolls locally while the page does not.
  await page.setViewportSize({ width: 360, height: 900 });
  const starScrollRegion = page.locator('[data-rating-scroll="stars"]').first();
  await expect(starScrollRegion).toBeVisible();

  const pageWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(pageWidths.document).toBeLessThanOrEqual(pageWidths.viewport);
  expect(pageWidths.body).toBeLessThanOrEqual(pageWidths.viewport);

  const starStripWidths = await starScrollRegion.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(starStripWidths.scroll).toBeGreaterThan(starStripWidths.client);
});

test('adapts layout cleanly when narrative description is empty across representative ratios', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('作品名').fill('Minimalist Rating Album');
  // Leave comment and story empty
  await page.getByLabel('总体评价（选填）').fill('');
  await page.getByLabel('你和它的故事（选填）').fill('');

  const card = page.locator('[data-card-region="card"]');
  const ratioSelect = page.getByRole('combobox', { name: '比例' });

  for (const ratio of ['1:1', '16:9', '4:5', '9:16']) {
    await ratioSelect.selectOption(ratio);
    await expect(ratioSelect).toHaveValue(ratio);
    await page.waitForTimeout(100);

    // Assert card is rendered and has no DOM overflow issues
    const overflowingRegions = await card
      .locator('[data-card-region]')
      .evaluateAll((regions) =>
        regions
          .filter((region) => region.scrollHeight > region.clientHeight + 1.5)
          .map((region) => region.getAttribute('data-card-region')),
      );
    expect(overflowingRegions).toEqual([]);
  }
});
