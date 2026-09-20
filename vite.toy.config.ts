import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { name: string; version: string };

function classicScriptHtml(): Plugin {
  return {
    name: 'xdrate-toy-classic-script-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlAsset = bundle['index.html'];
      if (htmlAsset?.type !== 'asset') {
        throw new Error('Toy build did not emit a root index.html asset.');
      }

      const html = String(htmlAsset.source)
        .replace(/\s+type="module"/g, '')
        .replace(/\s+crossorigin(?=[\s>])/g, '')
        .replace(/<script(?=[^>]*\bsrc=)/g, '<script defer');

      if (/type=["']module["']/i.test(html)) {
        throw new Error('Toy index.html still contains a module script.');
      }
      htmlAsset.source = html;
    },
  };
}

function toyDevSourcePath(): Plugin {
  const sourceEntry = resolve(import.meta.dirname, 'src/toy/main.tsx').replace(/\\/g, '/');
  return {
    name: 'xdrate-toy-dev-source-path',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.server) return html;
        return html.replace('../src/toy/main.tsx', `/@fs/${sourceEntry}`);
      },
    },
  };
}

function removeBlockedRuntimeProbes(): Plugin {
  return {
    name: 'xdrate-toy-remove-blocked-runtime-probes',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        output.code = output.code.replace(/navigator\.connection/g, 'null');
        if (/navigator\.connection/.test(output.code)) {
          throw new Error('Toy JavaScript still reads navigator.connection.');
        }
      }
    },
  };
}

function extractToyStylesheet(): Plugin {
  return {
    name: 'xdrate-toy-extract-stylesheet',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const stylePattern =
        /^\(function\(\)\{var e=document\.createElement\(`style`\);e\.textContent=`([\s\S]*?)`,document\.head\.appendChild\(e\);/;
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        const match = output.code.match(stylePattern);
        if (!match) continue;
        this.emitFile({ type: 'asset', fileName: 'assets/style.css', source: match[1] });
        // Keep the IIFE wrapper that follows the style bootstrap. Removing the
        // wrapper opener as well would leave the generated `})();` unmatched
        // and make the Toy bundle fail before React mounts.
        output.code = `(function(){${output.code.slice(match[0].length)}`;
      }
      const htmlAsset = bundle['index.html'];
      if (htmlAsset?.type === 'asset') {
        htmlAsset.source = String(htmlAsset.source).replace(
          '</head>',
          '    <link rel="stylesheet" href="./assets/style.css" />\n  </head>',
        );
      }
    },
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname, 'toy'),
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    toyDevSourcePath(),
    removeBlockedRuntimeProbes(),
    extractToyStylesheet(),
    classicScriptHtml(),
  ],
  define: {
    __APP_NAME__: JSON.stringify(packageJson.name),
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: resolve(import.meta.dirname, 'dist-toy'),
    emptyOutDir: true,
    target: ['es2017'],
    sourcemap: false,
    cssCodeSplit: true,
    cssMinify: false,
    modulePreload: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'XDRateToy',
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: {
    fs: {
      allow: [resolve(import.meta.dirname)],
    },
  },
});
