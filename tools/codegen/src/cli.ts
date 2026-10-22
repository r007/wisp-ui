import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { DATABASE_PATH, loadDatabase } from './database.ts';
import { discoverSpecs } from './discover.ts';
import { emitComponentCss } from './emit-component.ts';
import { emitColorRoles, emitSystemCss } from './emit-system.ts';
import { listTokens } from './explore.ts';
import { importFlutterTokens, serializeDatabase } from './import-flutter.ts';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
export const CSS_LAYER = 'wisp';

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`wrote ${path.replace(`${REPO_ROOT}/`, '')}`);
}

const USAGE = `Usage: pnpm codegen <command>

Commands:
  import --source <dir>   Import tokens from flutter/packages
                          (<checkout>/packages/material_ui/tool/gen_defaults/data)
  generate                Regenerate every generated stylesheet from data/tokens.json
  tokens <prefix>         List upstream tokens under a prefix, e.g. md.comp.button.filled
`;

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case 'import': {
    const { values } = parseArgs({
      args: rest,
      options: { source: { type: 'string' } },
    });
    if (!values.source) {
      console.error(`Missing --source\n\n${USAGE}`);
      process.exit(2);
    }
    const database = importFlutterTokens({
      sourceDir: values.source,
      repository: 'https://github.com/flutter/packages',
      path: 'packages/material_ui/tool/gen_defaults/data',
    });
    write(fileURLToPath(DATABASE_PATH), serializeDatabase(database));
    console.log(
      `Imported ${Object.keys(database.tokens).length} tokens, ` +
        `${Object.keys(database.schemes.color).length} colour and ` +
        `${Object.keys(database.schemes.motion).length} motion schemes ` +
        `(token v${database.meta.tokenVersion} @ ${database.meta.commit.slice(0, 9)})`,
    );
    break;
  }
  case 'generate': {
    const database = loadDatabase();
    write(
      resolve(REPO_ROOT, 'packages/tokens/src/theme.generated.css'),
      emitSystemCss(database, { layer: CSS_LAYER }),
    );
    write(
      resolve(REPO_ROOT, 'packages/tokens/src/color-roles.generated.ts'),
      emitColorRoles(database),
    );
    for (const { file, spec, output } of await discoverSpecs(
      resolve(REPO_ROOT, 'packages/react/src'),
    )) {
      write(
        output,
        emitComponentCss(database, spec, {
          layer: CSS_LAYER,
          source: file.split('/').pop() as string,
        }),
      );
    }
    break;
  }
  case 'tokens': {
    const prefix = rest[0];
    if (!prefix) {
      console.error(`Missing <prefix>\n\n${USAGE}`);
      process.exit(2);
    }
    const lines = listTokens(loadDatabase(), prefix);
    if (lines.length === 0) console.error(`No tokens under ${prefix}`);
    console.log(lines.join('\n'));
    break;
  }
  default:
    console.error(USAGE);
    process.exit(command ? 2 : 0);
}
