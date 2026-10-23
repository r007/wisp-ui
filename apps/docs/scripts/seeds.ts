/** The colours the site can be themed with: a seed each, which the theme generator spreads into a palette. */

export interface Seed {
  id: string;
  label: string;
  color: string;
}

export const SEEDS: readonly Seed[] = [
  { id: 'teal', label: 'Teal', color: '#006a60' },
  { id: 'blue', label: 'Blue', color: '#0061a4' },
  { id: 'violet', label: 'Violet', color: '#6750a4' },
  { id: 'rose', label: 'Rose', color: '#9c4146' },
  { id: 'amber', label: 'Amber', color: '#7a5900' },
  { id: 'green', label: 'Green', color: '#386a20' },
];

export const DEFAULT_SEED = 'teal';

/** `localStorage` key for the chosen seed: a preset's id, or a `#rrggbb` colour of the visitor's own. */
export const SEED_STORAGE_KEY = 'wisp-docs-seed';
