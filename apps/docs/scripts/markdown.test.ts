import { createHighlighter, type Highlighter } from 'shiki';
import { beforeAll, describe, expect, it } from 'vitest';
import { frontMatter, highlightCode, renderInline, renderMarkdown, slugify } from './markdown.js';

let highlighter: Highlighter;
beforeAll(async () => {
  highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: ['tsx', 'bash', 'css'],
  });
});

describe('frontMatter', () => {
  it('reads the keys between the dashes, and returns the rest', () => {
    const { data, body } = frontMatter(
      '---\ntitle: Theming\ndescription: "One colour."\norder: 3\n---\n# Hi\n',
    );
    expect(data).toEqual({ title: 'Theming', description: 'One colour.', order: '3' });
    expect(body).toBe('# Hi\n');
  });

  it('is all body without it', () => {
    expect(frontMatter('# Just text')).toEqual({ data: {}, body: '# Just text' });
  });
});

describe('slugify', () => {
  it('makes ids that are safe in a URL', () => {
    expect(slugify('Fonts and icons are yours')).toBe('fonts-and-icons-are-yours');
    expect(slugify('A `code` heading, with punctuation!')).toBe('a-code-heading-with-punctuation');
  });
});

describe('highlightCode', () => {
  it('writes both themes into the markup, for the page to choose between', () => {
    const html = highlightCode(highlighter, 'const a = 1;', 'tsx');
    expect(html).toContain('--shiki-light:');
    expect(html).toContain('--shiki-dark:');
    // No colour is baked in: the page's own scheme picks one.
    expect(html).not.toMatch(/style="color:#/);
  });

  it('treats a language it does not know as plain text, instead of failing', () => {
    expect(highlightCode(highlighter, 'x', 'brainfuck')).toContain('<pre');
  });
});

describe('renderMarkdown', () => {
  const render = (md: string) => renderMarkdown(md, highlighter, '/wisp-ui/');

  it('gives h2 and h3 headings ids and anchors, and lists them', () => {
    const { html, headings } = render('## First part\n\n### A detail\n\n#### Too deep\n');
    expect(html).toContain('<h2 id="first-part">');
    expect(html).toContain('class="anchor" href="#first-part"');
    expect(headings).toEqual([
      { id: 'first-part', text: 'First part', depth: 2 },
      { id: 'a-detail', text: 'A detail', depth: 3 },
    ]);
  });

  it('puts the site’s base in front of its own links, and opens others in a new tab', () => {
    const { html } = render('[inside](/docs/theming/) and [outside](https://example.com/x)');
    expect(html).toContain('href="/wisp-ui/docs/theming/"');
    expect(html).toContain(
      'href="https://example.com/x" rel="noopener noreferrer" target="_blank"',
    );
  });

  it('highlights fenced code and keeps its language', () => {
    const { html } = render('```bash\nnpm install\n```');
    expect(html).toContain('class="codeblock" data-language="bash"');
    expect(html).toContain('shiki');
  });

  it('makes a quote that starts with [!NOTE] a callout', () => {
    const { html } = render('> [!NOTE]\n> Mind this.\n\n> A plain quote.');
    expect(html).toContain('<aside class="callout" data-kind="note">');
    expect(html).toContain('Mind this.');
    expect(html).toContain('<blockquote>');
  });

  it('wraps a table so it can scroll', () => {
    const { html } = render('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(html).toContain('<div class="table-scroll"><table>');
  });
});

describe('renderInline', () => {
  it('makes code and links, with the base on the site’s own', () => {
    const html = renderInline('Use `x` or [see](/docs/a/).', highlighter, '/wisp-ui/');
    expect(html).toContain('<code>x</code>');
    expect(html).toContain('href="/wisp-ui/docs/a/"');
  });
});
