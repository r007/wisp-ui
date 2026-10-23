import { describe, expect, it } from 'vitest';
import { extractComponents, extractStories, parseJsdoc, splitUsage } from './extract.js';

describe('parseJsdoc', () => {
  it('strips the comment decoration and reads tags, also on one line', () => {
    expect(parseJsdoc('* The thing.\n * More.\n ')).toEqual({
      description: 'The thing.\nMore.',
      tags: {},
    });
    expect(parseJsdoc("* @default 'filled' ")).toEqual({
      description: '',
      tags: { default: "'filled'" },
    });
  });

  it('keeps a tag that wraps onto the next line, and does not read tags inside a code fence', () => {
    const jsdoc = parseJsdoc(
      '*\n * Text.\n * ```tsx\n * @not-a-tag\n * ```\n * @default a\n *   b\n ',
    );
    expect(jsdoc.description).toContain('@not-a-tag');
    expect(jsdoc.tags).toEqual({ default: 'a b' });
  });
});

describe('splitUsage', () => {
  it('takes the first code block out of the prose', () => {
    expect(splitUsage('A thing.\n\n```tsx\n<Thing />\n```\n\nMore.')).toEqual({
      prose: 'A thing.\n\nMore.',
      usage: '<Thing />',
    });
  });

  it('has no usage without a block', () => {
    expect(splitUsage('Just words.')).toEqual({ prose: 'Just words.' });
  });
});

describe('extractComponents', () => {
  it('reads the description, usage and props of a component', () => {
    const [button] = extractComponents(`
      import type { ComponentPropsWithRef } from 'react';
      export interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'type'> {
        /** The look. @default 'filled' */
        variant?: 'filled' | 'text';
        /** Called with the new value. */
        onChange: (value: string) => void;
        /** @deprecated Use variant. */
        kind?: string;
      }
      /**
       * A button.
       *
       * \`\`\`tsx
       * <Button>Hi</Button>
       * \`\`\`
       */
      export function Button(props: ButtonProps) { return null; }
    `);
    expect(button?.name).toBe('Button');
    expect(button?.description).toBe('A button.');
    expect(button?.usage).toBe('<Button>Hi</Button>');
    expect(button?.elements).toEqual(['button']);
    expect(button?.props.map((p) => p.name)).toEqual(['variant', 'onChange', 'kind']);
    expect(button?.props[0]).toMatchObject({
      type: "'filled' | 'text'",
      optional: true,
      default: "'filled'",
    });
    expect(button?.props[1]).toMatchObject({
      optional: false,
      description: 'Called with the new value.',
    });
    expect(button?.props[2]?.deprecated).toBe(true);
  });

  it('follows an alias that combines interfaces, and a union', () => {
    const [component] = extractComponents(`
      interface OwnProps { /** Own. */ own?: boolean }
      type AsButton = { href?: undefined };
      type AsLink = { /** Where to. */ href: string };
      export type FooProps = OwnProps & (AsButton | AsLink);
      export function Foo(props: FooProps) { return null; }
    `);
    expect(component?.props.map((p) => p.name)).toEqual(['own', 'href']);
  });

  it('lets a component with no doc comment borrow its props interface’s', () => {
    const [component] = extractComponents(`
      /** A foo, borrowed. */
      export interface FooProps { a?: string }
      export function Foo(props: FooProps) { return null; }
    `);
    expect(component?.description).toBe('A foo, borrowed.');
  });

  it('knows an inline element type, and a component that is only that', () => {
    const [rule] = extractComponents(`
      import type { ComponentPropsWithRef } from 'react';
      /** A rule. */
      export function Rule({ ...rest }: ComponentPropsWithRef<'hr'>) { return null; }
    `);
    expect(rule?.elements).toEqual(['hr']);
    expect(rule?.props).toEqual([]);
  });

  it('leaves out what is not a component', () => {
    const found = extractComponents(`
      export function useThing() { return 1; }
      export const helper = () => 1;
      export function Thing() { return null; }
    `);
    expect(found.map((c) => c.name)).toEqual(['Thing']);
  });
});

describe('extractStories', () => {
  const header = `
    import type { Meta, StoryObj } from '@storybook/react-vite';
    import { expect, fn } from 'storybook/test';
    import { AddIcon } from '../stories/icons.js';
    import { Button, type ButtonVariant } from './button.js';
    const VARIANTS: ButtonVariant[] = ['filled', 'text'];
    const meta = {
      title: 'Components/Button',
      component: Button,
      args: { children: 'Label', onClick: fn() },
    } satisfies Meta<typeof Button>;
    export default meta;
    type Story = StoryObj<typeof meta>;
  `;

  it('shows a story of only args as the JSX it renders', () => {
    const [story] = extractStories(
      `${header}export const Playground: Story = { args: { variant: 'tonal', disabled: true, size: 3 } };`,
      'button',
    );
    expect(story?.name).toBe('Playground');
    expect(story?.code).toBe(
      `import { Button } from '@wisp-ui/react/button';\n\n<Button variant="tonal" disabled size={3}>Label</Button>`,
    );
  });

  it('shows a render function, with the story’s args spelled out, its helper constants, and its imports', () => {
    const [story] = extractStories(
      `${header}
      /** All of them. */
      export const Variants: Story = {
        args: { size: 'large' },
        render: (args) => (
          <div className="sb-row">
            {VARIANTS.map((variant) => (
              <Button key={variant} {...args} variant={variant} icon={<AddIcon />}>
                {variant}
              </Button>
            ))}
          </div>
        ),
      };`,
      'button',
    );
    expect(story?.description).toBe('All of them.');
    expect(story?.code).toBe(
      [
        `import { Button, type ButtonVariant } from '@wisp-ui/react/button';`,
        `import { AddIcon } from './icons'; // your own icons`,
        ``,
        `const VARIANTS: ButtonVariant[] = ['filled', 'text'];`,
        ``,
        `<div className="row">`,
        `  {VARIANTS.map((variant) => (`,
        `    <Button key={variant} size="large" variant={variant} icon={<AddIcon />}>`,
        `      {variant}`,
        `    </Button>`,
        `  ))}`,
        `</div>`,
      ].join('\n'),
    );
  });

  it('wraps a render function with hooks in a component, with the hook imported', () => {
    const [story] = extractStories(
      `${header}
      export const Controlled: Story = {
        render: () => {
          const [on, setOn] = useState(false);
          return <Button onClick={() => setOn(!on)}>{String(on)}</Button>;
        },
      };`,
      'button',
    );
    expect(story?.code).toBe(
      [
        `import { useState } from 'react';`,
        `import { Button } from '@wisp-ui/react/button';`,
        ``,
        `function Example() {`,
        `  const [on, setOn] = useState(false);`,
        `  return <Button onClick={() => setOn(!on)}>{String(on)}</Button>;`,
        `}`,
      ].join('\n'),
    );
  });

  it('leaves out the stories that exist to be tested, and shows no code it cannot make', () => {
    const stories = extractStories(
      `${header}
      export const Playground: Story = {};
      export const Copy: Story = { render: Playground.render };
      export const PlaygroundInteraction: Story = { tags: ['!dev', '!autodocs'], play: async () => { await expect(1); } };`,
      'button',
    );
    expect(stories.map((s) => s.name)).toEqual(['Playground', 'Copy']);
    expect(stories[1]?.code).toBeUndefined();
  });

  it('writes a child that is JSX or an identifier as it is', () => {
    const [story] = extractStories(
      `${header}export const WithIcon: Story = { args: { children: <b>Bold</b>, icon: <AddIcon /> } };`,
      'button',
    );
    expect(story?.code).toContain('icon={<AddIcon />}');
    expect(story?.code).toContain('<b>Bold</b>');
  });
});
