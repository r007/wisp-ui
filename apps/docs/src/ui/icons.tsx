/** Icons for the site's own controls: Material Symbols' outlines, which share one box and one path. */

import accessibilityNew from '@material-symbols/svg-400/outlined/accessibility_new.svg?raw';
import add from '@material-symbols/svg-400/outlined/add.svg?raw';
import animation from '@material-symbols/svg-400/outlined/animation.svg?raw';
import arrowForward from '@material-symbols/svg-400/outlined/arrow_forward.svg?raw';
import bolt from '@material-symbols/svg-400/outlined/bolt.svg?raw';
import bookmark from '@material-symbols/svg-400/outlined/bookmark.svg?raw';
import bookmarkFill from '@material-symbols/svg-400/outlined/bookmark-fill.svg?raw';
import brightnessAuto from '@material-symbols/svg-400/outlined/brightness_auto.svg?raw';
import check from '@material-symbols/svg-400/outlined/check.svg?raw';
import code from '@material-symbols/svg-400/outlined/code.svg?raw';
import contentCopy from '@material-symbols/svg-400/outlined/content_copy.svg?raw';
import darkMode from '@material-symbols/svg-400/outlined/dark_mode.svg?raw';
import devices from '@material-symbols/svg-400/outlined/devices.svg?raw';
import edit from '@material-symbols/svg-400/outlined/edit.svg?raw';
import extension from '@material-symbols/svg-400/outlined/extension.svg?raw';
import favorite from '@material-symbols/svg-400/outlined/favorite.svg?raw';
import favoriteFill from '@material-symbols/svg-400/outlined/favorite-fill.svg?raw';
import formatPaint from '@material-symbols/svg-400/outlined/format_paint.svg?raw';
import home from '@material-symbols/svg-400/outlined/home.svg?raw';
import homeFill from '@material-symbols/svg-400/outlined/home-fill.svg?raw';
import inventory2 from '@material-symbols/svg-400/outlined/inventory_2.svg?raw';
import lightMode from '@material-symbols/svg-400/outlined/light_mode.svg?raw';
import menu from '@material-symbols/svg-400/outlined/menu.svg?raw';
import menuBook from '@material-symbols/svg-400/outlined/menu_book.svg?raw';
import openInNew from '@material-symbols/svg-400/outlined/open_in_new.svg?raw';
import palette from '@material-symbols/svg-400/outlined/palette.svg?raw';
import refresh from '@material-symbols/svg-400/outlined/refresh.svg?raw';
import search from '@material-symbols/svg-400/outlined/search.svg?raw';
import widgets from '@material-symbols/svg-400/outlined/widgets.svg?raw';

function SymbolIcon({ raw }: { raw: string }) {
  const path = /\sd="([^"]+)"/.exec(raw)?.[1] ?? '';
  return (
    <svg viewBox="0 -960 960 960" fill="currentColor" focusable="false" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export const AccessibilityIcon = () => <SymbolIcon raw={accessibilityNew} />;
export const AnimationIcon = () => <SymbolIcon raw={animation} />;
export const ArrowForwardIcon = () => <SymbolIcon raw={arrowForward} />;
export const BoltIcon = () => <SymbolIcon raw={bolt} />;
export const AutoSchemeIcon = () => <SymbolIcon raw={brightnessAuto} />;
export const CheckIcon = () => <SymbolIcon raw={check} />;
export const CodeIcon = () => <SymbolIcon raw={code} />;
export const CopyIcon = () => <SymbolIcon raw={contentCopy} />;
export const DarkModeIcon = () => <SymbolIcon raw={darkMode} />;
export const DevicesIcon = () => <SymbolIcon raw={devices} />;
export const ExtensionIcon = () => <SymbolIcon raw={extension} />;
export const PaintIcon = () => <SymbolIcon raw={formatPaint} />;
export const PackageIcon = () => <SymbolIcon raw={inventory2} />;
export const LightModeIcon = () => <SymbolIcon raw={lightMode} />;
export const MenuIcon = () => <SymbolIcon raw={menu} />;
export const BookIcon = () => <SymbolIcon raw={menuBook} />;
export const ExternalIcon = () => <SymbolIcon raw={openInNew} />;
export const PaletteIcon = () => <SymbolIcon raw={palette} />;
export const RefreshIcon = () => <SymbolIcon raw={refresh} />;
export const SearchIcon = () => <SymbolIcon raw={search} />;
export const WidgetsIcon = () => <SymbolIcon raw={widgets} />;

export const AddIcon = () => <SymbolIcon raw={add} />;
export const BookmarkIcon = () => <SymbolIcon raw={bookmark} />;
export const BookmarkFilledIcon = () => <SymbolIcon raw={bookmarkFill} />;
export const EditIcon = () => <SymbolIcon raw={edit} />;
export const FavoriteIcon = () => <SymbolIcon raw={favorite} />;
export const FavoriteFilledIcon = () => <SymbolIcon raw={favoriteFill} />;
export const HomeIcon = () => <SymbolIcon raw={home} />;
export const HomeFilledIcon = () => <SymbolIcon raw={homeFill} />;

/** GitHub's mark: not part of the symbol set. */
export const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" focusable="false" aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);
