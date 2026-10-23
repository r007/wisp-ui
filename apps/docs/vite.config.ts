import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { docsPlugin } from './scripts/plugin.js';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const reactSrc = here('../../packages/react/src');
const tokensSrc = here('../../packages/tokens/src');

// Served from https://<owner>.github.io/wisp-ui/ unless told otherwise (a custom domain is `/`).
const base = process.env.DOCS_BASE ?? '/wisp-ui/';

export default defineConfig({
  base,
  plugins: [react(), docsPlugin({ base })],
  resolve: {
    alias: [
      // The library from source, as Storybook does, so the site is always the current code.
      { find: '@wisp-ui/react/theme.css', replacement: `${tokensSrc}/theme.generated.css` },
      { find: '@wisp-ui/tokens/theme.css', replacement: `${tokensSrc}/theme.generated.css` },
      { find: /^@wisp-ui\/tokens$/, replacement: `${tokensSrc}/index.ts` },
      { find: /^@wisp-ui\/react$/, replacement: `${reactSrc}/index.ts` },
      { find: /^@wisp-ui\/react\/([\w-]+)$/, replacement: `${reactSrc}/$1/index.ts` },
      // The stories are the examples, and they import Storybook's test helpers for their
      // interaction tests, which a visitor never runs.
      { find: 'storybook/test', replacement: here('./src/story-runtime/storybook-test.ts') },
    ],
    // One React, however deep the story imports go.
    dedupe: ['react', 'react-dom'],
  },
  server: { fs: { allow: [here('../..')] } },
  build: { target: 'es2023', sourcemap: false },
});
