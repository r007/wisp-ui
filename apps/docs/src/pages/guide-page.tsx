import { guideLoaders } from 'virtual:wisp-docs';
import type { GuidePageData } from 'virtual:wisp-docs/guide/_';
import { useEffect, useState } from 'react';
import { Shell, Toc } from '../layout/shell.js';
import { usePageMeta } from '../ui/page-meta.js';

/** A guide: Markdown, made into HTML at build time. */
export function GuidePage({ slug }: { slug: string }) {
  const [page, setPage] = useState<GuidePageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPage(null);
    guideLoaders[slug]?.().then((module) => !cancelled && setPage(module.default));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  usePageMeta(page?.title, page?.description);

  return (
    <Shell toc={page ? <Toc items={page.headings} /> : null}>
      {page ? (
        <article className="prose" data-page={slug}>
          <h1 className="page-title">{page.title}</h1>
          {page.description ? <p className="page-lede">{page.description}</p> : null}
          <div dangerouslySetInnerHTML={{ __html: page.html }} />
          <footer className="page-meta">
            <a
              href={`https://github.com/r007/wisp-ui/edit/main/apps/docs/content/${slug}.md`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Edit this page on GitHub
            </a>
          </footer>
        </article>
      ) : (
        <p className="page-loading" role="status">
          Loading…
        </p>
      )}
    </Shell>
  );
}
