import { useEffect } from 'react';

const SUFFIX = 'Wisp UI';

/** The document's title and description, for the page being shown. */
export function usePageMeta(title: string | undefined, description?: string): void {
  useEffect(() => {
    document.title =
      title && title !== SUFFIX ? `${title} · ${SUFFIX}` : `${SUFFIX}: expressive React components`;
    if (description)
      document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}
