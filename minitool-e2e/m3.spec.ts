import { expect, test } from '@playwright/test';

const artifactUrl = new URL('../dist-minitool/index.html', import.meta.url);

test('renders all eleven ratios through the formal card model', async ({ page }) => {
  await page.goto(artifactUrl.href);
  await page.getByRole('button', { name: '艺术品质 评分 8', exact: true }).click();
  await page.getByRole('button', { name: '听感 评分 7', exact: true }).click();
  await page.getByRole('button', { name: '个人喜好 评分 9', exact: true }).click();

  const ratios: Array<[string, number, number]> = [
    ['16:9', 1200, 675],
    ['8:5', 1200, 750],
    ['3:2', 1200, 800],
    ['4:3', 1200, 900],
    ['5:4', 1200, 960],
    ['1:1', 1000, 1000],
    ['4:5', 960, 1200],
    ['3:4', 900, 1200],
    ['2:3', 800, 1200],
    ['5:8', 750, 1200],
    ['9:16', 675, 1200],
  ];
  await expect(page.getByTestId('card-ratio').locator('option')).toHaveCount(11);
  for (const [ratio, width, height] of ratios) {
    await page.getByTestId('card-ratio').selectOption(ratio);
    await page.getByRole('button', { name: '生成评分卡 PNG' }).click();
    const image = page.getByRole('img', { name: '评分卡 PNG 预览' });
    await expect(image).toHaveJSProperty('naturalWidth', width);
    await expect(image).toHaveJSProperty('naturalHeight', height);
  }
});

test('uses the identical preview PNG for album save and supports retry after failure', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(window, '__MINITOOL_CALL_LOG__', { value: calls });
    let attempts = 0;
    Object.defineProperty(window, 'xhs', {
      value: {
        miniTool: {
          async writeTempFile(options: { data: string }) {
            calls.push(options.data);
            return { filePath: `xhs://temp/m3-${++attempts}.png` };
          },
          async saveImageToPhotosAlbum() {
            if (attempts === 1) throw { errMsg: 'saveImageToPhotosAlbum:fail' };
            return { errMsg: 'saveImageToPhotosAlbum:ok' };
          },
        },
      },
    });
  });

  await page.goto(artifactUrl.href);
  await page.getByRole('button', { name: '艺术品质 评分 8', exact: true }).click();
  await page.getByRole('button', { name: '生成评分卡 PNG' }).click();
  const preview = page.getByRole('img', { name: '评分卡 PNG 预览' });
  const previewData = await preview.getAttribute('src');
  await page.getByRole('button', { name: '保存评分卡到系统相册' }).click();
  await expect(page.getByText('保存失败；草稿仍保留，可重试')).toBeVisible();
  await page.getByRole('button', { name: '保存评分卡到系统相册' }).click();
  await expect(page.getByText('已保存到系统相册')).toBeVisible();
  const calls = await page.evaluate(
    () => (window as unknown as { __MINITOOL_CALL_LOG__: string[] }).__MINITOOL_CALL_LOG__,
  );
  expect(calls).toHaveLength(2);
  expect(calls[0]).toBe(previewData);
  expect(calls[1]).toBe(previewData);
});

test('renders every rated legend entry and narrative while excluding unrated axes', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const renderedText: string[] = [];
    Object.defineProperty(window, '__CANVAS_TEXT_LOG__', { value: renderedText });
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      renderedText.push(String(text));
      if (typeof maxWidth === 'number') return originalFillText.call(this, text, x, y, maxWidth);
      return originalFillText.call(this, text, x, y);
    };
  });

  await page.goto(artifactUrl.href);
  await page.getByRole('button', { name: '添加加分项' }).click();
  await page.getByRole('textbox', { name: '总体评价' }).fill('总体评价会进入正式评分卡');
  await page.getByRole('button', { name: '生成评分卡 PNG' }).click();

  const renderedText = await page.evaluate(
    () => (window as unknown as { __CANVAS_TEXT_LOG__: string[] }).__CANVAS_TEXT_LOG__,
  );
  expect(renderedText).toEqual(expect.arrayContaining(['艺术品质', '听感', '个人喜好']));
  expect(renderedText.join('')).toContain('总体评价会进入正式评分卡');
  expect(renderedText.join('')).toContain('17年网易云');
  expect(renderedText).not.toContain('新增加分项');
});

test('keeps axis names and reasons geometrically separate across all ratios', async ({ page }) => {
  await page.addInitScript(() => {
    const textBoxes: Array<{
      text: string;
      left: number;
      right: number;
      top: number;
      bottom: number;
    }> = [];
    Object.defineProperty(window, '__CANVAS_TEXT_BOXES__', { value: textBoxes });
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      const value = String(text);
      const fontSize = Number.parseFloat(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? '16');
      const measuredWidth = this.measureText(value).width;
      textBoxes.push({
        text: value,
        left: x,
        right: x + Math.min(measuredWidth, maxWidth ?? measuredWidth),
        top: y - fontSize,
        bottom: y + 2,
      });
      if (typeof maxWidth === 'number') return originalFillText.call(this, text, x, y, maxWidth);
      return originalFillText.call(this, text, x, y);
    };
  });

  await page.goto(artifactUrl.href);
  const ratios = ['16:9', '8:5', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '5:8', '9:16'];
  const reasonTexts = [
    '艺术品质',
    '采用了高几个八度的离调',
    '听感',
    '当时全新出炉的星尘V4',
    '个人喜好',
    '禁忌组99',
  ];

  for (const ratio of ratios) {
    await page.evaluate(() => {
      (window as unknown as { __CANVAS_TEXT_BOXES__: unknown[] }).__CANVAS_TEXT_BOXES__.length = 0;
    });
    await page.getByTestId('card-ratio').selectOption(ratio);
    await page.getByRole('button', { name: '生成评分卡 PNG' }).click();
    const boxes = await page.evaluate((texts) => {
      const all = (
        window as unknown as {
          __CANVAS_TEXT_BOXES__: Array<{
            text: string;
            left: number;
            right: number;
            top: number;
            bottom: number;
          }>;
        }
      ).__CANVAS_TEXT_BOXES__;
      const sectionStart = all.findLastIndex((box) => box.text === '分项理由');
      return all.slice(sectionStart + 1).filter((box) => texts.includes(box.text));
    }, reasonTexts);

    expect(boxes, `${ratio} should render every axis name and reason`).toHaveLength(6);
    for (let first = 0; first < boxes.length; first += 1) {
      for (let second = first + 1; second < boxes.length; second += 1) {
        const a = boxes[first];
        const b = boxes[second];
        const overlaps =
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        expect(overlaps, `${ratio}: "${a.text}" overlaps "${b.text}"`).toBe(false);
      }
    }
  }
});
