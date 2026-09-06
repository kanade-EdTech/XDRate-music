import { Buffer } from 'node:buffer';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stdout } from 'node:process';
import { pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const root = resolve(import.meta.dirname, '..');
const artifactUrl = pathToFileURL(resolve(root, 'dist-minitool/index.html')).href;
const outputDirectory = resolve(root, 'artifacts/minitool/m3-previews');
const ratios = ['16:9', '8:5', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '5:8', '9:16'];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto(artifactUrl);
  for (const ratio of ratios) {
    await page.getByTestId('card-ratio').selectOption(ratio);
    await page.getByRole('button', { name: '生成评分卡 PNG' }).click();
    const dataUri = await page.getByRole('img', { name: '评分卡 PNG 预览' }).getAttribute('src');
    if (!dataUri?.startsWith('data:image/png;base64,')) {
      throw new Error(`MiniTool did not generate a PNG data URI for ${ratio}.`);
    }
    const fileName = `xdrate-m3-${ratio.replace(':', 'x')}.png`;
    await writeFile(
      resolve(outputDirectory, fileName),
      Buffer.from(dataUri.split(',')[1], 'base64'),
    );
  }
} finally {
  await browser.close();
}

stdout.write(`Captured all ${ratios.length} M3 card ratios in ${outputDirectory}.\n`);
