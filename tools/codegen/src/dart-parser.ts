/**
 * Parses the Material token data files shipped in `flutter/packages`
 * (`packages/material_ui/tool/gen_defaults/data/*.dart`) into the normalised
 * {@link TokenDatabase} model.
 *
 * The files are machine generated and highly regular:
 *
 *   /// md.comp.button.filled.container.color
 *   static const TokenColorRole containerColor = TokenColorRole.primary;
 *
 * but `dart format` may wrap a declaration across several lines at any
 * whitespace boundary, so this is a small scanner rather than a line parser.
 *
 * The parser is deliberately strict. An unrecognised value shape throws with
 * the file and token name instead of being skipped: silently dropping tokens
 * would produce subtly wrong components.
 */

import type { ShapeFamily, TokenValue } from './types.ts';

/** A declaration before symbolic references (`TokenMotion.x`) are resolved. */
type RawValue = TokenValue | { type: 'dart-ref'; owner: string; member: string };

export interface RawToken {
  name: string;
  value: RawValue;
}

export interface ParsedFile {
  fileName: string;
  /** Material token release from the `// Version:` header, if present. */
  version: string | null;
  /** Tokens declared as `static const` members. */
  tokens: RawToken[];
  /** Members of `enum` declarations: Dart identifier → canonical token name. */
  enumMembers: Array<{ owner: string; member: string; name: string }>;
  /** Owner (class) of each token's Dart member, keyed by token name. */
  owners: Map<string, { owner: string; member: string }>;
}

const DOC_COMMENT = /^[ \t]*\/\/\/[ \t]+(md\.\S+)[ \t]*$/gm;
const OWNER_DECLARATION = /^(?:abstract\s+)?(?:class|enum)\s+(\w+)/gm;
const STATIC_HEADER = /^static\s+const\s+(\w+)\s+(\w+)\s*=\s*/;
const ENUM_MEMBER = /^(\w+)\s*[,;]/;
const NUMBER = /^-?\d+(?:\.\d+)?$/;
const HEX_ARGB = /^0x([0-9a-fA-F]{8})$/;

export function parseDartTokenFile(source: string, fileName: string): ParsedFile {
  const owners = [...source.matchAll(OWNER_DECLARATION)].map((m) => ({
    name: m[1] as string,
    index: m.index,
  }));
  const ownerAt = (index: number): string => {
    let found: string | undefined;
    for (const owner of owners) {
      if (owner.index > index) break;
      found = owner.name;
    }
    if (!found) throw new Error(`${fileName}: declaration before any class or enum`);
    return found;
  };

  const tokens: RawToken[] = [];
  const enumMembers: ParsedFile['enumMembers'] = [];
  const ownerOfToken = new Map<string, { owner: string; member: string }>();
  let documented = 0;

  for (const doc of source.matchAll(DOC_COMMENT)) {
    documented++;
    const name = doc[1] as string;
    const afterDoc = source.slice(doc.index + doc[0].length).trimStart();
    const owner = ownerAt(doc.index);

    const header = STATIC_HEADER.exec(afterDoc);
    if (header) {
      const [matched, dartType, member] = header as unknown as [string, string, string];
      const expression = readExpression(afterDoc.slice(matched.length), fileName, name);
      tokens.push({ name, value: parseExpression(dartType, expression, fileName, name) });
      ownerOfToken.set(name, { owner, member });
      continue;
    }

    const enumMember = ENUM_MEMBER.exec(afterDoc);
    if (enumMember) {
      enumMembers.push({ owner, member: enumMember[1] as string, name });
      continue;
    }

    throw new Error(`${fileName}: cannot parse declaration following "${name}"`);
  }

  const parsed = tokens.length + enumMembers.length;
  if (parsed !== documented) {
    throw new Error(`${fileName}: parsed ${parsed} of ${documented} documented tokens`);
  }

  return {
    fileName,
    version: /^\/\/ Version: (\S+)/m.exec(source)?.[1] ?? null,
    tokens,
    enumMembers,
    owners: ownerOfToken,
  };
}

/** Reads a Dart expression up to its terminating `;` at nesting depth zero. */
function readExpression(text: string, fileName: string, token: string): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i] as string;
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === '(' || char === '[' || char === '{') depth++;
    else if (char === ')' || char === ']' || char === '}') depth--;
    else if (char === ';' && depth === 0) return text.slice(0, i).trim();
  }
  throw new Error(`${fileName}: unterminated declaration for "${token}"`);
}

function parseExpression(
  dartType: string,
  expression: string,
  fileName: string,
  token: string,
): RawValue {
  const fail = (why: string): never => {
    throw new Error(`${fileName}: ${token}: ${why} (${dartType} = ${expression})`);
  };

  const symbol = /^(Token\w+)\.(\w+)$/.exec(expression);
  if (symbol) {
    return { type: 'dart-ref', owner: symbol[1] as string, member: symbol[2] as string };
  }

  switch (dartType) {
    case 'double':
      return { type: 'number', value: parseNumber(expression, fail) };

    case 'String': {
      const value = parseString(expression, fail);
      const hex = HEX_ARGB.exec(value);
      return hex
        ? { type: 'hex', value: argbToCssHex(hex[1] as string) }
        : { type: 'string', value };
    }

    case 'Duration': {
      const args = parseCall(expression, 'Duration', fail);
      return { type: 'duration', ms: parseNumber(args.milliseconds, fail) };
    }

    case 'CubicStruct': {
      const args = parseCall(expression, 'CubicStruct', fail);
      const points = (['a', 'b', 'c', 'd'] as const).map((k) => parseNumber(args[k], fail));
      return {
        type: 'cubic-bezier',
        points: points as unknown as [number, number, number, number],
      };
    }

    case 'ShapeStruct': {
      const args = parseCall(expression, 'ShapeStruct', fail);
      const family = parseShapeFamily(parseString(args.family, fail), fail);
      const n = (key: string) => parseNumber(args[key], fail);
      return {
        type: 'shape',
        family,
        corners: [n('topLeft'), n('topRight'), n('bottomRight'), n('bottomLeft')],
      };
    }

    case 'TypescaleStruct': {
      const args = parseCall(expression, 'TypescaleStruct', fail);
      return {
        type: 'typescale',
        font: parseString(args.fontFamily, fail),
        size: parseNumber(args.fontSize, fail),
        weight: parseNumber(args.fontWeight, fail),
        lineHeight: parseNumber(args.lineHeight, fail),
        tracking: parseNumber(args.letterSpacing, fail),
      };
    }

    default:
      return fail(`unsupported Dart type "${dartType}"`);
  }
}

type Fail = (why: string) => never;

function parseNumber(text: string | undefined, fail: Fail): number {
  if (text === undefined || !NUMBER.test(text)) return fail(`expected a number, got "${text}"`);
  return Number(text);
}

function parseString(text: string | undefined, fail: Fail): string {
  const match = text === undefined ? null : /^'([^'\\]*)'$/.exec(text);
  if (!match) return fail(`expected a simple single-quoted string, got "${text}"`);
  return match[1] as string;
}

function parseShapeFamily(value: string, fail: Fail): ShapeFamily {
  if (value === 'SHAPE_FAMILY_CIRCULAR') return 'circular';
  if (value === 'SHAPE_FAMILY_ROUNDED_CORNERS') return 'rounded';
  return fail(`unknown shape family "${value}"`);
}

/** Parses `Name(key: value, key: value,)` into a key → raw text record. */
function parseCall(expression: string, name: string, fail: Fail): Record<string, string> {
  const match = new RegExp(`^${name}\\(([\\s\\S]*)\\)$`).exec(expression);
  if (!match) return fail(`expected ${name}(...)`);
  const args: Record<string, string> = {};
  for (const part of splitTopLevel(match[1] as string)) {
    const arg = /^(\w+)\s*:\s*([\s\S]+)$/.exec(part.trim());
    if (!arg) return fail(`malformed argument "${part.trim()}"`);
    args[arg[1] as string] = (arg[2] as string).trim();
  }
  return args;
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i] as string;
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.filter((p) => p.trim() !== '');
}

/** `AARRGGBB` → `#rrggbb` (opaque) or `#rrggbbaa`. */
export function argbToCssHex(argb: string): string {
  const alpha = argb.slice(0, 2).toLowerCase();
  const rgb = argb.slice(2).toLowerCase();
  return alpha === 'ff' ? `#${rgb}` : `#${rgb}${alpha}`;
}
