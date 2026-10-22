import { createHash } from 'node:crypto';
import { basename, relative } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = import.meta.dirname;

/** `wisp-button__filled__a1b2c`: readable in devtools, stable across machines. */
function scopedName(local: string, filename: string): string {
  const component = basename(filename)
    .replace(/(?:\.tokens)?(?:\.generated)?\.module\.css$/, (match) =>
      match.includes('tokens') ? '-tokens' : '',
    )
    .replaceAll('.', '-');
  const hash = createHash('sha256')
    .update(relative(root, filename))
    .update(local)
    .digest('base64url')
    .slice(0, 5);
  return `wisp-${component}__${local}__${hash}`;
}

export default defineConfig({
  plugins: [react()],
  css: { modules: { generateScopedName: scopedName } },
});
