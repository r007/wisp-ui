import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { transform } from 'lightningcss';

const source = new URL('../src/theme.generated.css', import.meta.url);
const target = new URL('../dist/theme.css', import.meta.url);

// No `targets`: the tokens rely on modern CSS (`light-dark()`, `color-mix()`,
// `linear()`, cascade layers) and must not be down-levelled into fallbacks.
const { code } = transform({
  filename: 'theme.generated.css',
  code: readFileSync(source),
  minify: true,
});

mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(target, code);
console.log(`dist/theme.css  ${code.length} bytes`);
