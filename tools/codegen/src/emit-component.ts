/**
 * Emits a component's token defaults as a CSS Module.
 *
 * Hand-written component CSS never contains a literal colour, size or timing.
 * It reads private custom properties (`--_container-color`) that this emitter
 * defines per selector from the Material token database:
 *
 *   .filled {
 *     --_container-color: var(--md-comp-button-filled-container-color,
 *                             var(--md-sys-color-primary));
 *   }
 *
 * The first `var()` is the public override a consumer can set on any ancestor
 * (the same token name Material publishes); the fallback is the Material
 * default, expressed in terms of system tokens so theming still flows through.
 *
 * Only the tokens a component actually uses are emitted, which keeps the
 * stylesheet small enough to ship per component.
 */

import { customProperty, ms, num, px } from './css.ts';
import { cornerRadius, elevationLevels } from './emit-system.ts';
import type { TokenDatabase, TokenValue } from './types.ts';
import { numberKind } from './units.ts';

/** One token, or several that must all resolve to the same value. */
export type VarSource = string | readonly string[];

export interface TokenBlock {
  /**
   * Selector the variables are declared on. Class names in it become exports
   * of the CSS Module, e.g. `.filled` or `.filled.selected`.
   */
  selector: string;
  /** Token name prefix; paths in `vars` are relative to it. */
  prefix: string;
  /**
   * Private variable name (without `--_`) → token path(s) relative to `prefix`.
   * An array asserts that every listed token resolves to the same value.
   */
  vars: Readonly<Record<string, VarSource>>;
  /**
   * What the "circular" shape family means for this block. Defaults to a very
   * large radius; set e.g. `calc(var(--_container-height) / 2)` when the
   * radius is animated and must have a real value to interpolate from.
   */
  circularRadius?: string;
}

export interface ComponentTokenSpec {
  /** Used in the generated file's header. */
  name: string;
  blocks: readonly TokenBlock[];
}

export interface EmitComponentOptions {
  layer: string;
  /** Spec file the output came from, for the header comment. */
  source: string;
}

export function emitComponentCss(
  db: TokenDatabase,
  spec: ComponentTokenSpec,
  options: EmitComponentOptions,
): string {
  const ctx = { db, levels: elevationLevels(db) };
  const blocks = spec.blocks.map((block) => {
    const declarations = Object.entries(block.vars).flatMap(([name, source]) =>
      declare(ctx, spec.name, block, name, source),
    );
    return `  ${block.selector} {\n${declarations.map((d) => `    ${d}`).join('\n')}\n  }`;
  });

  return [
    `/* ${spec.name} token defaults.`,
    ` *`,
    ` * Generated from ${options.source} and Material tokens v${db.meta.tokenVersion}`,
    ` * (${db.meta.repository} @ ${db.meta.commit.slice(0, 9)}). Do not edit by hand. */`,
    '',
    `@layer ${options.layer} {`,
    blocks.join('\n\n'),
    '}',
    '',
  ].join('\n');
}

interface Context {
  db: TokenDatabase;
  levels: Map<number, number>;
}

function declare(
  ctx: Context,
  component: string,
  block: TokenBlock,
  name: string,
  source: VarSource,
): string[] {
  const paths = typeof source === 'string' ? [source] : source;
  const where = `${component}: ${block.selector} --_${name}`;
  if (paths.length === 0) throw new Error(`${where}: empty token list`);

  const tokens = paths.map((path) => lookup(ctx.db, `${block.prefix}.${path}`, where));

  // Springs are published as separate stiffness and damping tokens that both
  // alias a named system spring; collapse them into the one system variable.
  if (tokens.every((t) => /\.spring\.(?:stiffness|damping|dampening)$/.test(t.name))) {
    return [springDeclaration(tokens, name, where)];
  }

  const [first, ...rest] = tokens as [Resolved, ...Resolved[]];
  for (const other of rest) {
    if (JSON.stringify(other.value) !== JSON.stringify(first.value)) {
      throw new Error(
        `${where}: expected ${first.name} and ${other.name} to be equal ` +
          `(${JSON.stringify(first.value)} vs ${JSON.stringify(other.value)}); ` +
          'the hand-written CSS relies on this, so review the component after an upstream change',
      );
    }
  }

  const publicName = customProperty(first.name);
  const emitted = format(ctx, first, block, where);
  return emitted.map(({ suffix, value }) => {
    const property = suffix ? `${publicName}${suffix}` : publicName;
    return `--_${name}${suffix}: var(${property}, ${value});`;
  });
}

interface Resolved {
  /** Token name as written in the spec. */
  name: string;
  /** Value after following non-system aliases. */
  value: TokenValue;
  /** The system token the first alias pointed at, when it is a system token. */
  systemRef?: string;
}

function lookup(db: TokenDatabase, name: string, where: string): Resolved {
  const direct = db.tokens[name];
  if (!direct) {
    const prefix = name.slice(0, name.lastIndexOf('.'));
    const siblings = Object.keys(db.tokens)
      .filter((n) => n.startsWith(prefix))
      .slice(0, 8);
    throw new Error(
      `${where}: unknown token ${name}${siblings.length ? `\n  nearby: ${siblings.join('\n          ')}` : ''}`,
    );
  }

  let value = direct;
  let systemRef: string | undefined;
  while (value.type === 'ref') {
    const target = value.name;
    // Typescales and scheme tokens stay symbolic so the system variable (and
    // therefore the active scheme) keeps driving the component.
    if (target.startsWith('md.sys.typescale.') || target.startsWith('md.sys.motion.spring.')) {
      systemRef = target;
      break;
    }
    const next = db.tokens[target];
    if (!next) throw new Error(`${where}: ${name} → missing ${target}`);
    value = next;
  }
  return systemRef ? { name, value, systemRef } : { name, value };
}

function format(
  ctx: Context,
  token: Resolved,
  block: TokenBlock,
  where: string,
): Array<{ suffix: string; value: string }> {
  const { value } = token;

  if (token.systemRef?.startsWith('md.sys.typescale.')) {
    const system = customProperty(token.systemRef);
    return [
      { suffix: '', value: `var(${system})` },
      { suffix: '-tracking', value: `var(${system}-tracking)` },
    ];
  }

  switch (value.type) {
    case 'color':
      return [{ suffix: '', value: `var(${customProperty(`md.sys.color.${value.role}`)})` }];

    case 'hex':
      return [{ suffix: '', value: value.value }];

    case 'number': {
      const kind = numberKind(token.name);
      if (kind === 'ratio') return [{ suffix: '', value: num(value.value) }];
      if (kind === 'length') return [{ suffix: '', value: px(value.value) }];
      const level = ctx.levels.get(value.value);
      if (level === undefined) {
        throw new Error(`${where}: ${token.name} = ${value.value}dp is not a Material elevation`);
      }
      return [{ suffix: '', value: `var(--md-sys-elevation-level${level})` }];
    }

    case 'shape':
      return [{ suffix: '', value: cornerRadius(value, block.circularRadius) }];

    case 'duration':
      return [{ suffix: '', value: ms(value.ms) }];

    case 'cubic-bezier':
      return [{ suffix: '', value: `cubic-bezier(${value.points.map((p) => num(p)).join(', ')})` }];

    default:
      throw new Error(`${where}: ${token.name} has unsupported type "${value.type}"`);
  }
}

function springDeclaration(tokens: Resolved[], name: string, where: string): string {
  const bases = new Set(
    tokens.map((t) => {
      if (!t.systemRef) {
        throw new Error(
          `${where}: ${t.name} is a literal spring; only system springs are supported`,
        );
      }
      return t.systemRef.replace(/\.(?:stiffness|damping)$/, '');
    }),
  );
  if (bases.size !== 1) {
    throw new Error(`${where}: stiffness and damping reference different springs: ${[...bases]}`);
  }
  const system = customProperty([...bases][0] as string);
  const first = tokens[0] as Resolved;
  const publicName = customProperty(first.name.replace(/\.(?:stiffness|damping|dampening)$/, ''));
  return `--_${name}: var(${publicName}, var(${system}));`;
}
