import type { TokenDatabase, TokenValue } from './types.ts';

/** Compact, human-readable rendering of a token value for the `tokens` command. */
export function describeValue(value: TokenValue): string {
  switch (value.type) {
    case 'color':
      return `color:${value.role}`;
    case 'number':
      return String(value.value);
    case 'ref':
      return `→ ${value.name.replace('md.sys.', '')}`;
    case 'shape': {
      const [a, b, c, d] = value.corners;
      const radii = a === b && b === c && c === d ? String(a) : value.corners.join(' ');
      return `shape:${value.family}(${radii})`;
    }
    case 'typescale':
      return `type:${value.weight} ${value.size}/${value.lineHeight}`;
    case 'hex':
    case 'string':
      return value.value;
    case 'duration':
      return `${value.ms}ms`;
    case 'cubic-bezier':
      return `cubic-bezier(${value.points.join(', ')})`;
  }
}

/** Lists the tokens under `prefix`, relative to it, for porters choosing what to map. */
export function listTokens(db: TokenDatabase, prefix: string): string[] {
  const dotted = prefix.endsWith('.') ? prefix : `${prefix}.`;
  const entries = Object.entries(db.tokens).filter(([name]) => name.startsWith(dotted));
  const width = Math.max(0, ...entries.map(([name]) => name.length - dotted.length));
  return entries.map(
    ([name, value]) => `${name.slice(dotted.length).padEnd(width)}  ${describeValue(value)}`,
  );
}
