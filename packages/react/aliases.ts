import { resolve } from 'node:path';

const tokens = resolve(import.meta.dirname, '../tokens/src');

/**
 * Dev-time only (Storybook, Vitest): resolve the tokens package from source so
 * neither needs a prior build. The library build must NOT use these, since it
 * has to leave `@wisp-ui/tokens` as an external import.
 */
export const workspaceAliases = [
  { find: '@wisp-ui/tokens/theme.css', replacement: `${tokens}/theme.generated.css` },
  { find: /^@wisp-ui\/tokens$/, replacement: `${tokens}/index.ts` },
];
