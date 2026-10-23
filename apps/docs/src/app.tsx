import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from './router.js';
import { matchRoute } from './routes.js';
import { useSiteTheme } from './site-theme.js';

// Each page is its own chunk, so a component page does not carry the front page's components.
const Home = lazy(() => import('./pages/home.js').then((m) => ({ default: m.Home })));
const ComponentsIndex = lazy(() =>
  import('./pages/components-index.js').then((m) => ({ default: m.ComponentsIndex })),
);
const ComponentPage = lazy(() =>
  import('./pages/component-page.js').then((m) => ({ default: m.ComponentPage })),
);
const GuidePage = lazy(() =>
  import('./pages/guide-page.js').then((m) => ({ default: m.GuidePage })),
);
const NotFound = lazy(() => import('./pages/not-found.js').then((m) => ({ default: m.NotFound })));

/** Scrolls to what a link's `#hash` names, once the page has made it (pages load their data). */
function scrollToHash(hash: string) {
  const id = hash.slice(1);
  let tries = 0;
  const attempt = () => {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView();
    else if (tries++ < 40) requestAnimationFrame(attempt);
  };
  attempt();
}

/** A new page starts at its top with the focus in it, and says so to a screen reader. */
function useRouteEffects(_path: string, hash: string) {
  const first = useRef(true);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (hash) scrollToHash(hash);
      return;
    }
    if (hash) scrollToHash(hash);
    else {
      window.scrollTo(0, 0);
      document.getElementById('content')?.focus({ preventScroll: true });
    }
    const timer = setTimeout(() => setAnnouncement(document.title), 300);
    return () => clearTimeout(timer);
    // The path is the trigger; `hash` is read when it changes with it.
  }, [hash]);

  return announcement;
}

export function App() {
  const { path, hash } = useLocation();
  // The site's colour and scheme are applied for the whole app.
  useSiteTheme();
  const announcement = useRouteEffects(path, hash);
  const route = matchRoute(path);

  return (
    <Suspense fallback={null}>
      {route.name === 'home' ? <Home /> : null}
      {route.name === 'components' ? <ComponentsIndex /> : null}
      {route.name === 'component' ? <ComponentPage key={route.slug} slug={route.slug} /> : null}
      {route.name === 'guide' ? <GuidePage key={route.slug} slug={route.slug} /> : null}
      {route.name === 'not-found' ? <NotFound /> : null}
      <div className="route-announcer" role="status" aria-live="polite">
        {announcement}
      </div>
    </Suspense>
  );
}
