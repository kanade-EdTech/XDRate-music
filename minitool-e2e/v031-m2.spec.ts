import { expect, test } from '@playwright/test';

const artifactUrl = new URL('../dist-minitool/index.html', import.meta.url);
const workspaceKey = 'xdrate.music.minitool.workspace.v1';
const pendingPostKey = 'xdrate.music.minitool.pending-post.v1';

test('confirms exact text and image, persists both records, then enters native posting', async ({
  page,
}) => {
  await page.addInitScript(
    ({ pendingKey, workspace }) => {
      const calls: unknown[] = [];
      Object.defineProperty(window, '__POST_NOTE_CALLS__', { value: calls });
      Object.defineProperty(window, 'xhs', {
        value: {
          miniTool: {
            async postNote(options: unknown) {
              calls.push({
                options,
                pendingSaved: localStorage.getItem(pendingKey) !== null,
                workspaceSaved: localStorage.getItem(workspace) !== null,
              });
              return { errMsg: 'postNote:ok' };
            },
          },
        },
      });
    },
    { pendingKey: pendingPostKey, workspace: workspaceKey },
  );

  await page.goto(artifactUrl.href);
  await page.getByRole('button', { name: '生成评分卡 PNG' }).click();
  await page.getByRole('button', { name: '发布到小红书' }).click();

  const confirmation = page.getByTestId('post-confirmation');
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByText('提交范围与隐私')).toBeVisible();
  await expect(confirmation.getByText(/最终公开发布仍由你/)).toBeVisible();

  const title = confirmation.getByLabel('帖子标题');
  const content = confirmation.getByLabel('帖子正文');
  const tags = confirmation.getByLabel('标签（可选）');
  await title.fill('曲'.repeat(21));
  await content.fill('评'.repeat(1001));
  await tags.fill('音乐评价');
  await expect(title).toHaveValue('曲'.repeat(20));
  await expect(content).toHaveValue('评'.repeat(1000));
  await expect(confirmation.getByText('标题字符数：20 / 20')).toBeVisible();
  await expect(confirmation.getByText('正文字数：1000 / 1000')).toBeVisible();

  const submittedImage = await confirmation
    .getByRole('img', { name: '待提交的评分卡' })
    .getAttribute('src');
  await confirmation.getByRole('button', { name: '去小红书发布' }).click();
  await expect(confirmation.getByText(/已进入小红书发布流程/)).toBeVisible();

  const calls = await page.evaluate(
    () =>
      (
        window as unknown as {
          __POST_NOTE_CALLS__: Array<{
            options: {
              title: string;
              content: string;
              tags: string;
              pageType: string;
              mediaInfo: { image_resources: Array<{ url: string }> };
            };
            pendingSaved: boolean;
            workspaceSaved: boolean;
          }>;
        }
      ).__POST_NOTE_CALLS__,
  );
  expect(calls).toHaveLength(1);
  expect(calls[0].pendingSaved).toBe(true);
  expect(calls[0].workspaceSaved).toBe(true);
  expect(calls[0].options).toEqual({
    title: '曲'.repeat(20),
    content: '评'.repeat(1000),
    tags: '音乐评价',
    pageType: 'photo_publish',
    mediaInfo: { image_resources: [{ url: submittedImage }] },
  });
});

test('keeps the complete confirmation after native cancellation and page reload', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'xhs', {
      value: {
        miniTool: {
          async postNote() {
            throw { errMsg: 'postNote:fail cancel' };
          },
        },
      },
    });
  });

  await page.goto(artifactUrl.href);
  await page.getByRole('button', { name: '生成评分卡 PNG' }).click();
  await page.getByRole('button', { name: '发布到小红书' }).click();
  const confirmation = page.getByTestId('post-confirmation');
  await confirmation.getByLabel('帖子标题').fill('取消后保留');
  await confirmation.getByLabel('帖子正文').fill('完整正文');
  await confirmation.getByLabel('标签（可选）').fill('本地恢复');
  const imageBefore = await confirmation
    .getByRole('img', { name: '待提交的评分卡' })
    .getAttribute('src');

  await confirmation.getByRole('button', { name: '去小红书发布' }).click();
  await expect(confirmation.getByText('已取消；确认内容和评分卡仍完整保留')).toBeVisible();
  await expect(confirmation.getByLabel('帖子标题')).toHaveValue('取消后保留');
  await expect(confirmation.getByLabel('帖子正文')).toHaveValue('完整正文');
  await expect(confirmation.getByLabel('标签（可选）')).toHaveValue('本地恢复');

  await page.reload();
  const restored = page.getByTestId('post-confirmation');
  await expect(restored).toBeVisible();
  await expect(restored.getByText('已恢复上次未完成的发布确认')).toBeVisible();
  await expect(restored.getByLabel('帖子标题')).toHaveValue('取消后保留');
  await expect(restored.getByLabel('帖子正文')).toHaveValue('完整正文');
  await expect(restored.getByLabel('标签（可选）')).toHaveValue('本地恢复');
  await expect(restored.getByRole('img', { name: '待提交的评分卡' })).toHaveAttribute(
    'src',
    imageBefore ?? '',
  );
});

test('blocks native posting when pending content cannot be persisted', async ({ page }) => {
  await page.addInitScript((pendingKey) => {
    let calls = 0;
    Object.defineProperty(window, '__POST_NOTE_CALL_COUNT__', {
      get() {
        return calls;
      },
    });
    Object.defineProperty(window, 'xhs', {
      value: {
        miniTool: {
          async postNote() {
            calls += 1;
            return { errMsg: 'postNote:ok' };
          },
        },
      },
    });
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === pendingKey) throw new Error('quota');
      originalSetItem.call(this, key, value);
    };
  }, pendingPostKey);

  await page.goto(artifactUrl.href);
  await page.getByRole('button', { name: '生成评分卡 PNG' }).click();
  await page.getByRole('button', { name: '发布到小红书' }).click();
  const confirmation = page.getByTestId('post-confirmation');
  await confirmation.getByRole('button', { name: '去小红书发布' }).click();
  await expect(
    confirmation.getByText('无法安全保存草稿或待发布内容，未打开发布流程'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __POST_NOTE_CALL_COUNT__: number }).__POST_NOTE_CALL_COUNT__,
    ),
  ).toBe(0);
});

test('keeps the English confirmation touchable and free of horizontal overflow at 360px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'xhs', {
      value: {
        miniTool: {
          async postNote() {
            return { errMsg: 'postNote:ok' };
          },
        },
      },
    });
  });

  await page.goto(artifactUrl.href);
  await page.getByLabel('界面语言').selectOption('en');
  await page.getByRole('button', { name: 'Generate rating-card PNG' }).click();
  await page.getByRole('button', { name: 'Post to Xiaohongshu' }).click();
  const confirmation = page.getByTestId('post-confirmation');
  await expect(confirmation.getByRole('heading', { name: 'Posting confirmation' })).toBeVisible();
  await expect(confirmation.getByText('Submission scope and privacy')).toBeVisible();
  await expect(confirmation.getByText(/Title character count:/)).toBeVisible();
  await expect(confirmation.getByText(/Body character count:/)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  for (const button of await confirmation.getByRole('button').all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
