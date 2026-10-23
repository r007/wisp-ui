import { components } from 'virtual:wisp-docs';
import quickStart from 'virtual:wisp-docs/partial/home';
import { Button } from '@wisp-ui/react/button';
import { Chip, ChipGroup } from '@wisp-ui/react/chip';
import { Fab } from '@wisp-ui/react/fab';
import { IconButton } from '@wisp-ui/react/icon-button';
import { LoadingIndicator } from '@wisp-ui/react/loading-indicator';
import { NavigationBar, NavigationBarItem } from '@wisp-ui/react/navigation-bar';
import { SegmentedButton, SegmentedButtonItem } from '@wisp-ui/react/segmented-button';
import { Shape, type ShapeName, shapeNames, shapes } from '@wisp-ui/react/shapes';
import { Slider } from '@wisp-ui/react/slider';
import { Switch } from '@wisp-ui/react/switch';
import { type ReactNode, useEffect, useState } from 'react';
import { SEEDS } from '../../scripts/seeds.js';
import { Shell } from '../layout/shell.js';
import { href } from '../router.js';
import { useSiteTheme } from '../site-theme.js';
import {
  AccessibilityIcon,
  AddIcon,
  AnimationIcon,
  ArrowForwardIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  DarkModeIcon,
  EditIcon,
  FavoriteFilledIcon,
  FavoriteIcon,
  HomeFilledIcon,
  HomeIcon,
  PackageIcon,
  PaletteIcon,
  SearchIcon,
  WidgetsIcon,
} from '../ui/icons.js';
import { usePageMeta } from '../ui/page-meta.js';

/** The shapes the hero turns through, one after another. */
const HERO_SHAPES: ShapeName[] = [
  'cookie9Sided',
  'softBurst',
  'heart',
  'pentagon',
  'sunny',
  'clover4Leaf',
  'pill',
];

/** Whether the visitor has asked for less motion: the hero then holds still. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Real components, which can be touched: the front page of what the library is. */
function HeroStage() {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % HERO_SHAPES.length), 2600);
    return () => clearInterval(timer);
  }, [reduced]);
  const shape = HERO_SHAPES[index] as ShapeName;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> would bring a border, padding and a legend; role="group" names the cluster just the same.
    <div className="stage" role="group" aria-label="A few of the components, to try">
      <div className="stage-card">
        <div className="stage-row">
          <Button variant="filled" icon={<AddIcon />}>
            Create something
          </Button>
          <IconButton
            aria-label="Favourite"
            variant="tonal"
            defaultSelected
            selectedIcon={<FavoriteFilledIcon />}
          >
            <FavoriteIcon />
          </IconButton>
        </div>
        <div className="stage-row stage-row-spread">
          <Fab aria-label="Edit" icon={<EditIcon />} variant="tertiary-container" />
          <span className="stage-shape">
            <Shape shape={shapes[shape]} size={64} aria-label={`Shape: ${shape}`} />
          </span>
          <LoadingIndicator aria-label="Loading" contained />
          <Switch aria-label="Notifications" icons defaultChecked />
        </div>
        <Slider aria-label="Volume" size="medium" defaultValue={62} showValue={false} />
        <ChipGroup aria-label="Qualities">
          <Chip variant="filter" defaultSelected>
            Expressive
          </Chip>
          <Chip variant="filter" defaultSelected>
            Native to the web
          </Chip>
          <Chip variant="filter">Dark mode</Chip>
        </ChipGroup>
      </div>
      <NavigationBar aria-label="Sample navigation" defaultValue="home" className="stage-nav">
        <NavigationBarItem
          value="home"
          label="Home"
          icon={<HomeIcon />}
          activeIcon={<HomeFilledIcon />}
        />
        <NavigationBarItem value="explore" label="Explore" icon={<SearchIcon />} />
        <NavigationBarItem
          value="saved"
          label="Saved"
          icon={<BookmarkIcon />}
          activeIcon={<BookmarkFilledIcon />}
        />
      </NavigationBar>
    </div>
  );
}

const FEATURES: { icon: ReactNode; title: string; body: ReactNode }[] = [
  {
    icon: <PackageIcon />,
    title: 'Light where it matters',
    body: (
      <>
        Each component owns its CSS. Import a button and you get a button&rsquo;s styles, not a
        kit&rsquo;s. Every component is checked against a size budget in CI.
      </>
    ),
  },
  {
    icon: <WidgetsIcon />,
    title: 'Native first',
    body: (
      <>
        Dialogs are <code>&lt;dialog&gt;</code>, menus are popovers placed by CSS anchor
        positioning, switches are checkboxes and carousels are scroll containers. Less script,
        correct semantics.
      </>
    ),
  },
  {
    icon: <AnimationIcon />,
    title: 'Expressive motion',
    body: (
      <>
        Spring-driven motion, controls that change shape as you press them, and an exact
        shape-morphing engine with 35 ready-made shapes. All of it settles for reduced motion.
      </>
    ),
  },
  {
    icon: <PaletteIcon />,
    title: 'Colour from one seed',
    body: (
      <>
        Give <code>applyTheme</code> a colour and get a complete palette, light and dark, in
        standard, medium and high contrast. Or take the baseline as it is.
      </>
    ),
  },
  {
    icon: <DarkModeIcon />,
    title: 'Dark mode, done properly',
    body: (
      <>
        Colours are <code>light-dark()</code> pairs. Follow the system or force a scheme, remember
        the choice, and skip the flash with a one-line script in the head.
      </>
    ),
  },
  {
    icon: <AccessibilityIcon />,
    title: 'Accessible by default',
    body: (
      <>
        Established ARIA patterns and real keyboard support. Every example is checked with axe in
        light and dark, and the suite runs on Chromium, Firefox and WebKit.
      </>
    ),
  },
];

/** Thirty-five shapes, any of which turns into any other. */
function ShapePlayground() {
  const [name, setName] = useState<ShapeName>('cookie9Sided');
  return (
    <section className="band shape-band" aria-labelledby="shapes-heading">
      <div className="band-text">
        <p className="eyebrow">Shapes</p>
        <h2 id="shapes-heading">Thirty-five shapes. Any one into any other.</h2>
        <p>
          A morph matches the corners of one shape to the corners of the next and lets each curve
          flow into its partner, as a spring. Pick one and watch it arrive.
        </p>
        <Button
          variant="tonal"
          href={href('/components/shapes/')}
          trailingIcon={<ArrowForwardIcon />}
        >
          Meet the shapes
        </Button>
      </div>
      <div className="shape-stage">
        <div className="shape-hero">
          <Shape shape={shapes[name]} size="min(100%, 260px)" aria-label={`The shape ${name}`} />
          <code>{name}</code>
        </div>
        <ul className="shape-picker" aria-label="Shapes to morph into">
          {shapeNames.map((n) => (
            <li key={n}>
              <button
                type="button"
                className="shape-option"
                aria-label={n}
                aria-pressed={n === name}
                onClick={() => setName(n)}
              >
                <Shape shape={shapes[n]} size={28} animated={false} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The colour and scheme are the whole site's: this is the library theming itself. */
function ThemeBand() {
  const { seed, setSeed, scheme, setScheme } = useSiteTheme();
  return (
    <section className="band theme-band" aria-labelledby="theme-heading">
      <div className="band-text">
        <p className="eyebrow">Colour</p>
        <h2 id="theme-heading">Make it yours. This page already is.</h2>
        <p>
          One seed colour becomes a whole palette, and every component follows it, in light or dark.
          What you pick here themes this entire site, and is remembered.
        </p>
      </div>
      <div className="theme-controls">
        <div role="radiogroup" aria-label="Seed colour" className="swatches">
          {SEEDS.map((s) => (
            // biome-ignore lint/a11y/useSemanticElements: a swatch is a round colour button, which a native radio cannot be drawn as without undoing it; the ARIA radio pattern is complete here (role, checked state, group).
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={seed === s.id}
              aria-label={s.label}
              title={s.label}
              className="swatch-button"
              style={{ '--swatch': s.color } as React.CSSProperties}
              onClick={() => setSeed(s.id)}
            />
          ))}
        </div>
        <SegmentedButton
          aria-label="Light or dark"
          value={scheme}
          onValueChange={(value) => setScheme(value as 'light' | 'dark' | 'system')}
        >
          <SegmentedButtonItem value="light">Light</SegmentedButtonItem>
          <SegmentedButtonItem value="dark">Dark</SegmentedButtonItem>
          <SegmentedButtonItem value="system">System</SegmentedButtonItem>
        </SegmentedButton>
        <div className="theme-sample" aria-hidden="true">
          <Button variant="filled" tabIndex={-1}>
            Filled
          </Button>
          <Button variant="tonal" tabIndex={-1}>
            Tonal
          </Button>
          <Button variant="outlined" tabIndex={-1}>
            Outlined
          </Button>
          <Button variant="elevated" tabIndex={-1}>
            Elevated
          </Button>
        </div>
      </div>
    </section>
  );
}

export function Home() {
  usePageMeta(
    'Wisp UI',
    'Expressive React components with plain CSS: shapes that morph, springs that feel alive, dynamic colour and dark mode.',
  );
  const groups = [...new Set(components.map((c) => c.group))].map((group) => ({
    group,
    items: components.filter((c) => c.group === group),
  }));

  return (
    <Shell wide bare>
      <div className="home">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-text">
            <p className="wordmark" aria-hidden="true">
              wisp<span>UI</span>
            </p>
            <h1 id="hero-heading">
              Expressive by nature.
              <br />
              Light by design.
            </h1>
            <p className="hero-lede">
              React components with shapes that morph, springs that feel alive, colour from a single
              seed, and dark mode that just works. Plain CSS. Native elements. Small pieces that
              leave room for your app.
            </p>
            <div className="hero-actions">
              <Button
                variant="filled"
                size="medium"
                href={href('/docs/getting-started/')}
                trailingIcon={<ArrowForwardIcon />}
              >
                Get started
              </Button>
              <Button variant="tonal" size="medium" href={href('/components/')}>
                Browse components
              </Button>
            </div>
            <p className="hero-install">
              <code>npm install @wisp-ui/react</code>
            </p>
          </div>
          <HeroStage />
        </section>

        <section className="features" aria-labelledby="features-heading">
          <h2 id="features-heading" className="visually-hidden">
            What it is
          </h2>
          <ul className="feature-grid">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="feature">
                <span className="feature-icon">{feature.icon}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <ShapePlayground />
        <ThemeBand />

        <section className="band quick-start" aria-labelledby="start-heading">
          <div className="band-text">
            <p className="eyebrow">Quick start</p>
            <h2 id="start-heading">A button is still a button.</h2>
            <p>
              Import the shared theme once, then the components you use. They ship as ES modules
              with their styles, for any bundler that handles CSS imports. React 19 is the one peer.
            </p>
            <Button
              variant="text"
              href={href('/docs/getting-started/')}
              trailingIcon={<ArrowForwardIcon />}
            >
              Read the guide
            </Button>
          </div>
          <div
            className="prose quick-start-code"
            dangerouslySetInnerHTML={{ __html: quickStart }}
          />
        </section>

        <section className="at-a-glance" aria-labelledby="glance-heading">
          <h2 id="glance-heading">{components.length} components, ready to open.</h2>
          <ul className="glance-grid">
            {groups.map(({ group, items }) => (
              <li key={group} className="glance">
                <h3>{group}</h3>
                <p>
                  {items.slice(0, 6).map((c, i) => (
                    <span key={c.slug}>
                      {i > 0 ? ', ' : ''}
                      <a href={href(`/components/${c.slug}/`)}>{c.title}</a>
                    </span>
                  ))}
                  {items.length > 6 ? <span>, and {items.length - 6} more</span> : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
