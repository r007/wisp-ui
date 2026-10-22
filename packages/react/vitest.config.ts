import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';
import { workspaceAliases } from './aliases.js';
import base from './vite.config.js';

type Engine = 'chromium' | 'firefox' | 'webkit';

// Chromium by default; `WISP_BROWSERS=chromium,firefox,webkit pnpm test` runs the
// same suite on more engines (browsers come from `playwright install`).
const engines = (process.env.WISP_BROWSERS ?? 'chromium').split(',').map((name) => name.trim());

// A factory, not a shared object: Vitest names browser instances by mutating them.
const browser = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: engines.map((name) => ({ browser: name as Engine })),
});

// Components are styled with modern CSS (state layers, springs, `:focus-visible`),
// which jsdom does not implement. Tests run in a real browser.
export default mergeConfig(
  base,
  defineConfig({
    resolve: { alias: workspaceAliases },
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            include: ['src/**/*.test.{ts,tsx}'],
            setupFiles: ['src/test-setup.ts'],
            browser: browser(),
          },
        },
        {
          extends: true,
          plugins: [storybookTest({ configDir: '.storybook' })],
          test: { name: 'stories', browser: browser() },
        },
      ],
    },
  }),
);
