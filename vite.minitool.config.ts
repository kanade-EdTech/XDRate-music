import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { name: string; version: string };

function classicScriptHtml(): Plugin {
  return {
    name: 'xdrate-minitool-classic-script-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlAsset = bundle['index.html'];
      if (htmlAsset?.type !== 'asset') {
        throw new Error('MiniTool build did not emit a root index.html asset.');
      }

      const html = String(htmlAsset.source)
        .replace(/\s+type="module"/g, '')
        .replace(/\s+crossorigin(?=[\s>])/g, '')
        .replace(/<script(?=[^>]*\bsrc=)/g, '<script defer');

      if (/type=["']module["']/i.test(html)) {
        throw new Error('MiniTool index.html still contains a module script.');
      }
      htmlAsset.source = html;
    },
  };
}

function removeBlockedRuntimeProbes(): Plugin {
  return {
    name: 'xdrate-minitool-remove-blocked-runtime-probes',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        output.code = output.code
          .replace(/navigator\.connection/g, 'null')
          .replace(/https:\/\/react\.dev\/errors\//g, 'xdrate-react-error-');
        if (/navigator\.connection/.test(output.code)) {
          throw new Error('MiniTool JavaScript still reads navigator.connection.');
        }
        if (/https:\/\/react\.dev\/errors\//.test(output.code)) {
          throw new Error('MiniTool JavaScript still contains a remote React help URL.');
        }
      }
    },
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname, 'minitool'),
  base: './',
  publicDir: resolve(import.meta.dirname, 'src/minitool/public'),
  plugins: [react(), removeBlockedRuntimeProbes(), classicScriptHtml()],
  define: {
    __APP_NAME__: JSON.stringify(packageJson.name),
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: resolve(import.meta.dirname, 'dist-minitool'),
    emptyOutDir: true,
    target: ['es2017', 'chrome61'],
    cssTarget: 'chrome61',
    cssMinify: false,
    sourcemap: false,
    modulePreload: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'XDRateMiniTool',
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
