import { components } from 'virtual:wisp-docs';
import { Chip, ChipGroup } from '@wisp-ui/react/chip';
import { useMemo, useState } from 'react';
import { Shell } from '../layout/shell.js';
import { href } from '../router.js';
import { usePageMeta } from '../ui/page-meta.js';

const GROUPS = [...new Set(components.map((c) => c.group))];

/** Every component, by group, to filter and open. */
export function ComponentsIndex() {
  usePageMeta(
    'Components',
    `${components.length} components, each with live examples and its full API.`,
  );
  const [group, setGroup] = useState<string | null>(null);
  const shown = useMemo(() => components.filter((c) => !group || c.group === group), [group]);

  return (
    <Shell wide>
      <div className="prose">
        <h1 className="page-title">Components</h1>
        <p className="page-lede">
          {components.length} components that work on their own: take one and you get its CSS, not
          the kit's.
        </p>
      </div>
      <ChipGroup aria-label="Show components of a kind" className="group-filter">
        <Chip variant="filter" selected={group === null} onSelectedChange={() => setGroup(null)}>
          All
        </Chip>
        {GROUPS.map((g) => (
          <Chip
            key={g}
            variant="filter"
            selected={group === g}
            onSelectedChange={() => setGroup(group === g ? null : g)}
          >
            {g}
          </Chip>
        ))}
      </ChipGroup>
      <ul className="tile-grid">
        {shown.map((component) => (
          <li key={component.slug}>
            <a className="tile" href={href(`/components/${component.slug}/`)}>
              <span className="tile-group">{component.group}</span>
              <span className="tile-title">{component.title}</span>
              <span
                className="tile-summary"
                dangerouslySetInnerHTML={{ __html: component.summary }}
              />
            </a>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
