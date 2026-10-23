/**
 * Reads the library's own source to produce the documentation data: what a component is, its props
 * (from its TypeScript interface and the JSDoc on each member), a usage example (the first code block
 * in its doc comment), and copy-ready code for each of its stories.
 *
 * Everything here is a pure function of source text, so it can be tested with strings. The
 * TypeScript compiler API is not used: this repository builds with the native compiler, which has
 * none, so Babel's parser reads the syntax.
 */

import { parse } from '@babel/parser';

/** The parts of a Babel node that are read. Babel's own types are not a dependency of this package. */
export type Node = {
  type: string;
  start: number;
  end: number;
  leadingComments?: Comment[];
  // biome-ignore lint/suspicious/noExplicitAny: an AST node's shape is its node type's, which is checked by `type`.
  [key: string]: any;
};
interface Comment {
  type: string;
  value: string;
}

export interface PropDoc {
  name: string;
  /** The type, as written. */
  type: string;
  optional: boolean;
  default?: string;
  /** Markdown. */
  description: string;
  deprecated?: boolean;
}

export interface ComponentDoc {
  name: string;
  /** Markdown: the doc comment without its code block or tags. */
  description: string;
  /** The first ```tsx block of the doc comment. */
  usage?: string;
  props: PropDoc[];
  /** The HTML elements whose attributes it also accepts, such as `button`. */
  elements: string[];
}

export interface StoryDoc {
  /** The export's name, `WithIcons`. */
  name: string;
  description: string;
  /** Copy-ready example code, when it could be made. */
  code?: string;
}

/** What a JSDoc comment says, split into its prose and its tags. */
export interface Jsdoc {
  description: string;
  tags: Record<string, string>;
}

const parseSource = (source: string) =>
  parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'], attachComment: true });

/** Strips the comment decoration: leading `*`s and one space. */
export function parseJsdoc(comment: string): Jsdoc {
  const lines = comment.split('\n').map((line) => line.replace(/^\s*\* ?/, '').replace(/\s+$/, ''));
  // The first and last lines of a block are often empty (`/**` and ` */`).
  while (lines.length && lines[0] === '') lines.shift();
  while (lines.length && lines[lines.length - 1] === '') lines.pop();

  const description: string[] = [];
  const tags: Record<string, string> = {};
  let inFence = false;
  let currentTag: string | undefined;
  for (const line of lines) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    // A known tag, at the start of a line or after the prose on it (`… freely. @default 'x'`).
    const tag = !inFence
      ? /(?:^|\s)@(default|deprecated|since|see|example|remarks)\b\s*(.*)$/.exec(line)
      : null;
    if (tag) {
      const before = line.slice(0, tag.index).trimEnd();
      if (before) description.push(before);
      currentTag = tag[1] as string;
      tags[currentTag] = (tag[2] ?? '').trim();
    } else if (currentTag && !inFence) {
      tags[currentTag] = `${tags[currentTag]} ${line.trim()}`.trim();
    } else {
      description.push(line);
    }
  }
  return { description: description.join('\n').trim(), tags };
}

/** The JSDoc block (`/** … *\/`) directly above a node. */
function jsdocOf(node: Node): Jsdoc | undefined {
  const comments = (node.leadingComments ?? []).filter(
    (c) => c.type === 'CommentBlock' && c.value.startsWith('*'),
  );
  const last = comments.at(-1);
  return last ? parseJsdoc(last.value.slice(1)) : undefined;
}

/** Splits a doc comment's prose from its first ```tsx example. */
export function splitUsage(description: string): { prose: string; usage?: string } {
  const fence = /```(?:tsx|jsx|ts)?\n([\s\S]*?)```/.exec(description);
  if (!fence) return { prose: description.trim() };
  const prose = description
    .replace(fence[0], '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { prose, usage: (fence[1] ?? '').trimEnd() };
}

/** Collapses the whitespace of a type as written, so it reads on one line. */
const tidyType = (text: string) =>
  text.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')');

interface FileScope {
  source: string;
  interfaces: Map<string, Node>;
  aliases: Map<string, Node>;
  functions: Map<string, { node: Node; jsdoc?: Jsdoc }>;
  /** The doc comment of each interface, which stands in for a component's own when it has none. */
  docs: Map<string, Jsdoc>;
}

function scopeOf(source: string): FileScope {
  const ast = parseSource(source);
  const scope: FileScope = {
    source,
    interfaces: new Map(),
    aliases: new Map(),
    functions: new Map(),
    docs: new Map(),
  };
  for (const statement of ast.program.body as Node[]) {
    const exported = statement.type === 'ExportNamedDeclaration';
    const declaration: Node | undefined = exported ? statement.declaration : statement;
    if (!declaration) continue;
    if (declaration.type === 'TSInterfaceDeclaration') {
      scope.interfaces.set(declaration.id.name, declaration);
      const doc = jsdocOf(statement);
      if (doc) scope.docs.set(declaration.id.name, doc);
    } else if (declaration.type === 'TSTypeAliasDeclaration') {
      scope.aliases.set(declaration.id.name, declaration.typeAnnotation);
    } else if (exported && declaration.type === 'FunctionDeclaration' && declaration.id) {
      scope.functions.set(declaration.id.name, { node: declaration, jsdoc: jsdocOf(statement) });
    } else if (exported && declaration.type === 'VariableDeclaration') {
      // `export const Name = (...) => …`, `export const Name = forwardRef(...)`.
      for (const declarator of declaration.declarations as Node[]) {
        if (declarator.id.type === 'Identifier')
          scope.functions.set(declarator.id.name, {
            node: declarator.init ?? declarator,
            jsdoc: jsdocOf(statement),
          });
      }
    }
  }
  return scope;
}

const slice = (scope: FileScope, node: Node) => scope.source.slice(node.start, node.end);

/** An HTML element's name from `ComponentPropsWithRef<'button'>` and its kin. */
function elementOf(scope: FileScope, node: Node): string | undefined {
  const text = slice(scope, node);
  return /(?:ComponentProps(?:WithRef|WithoutRef)?|HTMLAttributes|JSX\.IntrinsicElements)<\s*'(\w+)'/.exec(
    text,
  )?.[1];
}

interface Resolved {
  props: PropDoc[];
  elements: string[];
}

function memberToProp(scope: FileScope, member: Node): PropDoc | undefined {
  if (member.type !== 'TSPropertySignature') return undefined;
  const key = member.key;
  const name =
    key.type === 'Identifier' ? key.name : key.type === 'StringLiteral' ? key.value : undefined;
  if (!name) return undefined;
  const doc = jsdocOf(member);
  const prop: PropDoc = {
    name,
    type: tidyType(
      member.typeAnnotation ? slice(scope, member.typeAnnotation.typeAnnotation) : 'unknown',
    ),
    optional: member.optional === true,
    description: doc?.description ?? '',
  };
  if (doc?.tags.default !== undefined) prop.default = doc.tags.default;
  if (doc?.tags.deprecated !== undefined) prop.deprecated = true;
  return prop;
}

/** The props of a named interface or alias in this file, following what it extends or combines. */
function resolveName(scope: FileScope, name: string, seen = new Set<string>()): Resolved {
  const result: Resolved = { props: [], elements: [] };
  if (seen.has(name)) return result;
  seen.add(name);

  const add = (other: Resolved) => {
    for (const prop of other.props)
      if (!result.props.some((p) => p.name === prop.name)) result.props.push(prop);
    for (const element of other.elements)
      if (!result.elements.includes(element)) result.elements.push(element);
  };

  const iface = scope.interfaces.get(name);
  if (iface) {
    for (const member of iface.body.body as Node[]) {
      const prop = memberToProp(scope, member);
      if (prop && !result.props.some((p) => p.name === prop.name)) result.props.push(prop);
    }
    for (const parent of (iface.extends ?? []) as Node[]) {
      const element = elementOf(scope, parent);
      if (element && !result.elements.includes(element)) result.elements.push(element);
      const parentName =
        parent.expression?.type === 'Identifier' ? (parent.expression.name as string) : undefined;
      if (parentName && (scope.interfaces.has(parentName) || scope.aliases.has(parentName)))
        add(resolveName(scope, parentName, seen));
    }
    return result;
  }

  const alias = scope.aliases.get(name);
  if (alias) add(resolveType(scope, alias, seen));
  return result;
}

function resolveType(scope: FileScope, type: Node, seen: Set<string>): Resolved {
  const result: Resolved = { props: [], elements: [] };
  const add = (other: Resolved) => {
    for (const prop of other.props)
      if (!result.props.some((p) => p.name === prop.name)) result.props.push(prop);
    for (const element of other.elements)
      if (!result.elements.includes(element)) result.elements.push(element);
  };
  switch (type.type) {
    case 'TSIntersectionType':
    case 'TSUnionType':
      for (const part of type.types as Node[]) add(resolveType(scope, part, seen));
      break;
    case 'TSParenthesizedType':
      add(resolveType(scope, type.typeAnnotation, seen));
      break;
    case 'TSTypeLiteral':
      for (const member of type.members as Node[]) {
        const prop = memberToProp(scope, member);
        if (prop) add({ props: [prop], elements: [] });
      }
      break;
    case 'TSTypeReference': {
      const element = elementOf(scope, type);
      if (element) add({ props: [], elements: [element] });
      const ref = type.typeName?.type === 'Identifier' ? (type.typeName.name as string) : undefined;
      if (ref && (scope.interfaces.has(ref) || scope.aliases.has(ref)))
        add(resolveName(scope, ref, seen));
      break;
    }
    default:
  }
  return result;
}

/** What a component function takes: its first parameter's annotation, or `<Name>Props` when it has none. */
function resolveProps(scope: FileScope, fn: Node, componentName: string): Resolved {
  const parameter = (fn.params?.[0] ?? undefined) as Node | undefined;
  const annotation = parameter?.typeAnnotation?.typeAnnotation as Node | undefined;
  if (annotation) return resolveType(scope, annotation, new Set());
  return resolveName(scope, `${componentName}Props`);
}

/** Every exported component of one file: its description, usage example and props. */
export function extractComponents(source: string): ComponentDoc[] {
  const scope = scopeOf(source);
  const docs: ComponentDoc[] = [];
  for (const [name, { node, jsdoc }] of scope.functions) {
    // Components are the capitalised functions; hooks and helpers are not on the component pages.
    if (!/^[A-Z]/.test(name)) continue;
    const doc = jsdoc ?? scope.docs.get(`${name}OwnProps`) ?? scope.docs.get(`${name}Props`);
    const { prose, usage } = splitUsage(doc?.description ?? '');
    const props = resolveProps(scope, node, name);
    docs.push({
      name,
      description: prose,
      ...(usage ? { usage } : {}),
      props: props.props,
      elements: props.elements,
    });
  }
  return docs;
}

// ---------------------------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------------------------

/** Where a story file's imports come from: the package subpath each component name is imported from. */
export interface ImportMap {
  /** `Button` → `@wisp-ui/react/button`. */
  components: Map<string, string>;
  /** The names among those that are types, imported as `type X`. */
  types: Set<string>;
  /** Names that are the story file's own icons, which a reader brings from their own set. */
  icons: Set<string>;
}

/** Maps the story file's relative imports to the package's public subpaths. */
function importMapOf(program: Node[], ownFolder: string): ImportMap {
  const map: ImportMap = { components: new Map(), types: new Set(), icons: new Set() };
  for (const statement of program) {
    if (statement.type !== 'ImportDeclaration') continue;
    const from = statement.source.value as string;
    if (!from.startsWith('.')) continue;
    const specifiers = (statement.specifiers as Node[]).filter((s) => s.type === 'ImportSpecifier');
    const names = specifiers.map((s) => s.local.name as string);
    for (const s of specifiers)
      if (statement.importKind === 'type' || s.importKind === 'type')
        map.types.add(s.local.name as string);
    if (/stories\/icons/.test(from)) {
      for (const name of names) map.icons.add(name);
      continue;
    }
    // `./button.js` and `../button/button.js` are both `@wisp-ui/react/button`.
    const folder = from.startsWith('./') ? ownFolder : /^\.\.\/([\w-]+)\//.exec(from)?.[1];
    for (const name of names) map.components.set(name, folder ? `@wisp-ui/react/${folder}` : '');
  }
  return map;
}

const dedent = (text: string) => {
  const lines = text.split('\n');
  const indents = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((l) => /^ */.exec(l)?.[0].length ?? 0);
  const margin = indents.length ? Math.min(...indents) : 0;
  return [lines[0], ...lines.slice(1).map((l) => l.slice(margin))].join('\n');
};

/** Every node under `node`, depth first. */
function* walk(node: unknown): Generator<Node> {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) yield* walk(child);
    return;
  }
  const n = node as Node;
  if (typeof n.type === 'string') yield n;
  for (const [key, value] of Object.entries(n)) {
    if (key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments')
      continue;
    yield* walk(value);
  }
}

interface KeyedAttribute {
  key: string;
  text: string;
}

/**
 * `{...args}` in a story stands for the props the story sets: spell them out in the element that
 * spreads them, except those the element sets itself, which win. With none, it is just noise.
 * `text` is the source of `node`, which starts at `offset` in the file.
 */
function expandArgs(
  text: string,
  node: Node,
  offset: number,
  attributes: KeyedAttribute[],
): string {
  const edits: { start: number; end: number; text: string }[] = [];
  for (const element of walk(node)) {
    if (element.type !== 'JSXOpeningElement') continue;
    const attrs = element.attributes as Node[];
    const spread = attrs.find(
      (a) =>
        a.type === 'JSXSpreadAttribute' &&
        a.argument?.type === 'Identifier' &&
        a.argument.name === 'args',
    );
    if (!spread) continue;
    const explicit = new Set(
      attrs
        .filter((a) => a.type === 'JSXAttribute')
        .map((a) => (a.name.type === 'JSXIdentifier' ? (a.name.name as string) : '')),
    );
    const mine = attributes.filter((a) => !explicit.has(a.key)).map((a) => a.text);
    edits.push({ start: spread.start - offset, end: spread.end - offset, text: mine.join(' ') });
  }
  let result = text;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result = `${result.slice(0, edit.start)}${edit.text}${result.slice(edit.end)}`;
  }
  return result;
}

/** Loose ends of the edits: no action spies or stray spaces, and the stories' layout helpers renamed. */
const tidy = (code: string) =>
  code
    .replace(/[ \t]+\w+=\{fn\(\)\}/g, '')
    // A space before `>` that follows something (not the indentation of a `>` on its own line).
    .replace(/(?<=\S)[ \t]+(?=>)/g, '')
    .replace(/[ \t]+(?=\n)/g, '')
    // Where an attribute left, its line and any double space go with it.
    .replace(/\n[ \t]*\n(?=[ \t]+(?:[\w-]+=|\{\.\.\.|\/?>))/g, '\n')
    .replace(/(?<=[\w}"']) {2,}(?=[\w-]+=)/g, ' ')
    .replace(/<(\w+)\s+>/g, '<$1>')
    // The stories' two layout helpers, under names that mean something on their own.
    .replace(/className="sb-(row|column)"/g, 'className="$1"');

function propertyOf(object: Node | undefined, name: string): Node | undefined {
  if (object?.type !== 'ObjectExpression') return undefined;
  return (object.properties as Node[]).find(
    (p) =>
      p.type === 'ObjectProperty' &&
      ((p.key.type === 'Identifier' && p.key.name === name) ||
        (p.key.type === 'StringLiteral' && p.key.value === name)),
  );
}

/** The object at the root of an exported story, through `satisfies` and `as`. */
function objectOf(node: Node | undefined): Node | undefined {
  let current = node;
  while (
    current &&
    [
      'TSSatisfiesExpression',
      'TSAsExpression',
      'TSNonNullExpression',
      'ParenthesizedExpression',
    ].includes(current.type)
  )
    current = current.expression;
  return current?.type === 'ObjectExpression' ? current : undefined;
}

/** Module-level helpers (`const`s and functions, not exported) a story may refer to, by name. */
function topLevelHelpers(program: Node[]): Map<string, Node> {
  const helpers = new Map<string, Node>();
  for (const statement of program) {
    if (statement.type === 'FunctionDeclaration' && statement.id) {
      helpers.set(statement.id.name, statement);
    } else if (statement.type === 'VariableDeclaration') {
      for (const declarator of statement.declarations as Node[]) {
        if (declarator.id.type === 'Identifier' && declarator.init)
          helpers.set(declarator.id.name, declarator);
      }
    }
  }
  return helpers;
}

interface StoryContext {
  source: string;
  imports: ImportMap;
  helpers: Map<string, Node>;
  /** `component: Button` in the file's meta. */
  component?: string;
  metaArgs?: Node;
}

/** The text of a JSX attribute for a story arg, or nothing when it is not a prop to show. */
function argToAttribute(ctx: StoryContext, key: string, value: Node): string | undefined {
  const text = ctx.source.slice(value.start, value.end);
  switch (value.type) {
    case 'StringLiteral':
      return `${key}="${value.value.replace(/"/g, '&quot;')}"`;
    case 'NumericLiteral':
      return `${key}={${value.value}}`;
    case 'BooleanLiteral':
      return value.value ? key : `${key}={false}`;
    case 'NullLiteral':
      return undefined;
    case 'CallExpression':
      // `fn()`: an action spy.
      return value.callee?.name === 'fn' ? undefined : `${key}={${text}}`;
    case 'JSXElement':
    case 'JSXFragment':
      return `${key}={${dedent(text)}}`;
    default:
      return `${key}={${text}}`;
  }
}

/** The props a story sets, as JSX attributes, and its children if it sets them: meta args first, the story's over them. */
function collectArgs(
  ctx: StoryContext,
  storyArgs: Node | undefined,
): { attributes: KeyedAttribute[]; children?: string } {
  const merged = new Map<string, Node>();
  for (const source of [ctx.metaArgs, storyArgs]) {
    if (source?.type !== 'ObjectExpression') continue;
    for (const property of source.properties as Node[]) {
      if (property.type !== 'ObjectProperty') continue;
      const key =
        property.key.type === 'Identifier'
          ? (property.key.name as string)
          : (property.key.value as string);
      merged.set(key, property.value);
    }
  }
  const attributes: KeyedAttribute[] = [];
  let children: string | undefined;
  for (const [key, value] of merged) {
    if (key === 'children') {
      if (value.type === 'StringLiteral') children = value.value;
      else if (value.type === 'NullLiteral') children = undefined;
      else if (value.type === 'JSXElement' || value.type === 'JSXFragment')
        children = dedent(ctx.source.slice(value.start, value.end));
      else children = `{${ctx.source.slice(value.start, value.end)}}`;
      continue;
    }
    const attribute = argToAttribute(ctx, key, value);
    if (attribute) attributes.push({ key, text: attribute });
  }
  return { attributes, ...(children !== undefined ? { children } : {}) };
}

/** A story that is only args, as the JSX it renders. */
function snippetFromArgs(ctx: StoryContext, storyArgs: Node | undefined): string | undefined {
  if (!ctx.component) return undefined;
  const { attributes: keyed, children } = collectArgs(ctx, storyArgs);
  const attributes = keyed.map((a) => a.text);
  const split = attributes.length > 3;
  const open = [ctx.component, ...attributes].join(split ? '\n  ' : ' ');
  if (children === undefined) return split ? `<${open}\n/>` : `<${open} />`;
  const inner = children.includes('\n') ? `\n  ${children.replace(/\n/g, '\n  ')}\n` : children;
  return `${split ? `<${open}\n>` : `<${open}>`}${inner}</${ctx.component}>`;
}

/** The identifiers in `code`. */
function wordsIn(code: string): Set<string> {
  return new Set(code.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []);
}

/** The helpers an example uses, each with the ones it uses, in source order. */
function helperDeclarations(ctx: StoryContext, code: string): string[] {
  const needed = new Set<string>();
  const visit = (text: string) => {
    for (const word of wordsIn(text)) {
      const found = ctx.helpers.get(word);
      if (!found || needed.has(word)) continue;
      needed.add(word);
      visit(ctx.source.slice(found.start, found.end));
    }
  };
  visit(code);
  return [...ctx.helpers.keys()]
    .filter((name) => needed.has(name) && name !== 'meta')
    .map((name) => {
      const node = ctx.helpers.get(name) as Node;
      const text = dedent(ctx.source.slice(node.start, node.end));
      // A function is its own statement; a variable's declarator is what follows `const`.
      return node.type === 'FunctionDeclaration' ? text : `const ${text};`;
    });
}

/** The import lines an example needs. */
function importLines(ctx: StoryContext, code: string): string[] {
  const words = wordsIn(code);
  const byModule = new Map<string, string[]>();
  for (const word of words) {
    const from = ctx.imports.components.get(word);
    if (from) byModule.set(from, [...(byModule.get(from) ?? []), word]);
  }
  const lines: string[] = [];
  const hooks = ['useState', 'useEffect', 'useRef', 'useMemo', 'useId', 'useCallback'].filter((h) =>
    words.has(h),
  );
  if (hooks.length) lines.push(`import { ${hooks.join(', ')} } from 'react';`);
  for (const [from, names] of [...byModule].sort(([a], [b]) => a.localeCompare(b))) {
    if (!from) continue;
    const sorted = [...new Set(names)]
      .sort()
      .map((n) => (ctx.imports.types.has(n) ? `type ${n}` : n));
    lines.push(`import { ${sorted.join(', ')} } from '${from}';`);
  }
  const icons = [...ctx.imports.icons].filter((icon) => words.has(icon)).sort();
  if (icons.length) lines.push(`import { ${icons.join(', ')} } from './icons'; // your own icons`);
  return lines;
}

/** Copy-ready code for one story, or nothing when it cannot be made faithfully. */
function snippetOf(ctx: StoryContext, story: Node): string | undefined {
  const render = propertyOf(story, 'render')?.value as Node | undefined;
  const args = propertyOf(story, 'args')?.value as Node | undefined;
  let body: string | undefined;

  if (render) {
    if (render.type === 'ArrowFunctionExpression' || render.type === 'FunctionExpression') {
      const attributes = collectArgs(ctx, args).attributes;
      const fnBody = render.body as Node;
      if (fnBody.type === 'BlockStatement') {
        const from = fnBody.start + 1;
        const text = expandArgs(ctx.source.slice(from, fnBody.end - 1), fnBody, from, attributes);
        // Hooks need a component: wrap the body in one.
        const inner = dedent(text).replace(/^\n+|\s+$/g, '');
        body = `function Example() {\n${inner.replace(/^/gm, '  ')}\n}`;
      } else {
        // A parenthesised JSX expression loses its parentheses.
        const text = expandArgs(
          ctx.source.slice(fnBody.start, fnBody.end),
          fnBody,
          fnBody.start,
          attributes,
        );
        body = dedent(text.replace(/^\(\s*([\s\S]*?)\s*\)$/, '$1'));
      }
    } else {
      return undefined; // `render: Playground.render`: nothing to show here.
    }
  } else {
    body = snippetFromArgs(ctx, args);
  }
  if (!body) return undefined;
  body = tidy(body);

  const helpers = helperDeclarations(ctx, body);
  const all = [...helpers, body].join('\n\n');
  const imports = importLines(ctx, all);
  return `${imports.length ? `${imports.join('\n')}\n\n` : ''}${all}`.trim();
}

/** The stories of one story file, in order, those hidden from docs left out. */
export function extractStories(source: string, folder: string): StoryDoc[] {
  const ast = parseSource(source);
  const program = ast.program.body as Node[];
  const ctx: StoryContext = {
    source,
    imports: importMapOf(program, folder),
    helpers: topLevelHelpers(program),
  };

  // The meta: `const meta = { component: Button, args: {…} } satisfies Meta<…>`.
  const metaDeclarator = ctx.helpers.get('meta');
  const meta = objectOf(metaDeclarator?.init as Node | undefined);
  const componentNode = propertyOf(meta, 'component')?.value as Node | undefined;
  if (componentNode?.type === 'Identifier') ctx.component = componentNode.name as string;
  ctx.metaArgs = propertyOf(meta, 'args')?.value as Node | undefined;

  const stories: StoryDoc[] = [];
  for (const statement of program) {
    if (
      statement.type !== 'ExportNamedDeclaration' ||
      statement.declaration?.type !== 'VariableDeclaration'
    )
      continue;
    for (const declarator of statement.declaration.declarations as Node[]) {
      if (declarator.id.type !== 'Identifier') continue;
      const name = declarator.id.name as string;
      const story = objectOf(declarator.init);
      if (!story) continue;
      // The sibling `…Interaction` stories are tagged out of docs: they exist to be tested.
      const tags = propertyOf(story, 'tags')?.value as Node | undefined;
      if (tags && source.slice(tags.start, tags.end).includes('!autodocs')) continue;
      const code = snippetOf(ctx, story);
      stories.push({
        name,
        description: jsdocOf(statement)?.description ?? '',
        ...(code ? { code } : {}),
      });
    }
  }
  return stories;
}
