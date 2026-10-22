import { readFileSync } from 'node:fs';
import type { TokenDatabase } from './types.ts';

export const DATABASE_PATH = new URL('../data/tokens.json', import.meta.url);

export function loadDatabase(): TokenDatabase {
  return JSON.parse(readFileSync(DATABASE_PATH, 'utf8')) as TokenDatabase;
}
