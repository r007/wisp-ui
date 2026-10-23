/** Markdown to HTML for the guides: highlighted code, linked headings, notes and tables. */

import { Marked, type Tokens } from 'marked';
import type { Highlighter } from 'shiki';

export interface Heading {
  id: string;
  text: string;
  depth: number;
}

export interface Page {
  html: string;
  headings: Heading[];
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const LANGUAGES = new Set([
  'tsx',
  'ts',
  'typescript',
  'jsx',
  'js',
  'javascript',
  'css',
  'html',
  'json',
  'bash',
  'sh',
  'shell',
  'diff',
  'yaml',
  'md',
  'markdown',
]);

/** A highlighted code block: both themes at once, chosen by the page's colour scheme in CSS. */
export function highlightCode(highlighter: Highlighter, code: string, language = 'tsx'): string {
  const lang = LANGUAGES.has(language)
    ? language === 'sh' || language === 'shell'
      ? 'bash'
      : language
    : 'text';
  return highlighter.codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });
}

/** Front matter (`key: value` lines between `---`s) and the rest. */
export function frontMatter(source: string): { data: Record<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!match) return { data: {}, body: source };
  const data: Record<string, string> = {};
  for (const line of (match[1] ?? '').split('\n')) {
    const pair = /^(\w+):\s*(.*)$/.exec(line);
    if (pair) data[pair[1] as string] = (pair[2] ?? '').replace(/^["']|["']$/g, '');
  }
  return { data, body: source.slice(match[0].length) };
}

/** Links that start with `/` are the site's own: put the site's base in front. */
const withBase = (href: string, base: string) =>
  href.startsWith('/') && !href.startsWith('//') ? `${base.replace(/\/$/, '')}${href}` : href;

export function renderMarkdown(source: string, highlighter: Highlighter, base: string): Page {
  const headings: Heading[] = [];
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      code({ text, lang }: Tokens.Code) {
        const language = (lang ?? 'text').split(/\s+/)[0] ?? 'text';
        return `<div class="codeblock" data-language="${escapeHtml(language)}">${highlightCode(highlighter, text, language)}</div>`;
      },
      heading({ tokens, depth }: Tokens.Heading) {
        const html = this.parser.parseInline(tokens);
        const text = tokens.map((t) => ('text' in t ? (t as { text: string }).text : '')).join('');
        const id = slugify(text);
        if (depth >= 2 && depth <= 3) headings.push({ id, text, depth });
        const anchor =
          depth >= 2
            ? `<a class="anchor" href="#${id}" aria-label="Link to this section">#</a>`
            : '';
        return `<h${depth} id="${id}">${html}${anchor}</h${depth}>\n`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        const attributes = external ? ' rel="noopener noreferrer" target="_blank"' : '';
        return `<a href="${escapeHtml(withBase(href, base))}"${title ? ` title="${escapeHtml(title)}"` : ''}${attributes}>${text}</a>`;
      },
      // A quote that starts `[!NOTE]`, `[!TIP]` or `[!WARNING]` is a callout.
      blockquote({ tokens }: Tokens.Blockquote) {
        const html = this.parser.parse(tokens);
        const kind = /^<p>\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*/i.exec(html);
        if (!kind) return `<blockquote>${html}</blockquote>\n`;
        const label = (kind[1] as string).toLowerCase();
        const body = html.replace(kind[0], '<p>');
        return `<aside class="callout" data-kind="${label}"><p class="callout-title">${label.charAt(0).toUpperCase()}${label.slice(1)}</p>${body}</aside>\n`;
      },
      table(token: Tokens.Table) {
        const header = token.header
          .map(
            (cell) =>
              `<th${cell.align ? ` align="${cell.align}"` : ''}>${this.parser.parseInline(cell.tokens)}</th>`,
          )
          .join('');
        const rows = token.rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td${cell.align ? ` align="${cell.align}"` : ''}>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`,
          )
          .join('');
        return `<div class="table-scroll"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });
  const html = marked.parse(source, { async: false }) as string;
  return { html, headings };
}

/** Inline markdown (a prop's description) as HTML. */
export function renderInline(
  source: string,
  highlighter: Highlighter | undefined,
  base: string,
): string {
  void highlighter;
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      link({ href, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        return `<a href="${escapeHtml(withBase(href, base))}" rel="noopener noreferrer">${text}</a>`;
      },
    },
  });
  return (marked.parse(source, { async: false }) as string).trim();
}
