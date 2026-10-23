import { components, guides } from 'virtual:wisp-docs';
import { Button } from '@wisp-ui/react/button';
import { IconButton } from '@wisp-ui/react/icon-button';
import { Sheet } from '@wisp-ui/react/sheet';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { href, useLocation } from '../router.js';
import { ExternalIcon, GitHubIcon, MenuIcon } from '../ui/icons.js';
import { Mark } from '../ui/mark.js';
import { useMatchMedia } from '../ui/use-match-media.js';
import { SiteSearch } from './search.js';
import { ThemeMenu } from './theme-menu.js';

export const REPO = 'https://github.com/r007/wisp-ui';

/** The side navigation: the guides by section, then the components by group. */
function NavTree({ onNavigate }: { onNavigate?: () => void }) {
  const { path } = useLocation();
  const sections = useMemo(() => {
    const result = new Map<string, { slug: string; title: string }[]>();
    for (const guide of guides)
      result.set(guide.section, [...(result.get(guide.section) ?? []), guide]);
    return result;
  }, []);
  const groups = useMemo(() => {
    const result = new Map<string, typeof components>();
    for (const component of components)
      result.set(component.group, [...(result.get(component.group) ?? []), component]);
    return result;
  }, []);

  const link = (to: string, label: string) => (
    <li key={to}>
      <a
        className="nav-link"
        href={href(to)}
        aria-current={path === to ? 'page' : undefined}
        onClick={onNavigate}
      >
        {label}
      </a>
    </li>
  );

  return (
    <nav aria-label="Documentation">
      {[...sections].map(([section, items]) => (
        <div className="nav-group" key={section}>
          <h2 className="nav-heading">{section}</h2>
          <ul className="nav-list">{items.map((g) => link(`/docs/${g.slug}/`, g.title))}</ul>
        </div>
      ))}
      <div className="nav-group">
        <h2 className="nav-heading">Components</h2>
        <ul className="nav-list">{link('/components/', 'All components')}</ul>
      </div>
      {[...groups].map(([group, items]) => (
        <div className="nav-group" key={group}>
          <h2 className="nav-heading">{group}</h2>
          <ul className="nav-list">{items.map((c) => link(`/components/${c.slug}/`, c.title))}</ul>
        </div>
      ))}
    </nav>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  // On a phone the search is a button that opens over the whole screen.
  const compact = useMatchMedia('(max-width: 640px)');
  return (
    <header className="site-header">
      <IconButton className="menu-button" aria-label="Open navigation" onClick={onMenu}>
        <MenuIcon />
      </IconButton>
      <a className="brand" href={href('/')}>
        <Mark className="brand-mark" />
        <span>
          Wisp <span className="brand-ui">UI</span>
        </span>
      </a>
      <nav className="header-nav" aria-label="Main">
        <Button variant="text" href={href('/docs/getting-started/')}>
          Docs
        </Button>
        <Button variant="text" href={href('/components/')}>
          Components
        </Button>
      </nav>
      <span className="header-spacer" />
      <div className="header-search">
        <SiteSearch variant={compact ? 'full-screen' : 'docked'} />
      </div>
      <ThemeMenu />
      <IconButton
        variant="standard"
        aria-label="Wisp UI on GitHub"
        href={REPO}
        target="_blank"
        rel="noopener noreferrer"
      >
        <GitHubIcon />
      </IconButton>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <span>Apache-2.0 · © 2026 Sergey Monin and Wisp contributors</span>
      <nav aria-label="Project">
        <a href={REPO} target="_blank" rel="noopener noreferrer">
          GitHub <ExternalIcon />
        </a>
        <a href={href('/storybook/')} data-reload="">
          Storybook
        </a>
        <a href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer">
          Issues
        </a>
        <a
          href="https://www.npmjs.com/package/@wisp-ui/react"
          target="_blank"
          rel="noopener noreferrer"
        >
          npm
        </a>
        <a href={href('/docs/changelog/')}>Changelog</a>
        <a href={href('/docs/licences/')}>Licences and credits</a>
      </nav>
    </footer>
  );
}

/** "On this page": the headings, with the one being read marked. */
export function Toc({ items }: { items: { id: string; text: string; depth: number }[] }) {
  const [active, setActive] = useState('');

  useEffect(() => {
    if (items.length === 0) return;
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((e): e is HTMLElement => e !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost heading that is in the upper part of the screen, or the last one scrolled past.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-72px 0px -70% 0px' },
    );
    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;
  return (
    <aside className="toc" aria-label="On this page">
      <h2 className="toc-title">On this page</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id} data-depth={item.depth}>
            <a href={`#${item.id}`} aria-current={active === item.id ? 'true' : undefined}>
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** The frame of every page. */
export function Shell({
  children,
  toc,
  wide = false,
  bare = false,
}: {
  children: ReactNode;
  toc?: ReactNode;
  wide?: boolean;
  /** Without the side navigation: for the front page. */
  bare?: boolean;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const { path } = useLocation();

  // A page is a different place: the sheet has done its job.
  // biome-ignore lint/correctness/useExhaustiveDependencies: closing on a new path is the point.
  useEffect(() => setNavOpen(false), [path]);

  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <Header onMenu={() => setNavOpen(true)} />
      <div className="site-body" data-bare={bare ? '' : undefined}>
        {bare ? null : (
          <aside className="sidebar" aria-label="Navigation">
            <NavTree />
          </aside>
        )}
        <div className="content-wrap" data-wide={wide || !toc ? '' : undefined}>
          <main id="content" className="content" tabIndex={-1} data-wide={wide ? '' : undefined}>
            {children}
          </main>
          {toc}
        </div>
      </div>
      <Footer />
      <Sheet
        side="start"
        open={navOpen}
        onOpenChange={setNavOpen}
        aria-label="Navigation"
        dragHandle={false}
      >
        <div className="sheet-nav">
          <NavTree onNavigate={() => setNavOpen(false)} />
        </div>
      </Sheet>
    </>
  );
}
