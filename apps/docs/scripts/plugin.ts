/**
 * The documentation data, as virtual modules, and the static pages around the single-page app.
 *
 *  - `virtual:wisp-docs`: what the navigation, the home page and the search need: small.
 *  - `virtual:wisp-docs/component/<folder>`: one component's page: its props, usage and examples.
 *  - `virtual:wisp-docs/guide/<slug>`: one guide, as HTML.
 *
 * Each page's data is its own module, so a visitor loads only what they read. Code is highlighted
 * here, at build time, with both colour themes at once, so none of that reaches the browser.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHighlighter, type Highlighter } from 'shiki';
import { build, type Plugin, type ResolvedConfig } from 'vite';
import { colorSchemeScript } from '../../../packages/tokens/src/color-scheme.js';
import { CATALOG, GROUPS, humanize } from './catalog.js';
import { type ComponentDoc, extractComponents, extractStories } from './extract.js';
import {
  frontMatter,
  type Heading,
  highlightCode,
  renderInline,
  renderMarkdown,
} from './markdown.js';
import { DEFAULT_SEED, SEED_STORAGE_KEY, SEEDS } from './seeds.js';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const reactSrc = join(repo, 'packages/react/src');
const contentDir = fileURLToPath(new URL('../content/', import.meta.url));

/** The site's address, for the canonical links and the sitemap. */
const SITE = process.env.DOCS_SITE ?? 'https://r007.github.io';

export interface ComponentSummary {
  slug: string;
  title: string;
  group: string;
  /** The first sentence of what it is, as HTML. */
  summary: string;
  /** The components the folder exports, `Select`, `SelectOption`. */
  exports: string[];
}

export interface GuideSummary {
  slug: string;
  title: string;
  description: string;
  section: string;
  order: number;
}

export interface SearchEntry {
  title: string;
  path: string;
  kind: 'Guide' | 'Component' | 'Section' | 'Prop';
  /** Where it was found, for a section or prop. */
  context?: string;
  /** Words to match, besides the title. */
  text: string;
}

interface Collected {
  components: ComponentSummary[];
  componentPages: Map<string, unknown>;
  guides: GuideSummary[];
  partials: Map<string, string>;
  guidePages: Map<
    string,
    { title: string; description: string; section: string; html: string; headings: Heading[] }
  >;
  search: SearchEntry[];
}

/** The component folders: every folder of the library with an `index.ts`, but the plumbing. */
function componentFolders(): string[] {
  return readdirSync(reactSrc, { withFileTypes: true })
    .filter(
      (e) =>
        e.isDirectory() &&
        !['foundation', 'theme', 'stories'].includes(e.name) &&
        existsSync(join(reactSrc, e.name, 'index.ts')),
    )
    .map((e) => e.name)
    .sort();
}

const firstSentence = (markdown: string) => {
  const flat = markdown.replace(/\s+/g, ' ').trim();
  const end = /^(.*?[.!?])(?:\s|$)/.exec(flat);
  return (end?.[1] ?? flat).trim();
};

/** What follows the first sentence of some Markdown. */
const afterFirstSentence = (markdown: string) => {
  const first = /^[\s\S]*?[.!?](?:\s+|$)/.exec(markdown.trim());
  return first ? markdown.trim().slice(first[0].length).trim() : '';
};

/** The order the folder's `index.ts` exports its components in. */
function exportOrder(folder: string): string[] {
  const index = readFileSync(join(reactSrc, folder, 'index.ts'), 'utf8');
  const names: string[] = [];
  for (const block of index.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of (block[1] ?? '').split(',')) {
      const name = part
        .trim()
        .replace(/^type\s+.*/, '')
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name && /^[A-Z]/.test(name) && !names.includes(name)) names.push(name);
    }
  }
  return names;
}

async function collect(highlighter: Highlighter, base: string): Promise<Collected> {
  const result: Collected = {
    components: [],
    componentPages: new Map(),
    guides: [],
    guidePages: new Map(),
    partials: new Map(),
    search: [],
  };
  const inline = (markdown: string) => renderInline(markdown, highlighter, base);

  for (const folder of componentFolders()) {
    const entry = CATALOG[folder] ?? { title: humanize(folder), group: 'Content' as const };
    const files = readdirSync(join(reactSrc, folder)).filter(
      (f) => f.endsWith('.tsx') && !/\.(test|stories)\.tsx$/.test(f),
    );
    const documented: ComponentDoc[] = [];
    for (const file of files)
      documented.push(...extractComponents(readFileSync(join(reactSrc, folder, file), 'utf8')));

    // The folder's own components, in the order it exports them (the first is the main one).
    const order = exportOrder(folder);
    const exported = documented
      .filter((c) => order.includes(c.name))
      .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    if (exported.length === 0) continue;

    // The folder's story files, the one named for it first.
    const storyFiles = readdirSync(join(reactSrc, folder))
      .filter((f) => f.endsWith('.stories.tsx'))
      .sort(
        (a, b) =>
          Number(b.startsWith(`${folder}.`)) - Number(a.startsWith(`${folder}.`)) ||
          a.localeCompare(b),
      );
    const stories = storyFiles.flatMap((file) =>
      extractStories(readFileSync(join(reactSrc, folder, file), 'utf8'), folder).map((story) => ({
        ...story,
        file: file.replace(/\.stories\.tsx$/, ''),
      })),
    );

    const main = exported[0] as ComponentDoc;
    result.components.push({
      slug: folder,
      title: entry.title,
      group: entry.group,
      summary: inline(firstSentence(main.description)),
      exports: exported.map((c) => c.name),
    });

    result.componentPages.set(folder, {
      slug: folder,
      title: entry.title,
      group: entry.group,
      importName: `@wisp-ui/react/${folder}`,
      // The first sentence, to lead with, and what follows it.
      lede: inline(firstSentence(main.description)),
      description: inline(afterFirstSentence(main.description)),
      components: exported.map((component) => ({
        name: component.name,
        description: inline(component.description),
        usage: component.usage ? highlightCode(highlighter, component.usage, 'tsx') : undefined,
        elements: component.elements,
        props: component.props.map((prop) => ({
          name: prop.name,
          type: prop.type,
          optional: prop.optional,
          ...(prop.default !== undefined ? { default: prop.default } : {}),
          ...(prop.deprecated ? { deprecated: true } : {}),
          description: prop.description ? inline(prop.description) : '',
        })),
      })),
      stories: stories.map((story) => ({
        file: story.file,
        name: story.name,
        title: humanize(story.name),
        description: story.description ? inline(story.description) : '',
        code: story.code ? highlightCode(highlighter, story.code, 'tsx') : undefined,
      })),
    });

    const path = `components/${folder}/`;
    result.search.push({
      title: entry.title,
      path,
      kind: 'Component',
      text: [...exported.map((c) => c.name), firstSentence(main.description)].join(' '),
    });
    for (const component of exported) {
      for (const prop of component.props) {
        result.search.push({
          title: prop.name,
          path: `${path}#${component.name.toLowerCase()}-props`,
          kind: 'Prop',
          context: `${component.name} prop`,
          text: prop.description.slice(0, 120),
        });
      }
    }
  }

  // Guides.
  const allFiles = existsSync(contentDir)
    ? readdirSync(contentDir).filter((f) => f.endsWith('.md'))
    : [];
  // `_name.md` is a piece of a page (the home page's code), not a guide.
  for (const file of allFiles.filter((f) => f.startsWith('_'))) {
    const { body } = frontMatter(readFileSync(join(contentDir, file), 'utf8'));
    result.partials.set(
      file.slice(1).replace(/\.md$/, ''),
      renderMarkdown(body, highlighter, base).html,
    );
  }
  const guideFiles = allFiles.filter((f) => !f.startsWith('_'));
  for (const file of guideFiles) {
    const slug = file.replace(/\.md$/, '');
    const { data, body } = frontMatter(readFileSync(join(contentDir, file), 'utf8'));
    const { html, headings } = renderMarkdown(body, highlighter, base);
    const title = data.title ?? humanize(slug);
    const section = data.section ?? 'Guides';
    result.guides.push({
      slug,
      title,
      description: data.description ?? '',
      section,
      order: Number(data.order ?? 100),
    });
    result.guidePages.set(slug, {
      title,
      description: data.description ?? '',
      section,
      html,
      headings,
    });
    result.search.push({
      title,
      path: `docs/${slug}/`,
      kind: 'Guide',
      text: data.description ?? '',
    });
    for (const heading of headings)
      result.search.push({
        title: heading.text,
        path: `docs/${slug}/#${heading.id}`,
        kind: 'Section',
        context: title,
        text: '',
      });
  }
  // The changelog is the package's own file, so the page can never say otherwise.
  const changelogFile = join(repo, 'packages/react/CHANGELOG.md');
  if (existsSync(changelogFile)) {
    const body = readFileSync(changelogFile, 'utf8').replace(/^# .*\n+/, '');
    const intro =
      'The two packages, `@wisp-ui/react` and `@wisp-ui/tokens`, are versioned together. Before 1.0 a minor version may change an API; the notes for each release say so when it does. The [tokens changelog](https://github.com/r007/wisp-ui/blob/main/packages/tokens/CHANGELOG.md) is on GitHub.\n\n';
    const { html, headings } = renderMarkdown(`${intro}${body}`, highlighter, base);
    const description = 'What changed in each release.';
    result.guides.push({
      slug: 'changelog',
      title: 'Changelog',
      description,
      section: 'Project',
      order: 25,
    });
    result.guidePages.set('changelog', {
      title: 'Changelog',
      description,
      section: 'Project',
      html,
      headings,
    });
    result.search.push({
      title: 'Changelog',
      path: 'docs/changelog/',
      kind: 'Guide',
      text: description,
    });
  }
  result.guides.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  result.components.sort(
    (a, b) =>
      GROUPS.indexOf(a.group as (typeof GROUPS)[number]) -
        GROUPS.indexOf(b.group as (typeof GROUPS)[number]) || a.title.localeCompare(b.title),
  );
  return result;
}

const VIRTUAL = 'virtual:wisp-docs';
const THEMES = `${VIRTUAL}/themes.css`;

/**
 * One rule per preset colour, `html[data-wisp-seed='rose'] { --md-sys-color-…: … }`, made now so
 * the page is in its colours at the first paint: the head script only has to name one.
 */
async function presetThemes(): Promise<string> {
  // The theme generator imports a package whose ESM Node cannot load unaided (its imports have no
  // file extensions), so bundle it, with that package inside, and import the result.
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    ssr: { noExternal: true },
    build: { ssr: join(repo, 'packages/tokens/src/theme.ts'), write: false, minify: false },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) =>
    'output' in r ? r.output : [],
  );
  const chunk = outputs.find((o) => o.type === 'chunk');
  if (chunk?.type !== 'chunk') throw new Error('Could not bundle the theme generator.');
  const module = (await import(
    `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
  )) as typeof import('../../../packages/tokens/src/theme.js');
  return SEEDS.map((seed) =>
    module.createThemeCss(seed.color, {}, `html[data-wisp-seed='${seed.id}']`),
  ).join('\n');
}

const resolved = (id: string) => `\0${id}`;

export function docsPlugin({ base }: { base: string }): Plugin {
  let config: ResolvedConfig;
  let data: Collected | undefined;
  let highlighter: Highlighter | undefined;

  const load = async () => {
    highlighter ??= await createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: ['tsx', 'ts', 'jsx', 'js', 'css', 'html', 'json', 'bash', 'diff', 'yaml', 'markdown'],
    });
    data ??= await collect(highlighter, base);
    return data;
  };

  return {
    name: 'wisp-docs',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    async buildStart() {
      await load();
    },
    resolveId(id) {
      return id === VIRTUAL || id.startsWith(`${VIRTUAL}/`) ? resolved(id) : undefined;
    },
    async load(id) {
      if (id === resolved(THEMES)) return presetThemes();
      if (!id.startsWith(`\0${VIRTUAL}`)) return undefined;
      const collected = await load();
      const name = id.slice(`\0${VIRTUAL}`.length);
      if (name === '') {
        // Each page is loaded when it is visited, from a module of its own.
        const loaders = (kind: string, slugs: string[]) =>
          `{${slugs.map((slug) => `${JSON.stringify(slug)}: () => import(${JSON.stringify(`${VIRTUAL}/${kind}/${slug}`)})`).join(',')}}`;
        return `export const components = ${JSON.stringify(collected.components)};
export const guides = ${JSON.stringify(collected.guides)};
export const componentLoaders = ${loaders(
          'component',
          collected.components.map((c) => c.slug),
        )};
export const guideLoaders = ${loaders(
          'guide',
          collected.guides.map((g) => g.slug),
        )};`;
      }
      const [, kind, slug] = name.split('/');
      if (kind === 'search') return `export default ${JSON.stringify(collected.search)};`;
      if (kind === 'partial') {
        const html = collected.partials.get(slug as string);
        if (html === undefined) throw new Error(`No partial "${slug}"`);
        return `export default ${JSON.stringify(html)};`;
      }
      const page =
        kind === 'component'
          ? collected.componentPages.get(slug as string)
          : kind === 'guide'
            ? collected.guidePages.get(slug as string)
            : undefined;
      if (!page) throw new Error(`No documentation page "${name}"`);
      return `export default ${JSON.stringify(page)};`;
    },
    // The remembered colour scheme goes on before the first paint, so there is no flash.
    transformIndexHtml(html) {
      // …and so is the remembered preset colour, which the stylesheet turns into a theme.
      const seed = `(function(){var r=document.documentElement;try{var s=localStorage.getItem(${JSON.stringify(SEED_STORAGE_KEY)});if(s&&/^[a-z]+$/.test(s))r.setAttribute("data-wisp-seed",s)}catch(e){}})()`;
      return html
        .replace('<!-- WISP_HEAD -->', `<script>${colorSchemeScript};${seed}</script>`)
        .replace('<html lang="en">', `<html lang="en" data-wisp-seed="${DEFAULT_SEED}">`);
    },
    async closeBundle() {
      if (config.command !== 'build') return;
      const collected = await load();
      const out = join(config.root, config.build.outDir);
      const shell = readFileSync(join(out, 'index.html'), 'utf8');
      const root = base.replace(/\/$/, '');

      const page = (path: string, title: string, description: string) => {
        const url = `${SITE}${root}/${path}`;
        let html = shell
          .replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`)
          .replace(
            /<meta name="description" content="[^"]*" \/>/,
            `<meta name="description" content="${escapeAttr(description)}" />`,
          );
        html = html.replace(
          '</head>',
          `    <link rel="canonical" href="${url}" />\n    <meta property="og:title" content="${escapeAttr(title)}" />\n    <meta property="og:description" content="${escapeAttr(description)}" />\n    <meta property="og:type" content="website" />\n    <meta property="og:url" content="${url}" />\n    <meta property="og:image" content="${SITE}${root}/og.png" />\n    <meta name="twitter:card" content="summary_large_image" />\n  </head>`,
        );
        const file = join(out, path, 'index.html');
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, html);
      };
      const escapeAttr = (text: string) =>
        text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

      const routes: string[] = [''];
      page(
        '',
        'Wisp UI: expressive React components',
        'Expressive React components with plain CSS: shapes that morph, springs that feel alive, dynamic colour and dark mode.',
      );
      page(
        'components/',
        'Components · Wisp UI',
        `${collected.components.length} components: buttons, inputs, navigation, dialogs, lists and more, each with live examples and its full API.`,
      );
      routes.push('components/');
      for (const component of collected.components) {
        const path = `components/${component.slug}/`;
        page(path, `${component.title} · Wisp UI`, component.summary.replace(/<[^>]+>/g, ''));
        routes.push(path);
      }
      for (const guide of collected.guides) {
        const path = `docs/${guide.slug}/`;
        page(path, `${guide.title} · Wisp UI`, guide.description);
        routes.push(path);
      }

      // Hosting that serves a file for a missing path (GitHub Pages) shows the app, which says so.
      writeFileSync(join(out, '404.html'), shell);
      writeFileSync(join(out, '.nojekyll'), '');
      writeFileSync(
        join(out, 'robots.txt'),
        `User-agent: *\nAllow: /\n\nSitemap: ${SITE}${root}/sitemap.xml\n`,
      );
      writeFileSync(
        join(out, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
          .map((route) => `  <url><loc>${SITE}${root}/${route}</loc></url>`)
          .join('\n')}\n</urlset>\n`,
      );
    },
  };
}
