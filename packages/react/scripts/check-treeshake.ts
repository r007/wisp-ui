/**
 * Proves the library's headline promise: using one component ships only that
 * component's CSS.
 *
 * For every built component, bundles a throwaway app that imports only it (once
 * through the barrel, once through its subpath), then checks the emitted CSS for
 * other components' class names. Run after `pnpm build`.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
/** Gzipped CSS one component may ship on its own. Raise deliberately, not by accident. */
const CSS_GZIP_BUDGET_KB = 4;
/**
 * Components built from other components, which therefore ship those components' CSS too. Anything
 * not listed here must ship only its own. Add an entry deliberately: it is the one place a
 * component is allowed to pull in another's styles.
 */
const COMPOSED_OF: Record<string, readonly string[]> = {
  'fab-menu': ['fab'],
  search: ['search-bar', 'icon-button'],
  // A TextField that opens a menu's popup.
  select: ['text-field', 'menu'],
  'split-button': ['button', 'menu'],
  // The month arrows are IconButtons. (The dialog's Button and TextField are in its own module,
  // which the picker does not import.)
  'date-picker': ['icon-button'],
  // The mode toggle is an IconButton. (The dialog's Button is in its own module, which the picker
  // does not import.)
  'time-picker': ['icon-button'],
};
/**
 * Entries whose first export is not the component to import (a geometry class, say), so the check
 * names it. Everything else imports its first export.
 */
const ENTRY_EXPORT: Record<string, string> = { shapes: 'Shape' };
/** Folders in dist that are not components. */
const NOT_COMPONENTS = new Set(['foundation', 'theme']);

if (!existsSync(dist)) throw new Error('Run `pnpm build` first.');

const components = readdirSync(dist, { withFileTypes: true })
  .filter(
    (e) =>
      e.isDirectory() && !NOT_COMPONENTS.has(e.name) && existsSync(join(dist, e.name, 'index.js')),
  )
  .map((e) => ({
    name: e.name,
    // The first export of the entry is a component to import, unless the entry says otherwise.
    exportName:
      ENTRY_EXPORT[e.name] ??
      (/export \{\s*(\w+)/.exec(
        readFileSync(join(dist, e.name, 'index.js'), 'utf8'),
      )?.[1] as string),
  }));

/** Class names are `wisp-<component>__…` and `wisp-<component>-tokens__…`. */
const classPattern = (name: string) => new RegExp(`wisp-${name}(?:-tokens)?__`);

const failures: string[] = [];
const rows: string[][] = [['entry', 'css raw', 'css gzip', 'js gzip']];

const require = createRequire(import.meta.url);
const reactDir = dirname(require.resolve('react/package.json'));
const reactDomDir = dirname(require.resolve('react-dom/package.json'));
const tokensDir = dirname(require.resolve('@wisp-ui/tokens/package.json'));

async function bundle(
  label: string,
  source: string,
  allowedKb = CSS_GZIP_BUDGET_KB,
): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'wisp-treeshake-'));
  try {
    // A minimal consumer project: our packages and one copy of React.
    mkdirSync(join(dir, 'node_modules/@wisp-ui'), { recursive: true });
    symlinkSync(root, join(dir, 'node_modules/@wisp-ui/react'));
    symlinkSync(tokensDir, join(dir, 'node_modules/@wisp-ui/tokens'));
    symlinkSync(reactDir, join(dir, 'node_modules/react'));
    symlinkSync(reactDomDir, join(dir, 'node_modules/react-dom'));
    const entry = join(dir, 'main.js');
    await import('node:fs').then((fs) => fs.writeFileSync(entry, source));

    await build({
      root: dir,
      logLevel: 'silent',
      resolve: { dedupe: ['react', 'react-dom'] },
      build: {
        outDir: join(dir, 'out'),
        minify: true,
        rolldownOptions: { input: entry },
      },
    });

    const assets = join(dir, 'out/assets');
    const read = (ext: string) =>
      readdirSync(assets)
        .filter((f) => f.endsWith(ext))
        .map((f) => readFileSync(join(assets, f), 'utf8'))
        .join('\n');
    const css = read('.css');
    const js = read('.js');
    const gzipKb = gzipSync(css).length / 1024;
    if (gzipKb > allowedKb) {
      failures.push(
        `${label}: ${gzipKb.toFixed(1)} kB gzipped CSS exceeds the ${allowedKb} kB budget`,
      );
    }
    rows.push([
      label,
      `${(css.length / 1024).toFixed(1)} kB`,
      `${(gzipSync(css).length / 1024).toFixed(1)} kB`,
      `${(gzipSync(js).length / 1024).toFixed(1)} kB`,
    ]);
    return css;
  } finally {
    // KEEP=1 leaves the throwaway project behind for debugging.
    if (process.env.KEEP) console.log(`kept ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  }
}

for (const { name, exportName } of components) {
  for (const [via, from] of [
    ['barrel', '@wisp-ui/react'],
    ['subpath', `@wisp-ui/react/${name}`],
  ] as const) {
    const label = `${exportName} via ${via}`;
    const composedOf = COMPOSED_OF[name] ?? [];
    // A composite has its own budget plus each part's.
    const css = await bundle(
      label,
      `import { ${exportName} } from '${from}';\nconsole.log(${exportName});\n`,
      CSS_GZIP_BUDGET_KB * (1 + composedOf.length),
    );

    if (!classPattern(name).test(css)) failures.push(`${label}: its own CSS is missing`);
    for (const other of components) {
      if (other.name === name || composedOf.includes(other.name)) continue;
      if (classPattern(other.name).test(css))
        failures.push(`${label}: pulled in ${other.name} CSS`);
    }
    for (const part of composedOf) {
      if (!classPattern(part).test(css))
        failures.push(`${label}: expected ${part} CSS, which it is built from`);
    }
    // Component CSS must never define the global tokens: apps load those once.
    if (/--md-sys-color-primary\s*:/.test(css)) failures.push(`${label}: bundled the global theme`);
  }
}

const widths = rows[0]?.map((_, i) => Math.max(...rows.map((r) => r[i]?.length ?? 0))) ?? [];
for (const row of rows) console.log(row.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join('  '));

if (failures.length > 0) {
  console.error(`\n${failures.length} tree-shaking failure(s):\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`\n✓ ${components.length} components each ship only their own CSS`);
