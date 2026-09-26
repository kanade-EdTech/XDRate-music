import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const artifactUrl = new URL('../dist-minitool/index.html', import.meta.url);

test('submits the exact visible PNG across every supported ratio', async ({ page }) => {
  await page.addInitScript(() => {
    const images: string[] = [];
    Object.defineProperty(window, '__POSTED_IMAGES__', { value: images });
    Object.defineProperty(window, 'xhs', {
      value: {
        miniTool: {
          async postNote(options: { mediaInfo: { image_resources: Array<{ url: string }> } }) {
            images.push(options.mediaInfo.image_resources[0].url);
            return { errMsg: 'postNote:ok' };
          },
        },
      },
    });
  });

  await page.goto(artifactUrl.href);
  const ratios = ['16:9', '8:5', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '5:8', '9:16'];
  const expectedImages: string[] = [];

  for (const ratio of ratios) {
    await page.getByTestId('card-ratio').selectOption(ratio);
    await page.getByRole('button', { name: '生成评分卡 PNG' }).click();
    await page.getByRole('button', { name: '发布到小红书' }).click();
    const confirmation = page.getByTestId('post-confirmation');
    const visibleImage = await confirmation
      .getByRole('img', { name: '待提交的评分卡' })
      .getAttribute('src');
    expect(visibleImage, `${ratio} must expose a complete local PNG`).toMatch(
      /^data:image\/png;base64,/,
    );
    expectedImages.push(visibleImage!);
    await confirmation.getByRole('button', { name: '去小红书发布' }).click();
    await expect(confirmation.getByText(/已进入小红书发布流程/)).toBeVisible();
    await confirmation.getByRole('button', { name: '返回编辑（保留本次确认）' }).click();
  }

  const postedImages = await page.evaluate(
    () => (window as unknown as { __POSTED_IMAGES__: string[] }).__POSTED_IMAGES__,
  );
  expect(postedImages).toEqual(expectedImages);
});

test('restores focus after cancellation and exposes an accessible confirmation', async ({
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
  await expect(confirmation.getByLabel('帖子标题')).toBeFocused();

  const submit = confirmation.getByRole('button', { name: '去小红书发布' });
  await submit.click();
  await expect(confirmation.getByText('已取消；确认内容和评分卡仍完整保留')).toBeVisible();
  await expect(submit).toBeFocused();

  const axeResults = await new AxeBuilder({ page }).analyze();
  expect(axeResults.violations).toEqual([]);
});
