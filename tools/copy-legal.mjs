/**
 * Copies the licence and notices into the package being packed, as a `prepack` step:
 *
 *     "prepack": "node ../../tools/copy-legal.mjs"
 *
 * Apache-2.0 asks that a redistribution carry the licence and the NOTICE, and the notices for
 * adapted work are in THIRD_PARTY_LICENSES.md, so every published package gets all three. They live
 * once, at the repository root; the copies are git-ignored.
 */
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
for (const file of ['LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES.md']) {
  copyFileSync(new URL(file, root), join(process.cwd(), file));
}
