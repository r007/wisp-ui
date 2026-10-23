/**
 * Renders a story from the library as an example on a page. The stories are the library's own test
 * and documentation fixtures, so the examples are always its real behaviour: this runs them as
 * Storybook would (args, `render`, decorators) without Storybook.
 */

import {
  Component,
  type ComponentType,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

// All stories, loaded when asked for: a page imports only its own component's.
const modules = import.meta.glob('../../../../packages/react/src/*/*.stories.tsx') as Record<
  string,
  () => Promise<StoryModule>
>;

interface StoryContext {
  args: Record<string, unknown>;
  globals: Record<string, unknown>;
  parameters: Record<string, unknown>;
  viewMode: 'story';
}

type Decorator = (Story: ComponentType, context: StoryContext) => ReactElement;
type Render = (args: Record<string, unknown>, context: StoryContext) => ReactNode;

interface StoryObject {
  args?: Record<string, unknown>;
  render?: Render;
  decorators?: Decorator[];
  parameters?: Record<string, unknown>;
}

interface StoryModule {
  default: StoryObject & { component?: ComponentType<Record<string, unknown>> };
  [name: string]: unknown;
}

export type StoryLayout = 'centered' | 'padded' | 'fullscreen';

export interface LoadedStory {
  Demo: ComponentType;
  layout: StoryLayout;
}

/** The story called `name` in the story file `file` of a component's folder. */
export async function loadStory(folder: string, file: string, name: string): Promise<LoadedStory> {
  const key = `../../../../packages/react/src/${folder}/${file}.stories.tsx`;
  const load = modules[key];
  if (!load) throw new Error(`No story file ${key}`);
  const module = await load();
  const meta = module.default;
  const story = module[name] as StoryObject | undefined;
  if (!story) throw new Error(`No story "${name}" in ${file}`);

  const args = { ...meta.args, ...story.args };
  const parameters = { ...meta.parameters, ...story.parameters };
  const context: StoryContext = { args, globals: {}, parameters, viewMode: 'story' };
  const render: Render =
    story.render ??
    meta.render ??
    ((a) => {
      const Subject = meta.component as ComponentType<Record<string, unknown>>;
      return <Subject {...a} />;
    });

  // A decorator wraps what is inside it, which is the story first, then the story's own, then the
  // component's.
  let Wrapped: ComponentType = function Story() {
    return <>{render(args, context)}</>;
  };
  for (const decorator of [...(story.decorators ?? []), ...(meta.decorators ?? [])]) {
    const Inner: ComponentType = Wrapped;
    Wrapped = function Decorated(): ReactElement {
      return decorator(Inner, context);
    };
  }
  const layout = ((parameters.layout as StoryLayout | undefined) ?? 'centered') as StoryLayout;
  return { Demo: Wrapped, layout };
}

/** An example that throws is a message in its frame, not a blank page. */
class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    return this.state.error ? (
      <p className="demo-error" role="alert">
        This example could not be shown: {this.state.error.message}
      </p>
    ) : (
      this.props.children
    );
  }
}

/** True once the element has come near the screen: examples start only when they are about to be seen. */
function useNear(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near];
}

export function StoryDemo({
  folder,
  file,
  name,
  resetKey,
}: {
  folder: string;
  file: string;
  name: string;
  resetKey: number;
}) {
  const [ref, near] = useNear();
  const [story, setStory] = useState<LoadedStory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    loadStory(folder, file, name)
      .then((loaded) => !cancelled && setStory(loaded))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [near, folder, file, name]);

  return (
    <div ref={ref} className="demo-frame" data-layout={story?.layout ?? 'centered'}>
      {error ? (
        <p className="demo-error" role="alert">
          {error}
        </p>
      ) : story ? (
        <Boundary key={resetKey}>
          <story.Demo />
        </Boundary>
      ) : (
        <span className="demo-loading" role="status">
          <span className="visually-hidden">Loading example</span>
        </span>
      )}
    </div>
  );
}
