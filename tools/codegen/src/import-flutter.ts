/**
 * Imports Material tokens from a checkout of `flutter/packages` into a single
 * normalised JSON database that the emitters consume.
 *
 * Run through `pnpm codegen import --source <path-to-gen_defaults/data>`.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseDartTokenFile } from './dart-parser.ts';
import type { SchemeAxis, SchemeSet, TokenDatabase, TokenValue } from './types.ts';

/** `color_light.dart`, `color_dark_high_contrast.dart`, … */
const COLOR_SCHEME_FILE = /^color_(light|dark)(?:_(medium|high)_contrast)?\.dart$/;

/**
 * Decides whether a token belongs to a scheme rather than the flat token map.
 *
 * `motion.dart` holds scheme-independent durations/easings *and* the Standard
 * spring set; `motion_expressive.dart` holds the Expressive spring set under
 * the very same names.
 */
function schemeOf(fileName: string, token: string): { axis: SchemeAxis; variant: string } | null {
  const color = COLOR_SCHEME_FILE.exec(fileName);
  if (color) {
    const variant = [color[1], color[2] && `${color[2]}-contrast`].filter(Boolean).join('-');
    return { axis: 'color', variant };
  }
  if (fileName === 'motion_expressive.dart') return { axis: 'motion', variant: 'expressive' };
  if (fileName === 'motion.dart' && token.startsWith('md.sys.motion.spring.')) {
    return { axis: 'motion', variant: 'standard' };
  }
  return null;
}

export interface ImportOptions {
  /** Directory holding the upstream `*.dart` data files. */
  sourceDir: string;
  repository: string;
  /** Path of `sourceDir` relative to the repository root. */
  path: string;
}

export function importFlutterTokens(options: ImportOptions): TokenDatabase {
  const sourceDir = resolve(options.sourceDir);
  const files = readdirSync(sourceDir)
    .filter((name) => name.endsWith('.dart'))
    .sort();

  const parsed = files.map((name) =>
    parseDartTokenFile(readFileSync(join(sourceDir, name), 'utf8'), name),
  );

  const versions = new Set(parsed.map((p) => p.version).filter((v): v is string => v !== null));
  if (versions.size !== 1) {
    throw new Error(`Expected one token version across files, found: ${[...versions].join(', ')}`);
  }

  // `Owner.member` → canonical token name, used to resolve symbolic references.
  const symbols = new Map<string, string>();
  for (const file of parsed) {
    for (const [name, { owner, member }] of file.owners) symbols.set(`${owner}.${member}`, name);
    for (const { owner, member, name } of file.enumMembers) symbols.set(`${owner}.${member}`, name);
  }

  const tokens: Record<string, TokenValue> = {};
  const schemes: Record<SchemeAxis, SchemeSet> = { color: {}, motion: {} };

  for (const file of parsed) {
    for (const raw of file.tokens) {
      const value = resolveValue(raw.value, symbols, file.fileName, raw.name);
      const scheme = schemeOf(file.fileName, raw.name);
      let target = tokens;
      if (scheme) {
        const set = schemes[scheme.axis];
        target = set[scheme.variant] ?? {};
        set[scheme.variant] = target;
      }
      const existing = target[raw.name];
      if (existing && JSON.stringify(existing) !== JSON.stringify(value)) {
        throw new Error(`${file.fileName}: conflicting duplicate token ${raw.name}`);
      }
      target[raw.name] = value;
    }
  }

  assertConsistent(tokens, schemes);

  return {
    meta: {
      repository: options.repository,
      path: options.path,
      commit: gitCommit(sourceDir),
      tokenVersion: [...versions][0] as string,
    },
    schemes: {
      color: sortSchemes(schemes.color),
      motion: sortSchemes(schemes.motion),
    },
    tokens: sortKeys(tokens),
  };
}

function resolveValue(
  value: ReturnType<typeof parseDartTokenFile>['tokens'][number]['value'],
  symbols: Map<string, string>,
  fileName: string,
  token: string,
): TokenValue {
  if (value.type !== 'dart-ref') return value;
  const target = symbols.get(`${value.owner}.${value.member}`);
  if (!target) throw new Error(`${fileName}: ${token}: unresolved ${value.owner}.${value.member}`);
  if (value.owner === 'TokenColorRole') return { type: 'color', role: colorRole(target) };
  return { type: 'ref', name: target };
}

/** `md.sys.color.on-primary` → `on-primary`. */
function colorRole(name: string): string {
  const prefix = 'md.sys.color.';
  if (!name.startsWith(prefix)) throw new Error(`Not a system colour token: ${name}`);
  return name.slice(prefix.length);
}

/** `light-high-contrast` → `light`. Overlay variants only restate what changes. */
export function baseVariant(variant: string): string {
  return variant.replace(/-(?:medium|high)-contrast$/, '');
}

/**
 * Cross-checks the database so emitters can rely on it:
 *
 * - Overlay variants (higher contrast) must only override roles that the base
 *   scheme defines; full variants of an axis must define identical token sets.
 * - Every `ref` must end at a concrete value, either in the flat map or in the
 *   full variants of a scheme.
 * - Every colour role a component uses must exist in the full colour schemes.
 */
function assertConsistent(
  tokens: Record<string, TokenValue>,
  schemes: Record<SchemeAxis, SchemeSet>,
): void {
  const schemeTokens = new Set<string>();
  for (const [axis, set] of Object.entries(schemes)) {
    const full = Object.entries(set).filter(([id]) => baseVariant(id) === id);
    const [firstId, first] = full[0] ?? [];
    if (!first) continue;
    for (const [id, record] of full) {
      const diff = Object.keys(first).filter((n) => !(n in record));
      if (diff.length > 0 || Object.keys(record).length !== Object.keys(first).length) {
        throw new Error(`${axis} schemes "${firstId}" and "${id}" define different tokens`);
      }
    }
    for (const [id, record] of Object.entries(set)) {
      const base = set[baseVariant(id)];
      const stray = Object.keys(record).filter((n) => !base || !(n in base));
      if (stray.length > 0) throw new Error(`${axis} overlay "${id}" overrides unknown: ${stray}`);
    }
    for (const name of Object.keys(first)) schemeTokens.add(name);
  }

  const missingRoles = new Set<string>();
  for (const [name, value] of Object.entries(tokens)) {
    if (value.type === 'color' && !schemeTokens.has(`md.sys.color.${value.role}`)) {
      missingRoles.add(value.role);
    }
    const seen = new Set([name]);
    let current: TokenValue = value;
    while (current.type === 'ref') {
      if (schemeTokens.has(current.name)) break;
      if (seen.has(current.name)) throw new Error(`Reference cycle through ${current.name}`);
      seen.add(current.name);
      const next: TokenValue | undefined = tokens[current.name];
      if (!next) throw new Error(`${name} references missing token ${current.name}`);
      current = next;
    }
  }
  if (missingRoles.size > 0) {
    throw new Error(`Components use colour roles absent from the schemes: ${[...missingRoles]}`);
  }
}

function sortSchemes(set: SchemeSet): SchemeSet {
  return sortKeys(
    Object.fromEntries(Object.entries(set).map(([id, record]) => [id, sortKeys(record)])),
  );
}

function sortKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

function gitCommit(dir: string): string {
  try {
    return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error(`${dir} is not inside a git checkout; cannot record provenance`);
  }
}

/**
 * Serialises with exactly one token per line so upstream updates produce
 * reviewable diffs.
 */
export function serializeDatabase({ meta, schemes, tokens }: TokenDatabase): string {
  const lines = (record: Record<string, unknown>, indent: string) =>
    Object.entries(record)
      .map(([key, value]) => `${indent}${JSON.stringify(key)}: ${JSON.stringify(value)}`)
      .join(',\n');

  const axisBlock = (set: SchemeSet) =>
    Object.entries(set)
      .map(
        ([variant, record]) =>
          `      ${JSON.stringify(variant)}: {\n${lines(record, '        ')}\n      }`,
      )
      .join(',\n');

  return [
    '{',
    `  "meta": ${JSON.stringify(meta)},`,
    '  "schemes": {',
    `    "color": {\n${axisBlock(schemes.color)}\n    },`,
    `    "motion": {\n${axisBlock(schemes.motion)}\n    }`,
    '  },',
    '  "tokens": {',
    lines(tokens, '    '),
    '  }',
    '}',
    '',
  ].join('\n');
}
