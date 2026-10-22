import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `@material/material-color-utilities` ships ESM with extensionless internal
    // imports, which only a bundler (or Vite) can resolve, not Node itself.
    server: { deps: { inline: ['@material/material-color-utilities'] } },
  },
});
