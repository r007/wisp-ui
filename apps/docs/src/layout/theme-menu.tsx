import { IconButton } from '@wisp-ui/react/icon-button';
import { Menu, MenuDivider, MenuItem } from '@wisp-ui/react/menu';
import type { ColorScheme } from '@wisp-ui/react/theme';
import { useRef } from 'react';
import { SEEDS } from '../../scripts/seeds.js';
import { useSiteTheme } from '../site-theme.js';
import { AutoSchemeIcon, DarkModeIcon, LightModeIcon, PaletteIcon } from '../ui/icons.js';

const SCHEMES: { value: ColorScheme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <LightModeIcon /> },
  { value: 'dark', label: 'Dark', icon: <DarkModeIcon /> },
  { value: 'system', label: 'System', icon: <AutoSchemeIcon /> },
];

/** Picks the site's colour and light or dark: which also shows what the library does with a seed. */
export function ThemeMenu() {
  const { seed, setSeed, scheme, setScheme, resolved } = useSiteTheme();
  const custom = !SEEDS.some((s) => s.id === seed);
  const picker = useRef<HTMLInputElement>(null);

  return (
    <Menu
      placement="bottom-end"
      aria-label="Theme"
      trigger={
        <IconButton aria-label="Theme: colour and light or dark" variant="standard">
          {resolved === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      }
    >
      {SCHEMES.map((option) => (
        <MenuItem
          key={option.value}
          role="menuitemradio"
          checked={scheme === option.value}
          keepOpen
          leading={option.icon}
          onClick={() => setScheme(option.value)}
        >
          {option.label}
        </MenuItem>
      ))}
      <MenuDivider />
      {SEEDS.map((option) => (
        <MenuItem
          key={option.id}
          role="menuitemradio"
          checked={seed === option.id}
          keepOpen
          leading={
            <span className="swatch" style={{ '--swatch': option.color } as React.CSSProperties} />
          }
          onClick={() => setSeed(option.id)}
        >
          {option.label}
        </MenuItem>
      ))}
      <MenuItem
        role="menuitemradio"
        checked={custom}
        keepOpen
        leading={<PaletteIcon />}
        // The native colour picker, which a hidden input opens.
        onClick={() => picker.current?.click()}
      >
        Your own…
      </MenuItem>
      <input
        ref={picker}
        type="color"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        value={custom ? seed : '#7a3e9d'}
        onChange={(event) => setSeed(event.target.value.toLowerCase())}
      />
    </Menu>
  );
}
