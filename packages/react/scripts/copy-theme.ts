import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

// Re-export the system tokens so one package is enough:
// `import '@wisp-ui/react/theme.css'`.
const theme = createRequire(import.meta.url).resolve('@wisp-ui/tokens/theme.css');
mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
copyFileSync(theme, new URL('../dist/theme.css', import.meta.url));
console.log('dist/theme.css  copied from @wisp-ui/tokens');
