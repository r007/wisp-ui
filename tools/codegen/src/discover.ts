import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ComponentTokenSpec } from './emit-component.ts';

export interface DiscoveredSpec {
  /** Absolute path of the `*.tokens.ts` spec. */
  file: string;
  spec: ComponentTokenSpec;
  /** Absolute path the generated CSS Module is written to. */
  output: string;
}

const SKIP = new Set(['node_modules', 'dist', 'storybook-static']);

/** Finds every `*.tokens.ts` under `root` and loads its default export. */
export async function discoverSpecs(root: string): Promise<DiscoveredSpec[]> {
  const files = readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tokens.ts'))
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((file) => !file.split('/').some((part) => SKIP.has(part)))
    .sort();

  return Promise.all(
    files.map(async (file) => {
      const { default: spec } = (await import(pathToFileURL(file).href)) as {
        default?: ComponentTokenSpec;
      };
      if (!spec?.blocks) throw new Error(`${file} must default-export a ComponentTokenSpec`);
      return { file, spec, output: file.replace(/\.ts$/, '.generated.module.css') };
    }),
  );
}
