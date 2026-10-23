import { componentLoaders } from 'virtual:wisp-docs';
import type { ComponentPageData, PropDoc } from 'virtual:wisp-docs/component/_';
import { Button } from '@wisp-ui/react/button';
import { useEffect, useMemo, useState } from 'react';
import { Shell, Toc } from '../layout/shell.js';
import { StoryDemo } from '../story-runtime/story-demo.js';
import { CodeBlock } from '../ui/code-block.js';
import { CodeIcon, RefreshIcon } from '../ui/icons.js';
import { usePageMeta } from '../ui/page-meta.js';

/** An id for an example that is unique on the page, though two story files may each have a `Playground`. */
const exampleId = (story: { file: string; name: string }) =>
  `example-${story.file}-${story.name}`.toLowerCase();

/** The props of a component, with each one's type, default and what it is for. */
function PropsTable({
  name,
  props,
  elements,
}: {
  name: string;
  props: PropDoc[];
  elements: string[];
}) {
  const inherits = elements.length
    ? `Also accepts the attributes of ${elements.map((e) => `<${e}>`).join(' and ')}, passed to the element it renders.`
    : null;
  return (
    <section aria-labelledby={`${name.toLowerCase()}-props`} className="props">
      <h3 id={`${name.toLowerCase()}-props`}>
        <code>{name}</code> props
      </h3>
      {props.length > 0 ? (
        <div className="props-table-scroll">
          <table className="props-table">
            <thead>
              <tr>
                <th scope="col">Prop</th>
                <th scope="col">Type</th>
                <th scope="col">Default</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {props.map((prop) => (
                <tr key={prop.name} data-deprecated={prop.deprecated ? '' : undefined}>
                  <th scope="row">
                    <code>{prop.name}</code>
                    {prop.optional ? null : (
                      <abbr title="Required" className="required">
                        *
                      </abbr>
                    )}
                  </th>
                  <td>
                    <code className="type">{prop.type}</code>
                  </td>
                  <td>
                    {prop.default ? <code>{prop.default}</code> : <span className="none">–</span>}
                  </td>
                  <td
                    className="prop-description"
                    dangerouslySetInnerHTML={{ __html: prop.description }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="props-none">No props of its own.</p>
      )}
      {inherits ? <p className="props-inherits">{inherits}</p> : null}
    </section>
  );
}

/** One example: the live component, and its code. */
function Example({
  folder,
  story,
  open,
}: {
  folder: string;
  story: ComponentPageData['stories'][number];
  open: boolean;
}) {
  const [showCode, setShowCode] = useState(open);
  const [resetKey, setResetKey] = useState(0);
  const id = exampleId(story);

  return (
    <section className="example" aria-labelledby={id}>
      <h3 id={id}>{story.title}</h3>
      {story.description ? (
        <div className="demo-description" dangerouslySetInnerHTML={{ __html: story.description }} />
      ) : null}
      <div className="demo">
        <StoryDemo folder={folder} file={story.file} name={story.name} resetKey={resetKey} />
        <div className="demo-toolbar">
          <Button
            variant="text"
            size="xsmall"
            icon={<RefreshIcon />}
            onClick={() => setResetKey((k) => k + 1)}
          >
            Reset
          </Button>
          {story.code ? (
            <Button
              variant="text"
              size="xsmall"
              icon={<CodeIcon />}
              aria-expanded={showCode}
              aria-controls={`${id}-code`}
              onClick={() => setShowCode((v) => !v)}
            >
              {showCode ? 'Hide code' : 'Show code'}
            </Button>
          ) : null}
        </div>
      </div>
      {story.code ? (
        <div id={`${id}-code`} hidden={!showCode}>
          {showCode ? <CodeBlock html={story.code} /> : null}
        </div>
      ) : null}
    </section>
  );
}

export function ComponentPage({ slug }: { slug: string }) {
  const [page, setPage] = useState<ComponentPageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPage(null);
    componentLoaders[slug]?.().then((module) => !cancelled && setPage(module.default));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  usePageMeta(page?.title, page?.lede.replace(/<[^>]+>/g, ''));

  const toc = useMemo(() => {
    if (!page) return [];
    const items: { id: string; text: string; depth: number }[] = [];
    if (page.components[0]?.usage) items.push({ id: 'usage', text: 'Usage', depth: 2 });
    if (page.stories.length) {
      items.push({ id: 'examples', text: 'Examples', depth: 2 });
      for (const story of page.stories)
        items.push({ id: exampleId(story), text: story.title, depth: 3 });
    }
    items.push({ id: 'api', text: 'API', depth: 2 });
    for (const component of page.components)
      items.push({ id: `${component.name.toLowerCase()}-props`, text: component.name, depth: 3 });
    return items;
  }, [page]);

  if (!page) {
    return (
      <Shell>
        <p className="page-loading" role="status">
          Loading…
        </p>
      </Shell>
    );
  }

  const main = page.components[0];
  const names = page.components.map((c) => c.name);
  return (
    <Shell toc={<Toc items={toc} />}>
      <article className="prose component-page">
        <p className="eyebrow">{page.group}</p>
        <h1 className="page-title">{page.title}</h1>
        <div className="page-lede" dangerouslySetInnerHTML={{ __html: page.lede }} />
        {page.description ? <div dangerouslySetInnerHTML={{ __html: page.description }} /> : null}
        <div className="codeblock import-line" data-language="bash">
          <pre className="shiki">
            <code>{`import { ${names.join(', ')} } from '${page.importName}';`}</code>
          </pre>
        </div>

        {main?.usage ? (
          <>
            <h2 id="usage">Usage</h2>
            <CodeBlock html={main.usage} />
          </>
        ) : null}

        {page.stories.length ? (
          <>
            <h2 id="examples">Examples</h2>
            {page.stories.map((story, i) => (
              <Example
                key={`${story.file}-${story.name}`}
                folder={slug}
                story={story}
                open={i === 0}
              />
            ))}
          </>
        ) : null}

        <h2 id="api">API</h2>
        {page.components.map((component) => (
          <PropsTable
            key={component.name}
            name={component.name}
            props={component.props}
            elements={component.elements}
          />
        ))}
        <footer className="page-meta">
          <a
            href={`https://github.com/r007/wisp-ui/tree/main/packages/react/src/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View the source on GitHub
          </a>
        </footer>
      </article>
    </Shell>
  );
}
