/**
 * Type-checks a throwaway consumer against the *built* package, the way a user's
 * editor would: the barrel and every component subpath, under both `nodenext`
 * and `bundler` module resolution, with `skipLibCheck` off so a broken or leaky
 * declaration cannot hide. Run after `pnpm build`.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
if (!existsSync(dist)) throw new Error('Run `pnpm build` first.');

const require = createRequire(import.meta.url);
const tsc = join(root, 'node_modules/.bin/tsc');

const subpaths = readdirSync(dist, { withFileTypes: true })
  .filter(
    (e) =>
      e.isDirectory() && e.name !== 'foundation' && existsSync(join(dist, e.name, 'index.d.ts')),
  )
  .map((e) => e.name);

const source = [
  `import * as barrel from '@wisp-ui/react';`,
  ...subpaths.map((name, i) => `import * as m${i} from '@wisp-ui/react/${name}';`),
  `export { barrel, ${subpaths.map((_, i) => `m${i}`).join(', ')} };`,
  '',
  '// The variant union is closed, so a wrong value must be a type error.',
  `import type { ButtonProps } from '@wisp-ui/react/button';`,
  `// @ts-expect-error`,
  `export const bad: ButtonProps = { variant: 'nope' };`,
  '',
].join('\n');

const failures: string[] = [];
const dir = mkdtempSync(join(tmpdir(), 'wisp-types-'));
try {
  mkdirSync(join(dir, 'node_modules/@wisp-ui'), { recursive: true });
  symlinkSync(root, join(dir, 'node_modules/@wisp-ui/react'));
  symlinkSync(
    dirname(require.resolve('@wisp-ui/tokens/package.json')),
    join(dir, 'node_modules/@wisp-ui/tokens'),
  );
  symlinkSync(dirname(require.resolve('react/package.json')), join(dir, 'node_modules/react'));
  symlinkSync(
    dirname(dirname(require.resolve('@types/react/package.json'))),
    join(dir, 'node_modules/@types'),
  );
  writeFileSync(join(dir, 'consumer.mts'), source);

  for (const mode of ['nodenext', 'bundler'] as const) {
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: mode === 'nodenext' ? 'nodenext' : 'esnext',
          moduleResolution: mode,
          target: 'es2022',
          jsx: 'react-jsx',
          strict: true,
          noEmit: true,
          skipLibCheck: false,
          types: [],
        },
        files: ['consumer.mts'],
      }),
    );
    try {
      execFileSync(tsc, ['-p', dir], { encoding: 'utf8', stdio: 'pipe' });
      console.log(`✓ ${mode}: ${subpaths.length} component entry points + barrel resolve`);
    } catch (error) {
      failures.push(`${mode}:\n${(error as { stdout?: string }).stdout ?? error}`);
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\nPublished types do not resolve for a consumer:\n\n${failures.join('\n')}`);
  process.exit(1);
}
