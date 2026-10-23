import type { SearchEntry } from 'virtual:wisp-docs';
import { List, ListItem } from '@wisp-ui/react/list';
import { Search } from '@wisp-ui/react/search';
import { useEffect, useMemo, useState } from 'react';
import { href, navigate } from '../router.js';

type Entry = SearchEntry;

const KIND_ORDER = { Component: 0, Guide: 1, Section: 2, Prop: 3 } as const;

/** Entries that match every word typed, best first: a title that starts with it, then one that contains it. */
function find(index: Entry[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored: { entry: Entry; score: number }[] = [];
  for (const entry of index) {
    const title = entry.title.toLowerCase();
    const rest = `${entry.context ?? ''} ${entry.text}`.toLowerCase();
    let score = 0;
    let all = true;
    for (const word of words) {
      if (title === word) score += 100;
      else if (title.startsWith(word)) score += 60;
      else if (title.includes(word)) score += 30;
      else if (rest.includes(word)) score += 5;
      else {
        all = false;
        break;
      }
    }
    if (all) scored.push({ entry, score: score - KIND_ORDER[entry.kind] * 2 });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, 12);
}

/** Pages worth offering before anything is typed. */
const SUGGESTED_PATHS = [
  'components/button/',
  'docs/getting-started/',
  'docs/theming/',
  'components/text-field/',
];

/** Search over the guides, the components and their props. */
export function SiteSearch({ variant = 'docked' }: { variant?: 'docked' | 'full-screen' }) {
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState(false);
  const [index, setIndex] = useState<Entry[]>([]);

  // The index is a module of its own, fetched the first time search is opened.
  useEffect(() => {
    if (!opened || index.length > 0) return;
    import('virtual:wisp-docs/search').then((module) => setIndex(module.default));
  }, [opened, index.length]);

  const results = useMemo(() => find(index, query), [index, query]);
  const suggested = useMemo(
    () =>
      SUGGESTED_PATHS.map((path) => index.find((e) => e.path === path)).filter(
        (e): e is Entry => e !== undefined,
      ),
    [index],
  );
  const shown = query.trim() ? results.map((r) => r.entry) : suggested;

  return (
    <Search
      aria-label="Search the documentation"
      placeholder="Search docs and components"
      variant={variant}
      value={query}
      onValueChange={setQuery}
      onOpenChange={(open) => open && setOpened(true)}
      onSearch={() => {
        // Enter goes to the best match.
        const best = shown[0];
        if (best) navigate(`/${best.path}`);
      }}
    >
      {shown.length === 0 ? (
        <p className="search-empty">Nothing matches “{query}”.</p>
      ) : (
        <List aria-label={query.trim() ? 'Results' : 'Suggestions'}>
          {shown.map((entry) => (
            <ListItem
              key={entry.path}
              href={href(`/${entry.path}`)}
              overline={entry.context ?? entry.kind}
              headline={entry.title}
              supportingText={
                entry.kind === 'Component' || entry.kind === 'Guide'
                  ? entry.text.slice(0, 90)
                  : undefined
              }
            />
          ))}
        </List>
      )}
    </Search>
  );
}
