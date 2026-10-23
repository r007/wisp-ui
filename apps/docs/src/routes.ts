import { components, guides } from 'virtual:wisp-docs';

export type Route =
  | { name: 'home' }
  | { name: 'components' }
  | { name: 'component'; slug: string }
  | { name: 'guide'; slug: string }
  | { name: 'not-found' };

/** Which page a path in the site is. */
export function matchRoute(path: string): Route {
  if (path === '/') return { name: 'home' };
  if (path === '/components/') return { name: 'components' };
  const component = /^\/components\/([\w-]+)\/$/.exec(path)?.[1];
  if (component && components.some((c) => c.slug === component))
    return { name: 'component', slug: component };
  const guide = /^\/docs\/([\w-]+)\/$/.exec(path)?.[1];
  if (guide && guides.some((g) => g.slug === guide)) return { name: 'guide', slug: guide };
  // `/docs/` alone is the first guide.
  if (path === '/docs/' && guides[0]) return { name: 'guide', slug: guides[0].slug };
  return { name: 'not-found' };
}
