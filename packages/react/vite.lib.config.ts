import { existsSync, readdirSync } from 'node:fs';
import { defineConfig, mergeConfig } from 'vite';
import { libInjectCss } from 'vite-plugin-lib-inject-css';
import base from './vite.config.js';

const root = import.meta.dirname;

/** One entry per top-level folder that has an index.ts (a public component), plus the barrel. */
function entries(): Record<string, string> {
  const result: Record<string, string> = { index: 'src/index.ts' };
  for (const entry of readdirSync(`${root}/src`, { withFileTypes: true })) {
    const index = `src/${entry.name}/index.ts`;
    if (entry.isDirectory() && existsSync(`${root}/${index}`))
      result[`${entry.name}/index`] = index;
  }
  return result;
}

export default mergeConfig(
  base,
  defineConfig({
    // Emits `import './x.module.css'` into each module, so a component pulls in
    // only its own stylesheet.
    plugins: [libInjectCss()],
    build: {
      lib: { entry: entries(), formats: ['es'] },
      // Libraries ship readable output; the consuming app minifies.
      minify: false,
      cssMinify: false,
      cssCodeSplit: true,
      sourcemap: true,
      rolldownOptions: {
        external: [/^react($|\/)/, /^@wisp-ui\//, /^@material\//],
        output: {
          preserveModules: true,
          preserveModulesRoot: 'src',
          entryFileNames: '[name].js',
          // The class names are already scoped and baked into the JS, so ship plain
          // `.css`. Consumers' bundlers always keep a bare `import './x.css'`, but
          // drop a bare CSS *Module* import whose exports are unused, which would
          // silently lose the component's styles.
          assetFileNames: ({ names }) =>
            `${(names[0] ?? '[name]').replace(/\.module\.css$/, '.css')}`,
        },
      },
    },
  }),
);
