import { Button } from '@wisp-ui/react/button';
import { Shape, shapes } from '@wisp-ui/react/shapes';
import { Shell } from '../layout/shell.js';
import { href } from '../router.js';
import { usePageMeta } from '../ui/page-meta.js';

export function NotFound() {
  usePageMeta('Page not found');
  return (
    <Shell wide>
      <div className="not-found">
        <Shape shape={shapes.ghostish} size={96} />
        <h1 className="page-title">That page is not here</h1>
        <p className="page-lede">
          It may have moved, or never been. Try the components, or the guides.
        </p>
        <div className="not-found-actions">
          <Button variant="filled" href={href('/components/')}>
            Components
          </Button>
          <Button variant="tonal" href={href('/docs/getting-started/')}>
            Getting started
          </Button>
        </div>
      </div>
    </Shell>
  );
}
