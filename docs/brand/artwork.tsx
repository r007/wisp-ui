import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@wisp-ui/tokens/theme.css';
import { useLayoutEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Fab,
  IconButton,
  LinearProgress,
  LoadingIndicator,
  NavigationBar,
  NavigationBarItem,
  NavigationDrawer,
  NavigationDrawerItem,
  NavigationDrawerSection,
  Slider,
  Switch,
  TextField,
} from '../../packages/react/src/index.js';
import {
  AddIcon,
  BookmarkIcon,
  CheckIcon,
  EditIcon,
  FavoriteIcon,
  HomeIcon,
  InboxIcon,
  PersonIcon,
  SearchIcon,
  SendIcon,
  StarIcon,
} from '../../packages/react/src/stories/icons.js';
import { applyTheme } from '../../packages/tokens/src/index.js';

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M8 40C16 10 33 9 28 29S35 53 43 29 58 18 55 26"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Controls() {
  return (
    <>
      <div className="row">
        <Button variant="filled" icon={<AddIcon />}>
          Create something
        </Button>
        <IconButton aria-label="Favourite" variant="tonal" defaultSelected>
          <FavoriteIcon />
        </IconButton>
      </div>
      <div className="row spaced">
        <Fab aria-label="Compose" variant="tertiary" icon={<EditIcon />} />
        <LoadingIndicator aria-label="Loading" />
        <CircularProgress aria-label="Progress" value={72} wavy />
        <Switch aria-label="Expressive motion" defaultChecked icons />
      </div>
      <Slider aria-label="Make it yours" defaultValue={66} size="medium" />
      <div className="row">
        <Chip variant="filter" defaultSelected>
          Expressive
        </Chip>
        <Chip variant="assist" icon={<CheckIcon />}>
          Native to the web
        </Chip>
      </div>
    </>
  );
}

function Artwork() {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!root.current) return;
    const cleanups = Array.from(root.current.querySelectorAll<HTMLElement>('[data-seed]')).map(
      (element) => applyTheme(element, element.dataset.seed ?? '#006a60'),
    );
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);
  const showcase = new URLSearchParams(window.location.search).get('view') === 'components';
  return (
    <div ref={root}>
      {showcase ? (
        <section className="showcase" id="components">
          <header>
            <span className="eyebrow">THE REAL THING</span>
            <h1>A little more personality.</h1>
            <p>Wisp components, rendered straight from the source.</p>
          </header>
          <div className="gallery">
            <article className="sample mint" data-seed="#006a60">
              <span className="eyebrow">01 / EVERYDAY, EXPRESSIVE</span>
              <Controls />
              <TextField
                label="Your next big idea"
                defaultValue="Make the web feel alive"
                variant="outlined"
              />
              <NavigationBar aria-label="Explore" defaultValue="home">
                <NavigationBarItem value="home" label="Home" icon={<HomeIcon />} />
                <NavigationBarItem value="search" label="Explore" icon={<SearchIcon />} />
                <NavigationBarItem value="saved" label="Saved" icon={<BookmarkIcon />} />
              </NavigationBar>
            </article>
            <article className="sample dusk" data-seed="#9c4146">
              <span className="eyebrow">02 / ROOM TO BUILD</span>
              <div className="drawer-scene">
                <NavigationDrawer aria-label="Workspace" defaultValue="inbox" variant="standard">
                  <NavigationDrawerSection headline="Your workspace">
                    <NavigationDrawerItem
                      value="inbox"
                      label="Inbox"
                      badge="12"
                      icon={<InboxIcon />}
                    />
                    <NavigationDrawerItem value="starred" label="Starred" icon={<StarIcon />} />
                    <NavigationDrawerItem value="sent" label="Sent" icon={<SendIcon />} />
                  </NavigationDrawerSection>
                </NavigationDrawer>
              </div>
              <div className="row">
                <Button variant="filled" icon={<EditIcon />}>
                  Start a conversation
                </Button>
                <IconButton aria-label="Profile" variant="outlined">
                  <PersonIcon />
                </IconButton>
              </div>
              <div className="row spaced">
                <label className="row" htmlFor="less-ceremony">
                  <Checkbox id="less-ceremony" defaultChecked />
                  Less ceremony
                </label>
                <Switch aria-label="Dark mode" defaultChecked icons />
              </div>
              <LinearProgress aria-label="Building" value={68} wavy />
            </article>
          </div>
          <footer>
            PLAIN REACT. PLAIN CSS. FULL OF CHARACTER.<span>WISP UI ↗</span>
          </footer>
        </section>
      ) : (
        <section className="hero" id="hero">
          <div className="grain" />
          <header className="hero-top">
            <span className="brand">
              <Mark /> WISP UI
            </span>
            <span>MATERIAL 3 EXPRESSIVE / REACT</span>
          </header>
          <div className="hero-copy">
            <h1>
              wisp<span> UI</span>
            </h1>
            <h2>
              Expressive by nature.
              <br />
              Light by design.
            </h2>
            <p>
              The joy of Material.
              <br />
              The simplicity of the web.
            </p>
          </div>
          <div className="component-cloud" data-seed="#006a60">
            <div className="floating-label">
              <span className="status-dot" /> A LITTLE PERSONALITY GOES A LONG WAY
            </div>
            <div className="control-card">
              <Controls />
            </div>
            <div className="nav-card">
              <NavigationBar aria-label="Main" defaultValue="home">
                <NavigationBarItem value="home" label="Home" icon={<HomeIcon />} />
                <NavigationBarItem value="search" label="Explore" icon={<SearchIcon />} />
                <NavigationBarItem value="saved" label="Saved" icon={<BookmarkIcon />} />
              </NavigationBar>
            </div>
          </div>
          <footer>
            <span>THOUGHTFUL COMPONENTS. A LIGHTER FOOTPRINT.</span>
            <span>OPEN SOURCE, OPEN POSSIBILITIES ↗</span>
          </footer>
        </section>
      )}
    </div>
  );
}

const container = document.getElementById('root');
if (container) createRoot(container).render(<Artwork />);
