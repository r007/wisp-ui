import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';
import { workspaceAliases } from './aliases.js';
import base from './vite.config.js';

type Engine = 'chromium' | 'firefox' | 'webkit';

// Chromium by default; `WISP_BROWSERS=chromium,firefox,webkit pnpm test` runs the
// same suite on more engines (browsers come from `playwright install`).
const engines = (process.env.WISP_BROWSERS ?? 'chromium').split(',').map((name) => name.trim());

// Headless Firefox (and WebKit), with several browsers and files running at once, sometimes
// starves `requestAnimationFrame` and paints in a background page, so a spring has not finished
// when `expect.poll` gives up after its 1 s default, and Playwright's "stable" check on a click can
// time out after 15 s. A test that fails for that reason passes when run again or given longer;
// one that is wrong fails every time. So a run that includes another engine allows `expect.poll`
// five seconds (it returns as soon as the condition holds, so passing tests cost nothing) and
// retries a failed test twice. CI runs Chromium only, with the default timeout and no retries.
const multiEngine = engines.some((name) => name !== 'chromium');
const retry = multiEngine ? 2 : 0;
const pollTimeout = multiEngine ? 5000 : 1000;

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
      retry,
      expect: { poll: { timeout: pollTimeout } },
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
