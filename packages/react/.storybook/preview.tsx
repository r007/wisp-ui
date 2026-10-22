import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@wisp-ui/tokens/theme.css';
import './canvas.css';
import type { Decorator, Preview } from '@storybook/react-vite';
import { applyTheme } from '@wisp-ui/tokens';
import { useEffect } from 'react';

const SEEDS = {
  baseline: 'Baseline (Material purple)',
  '#006a60': 'Teal',
  '#0061a4': 'Blue',
  '#9c4146': 'Rose',
  '#7a5900': 'Amber',
} as const;

const withTheme: Decorator = (Story, { globals }) => {
  const { colorScheme, seed, motion, contrast } = globals as Record<string, string>;

  useEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme =
      colorScheme === 'system' ? 'light dark' : (colorScheme ?? 'light dark');
    root.dataset.wispMotion = motion ?? 'expressive';
    if (contrast && contrast !== 'standard') root.dataset.wispContrast = contrast;
    else delete root.dataset.wispContrast;
    const remove = seed && seed !== 'baseline' ? applyTheme(root, seed) : undefined;
    return () => remove?.();
  }, [colorScheme, seed, motion, contrast]);

  return <Story />;
};

const toolbar = (title: string, icon: string, items: Record<string, string>) => ({
  description: title,
  toolbar: {
    title,
    icon,
    dynamicTitle: true,
    items: Object.entries(items).map(([value, label]) => ({ value, title: label })),
  },
});

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: {
    colorScheme: 'light',
    seed: 'baseline',
    motion: 'expressive',
    contrast: 'standard',
  },
  globalTypes: {
    colorScheme: toolbar('Colour scheme', 'mirror', {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    }),
    seed: toolbar('Seed colour', 'paintbrush', SEEDS),
    motion: toolbar('Motion', 'play', {
      expressive: 'Expressive springs',
      standard: 'Standard springs',
    }),
    contrast: toolbar('Contrast', 'contrast', {
      standard: 'Standard',
      medium: 'Medium',
      high: 'High',
    }),
  },
  parameters: {
    // The theme decorator owns the page background.
    backgrounds: { disable: true },
    layout: 'centered',
    a11y: { test: 'error' },
    controls: { matchers: { color: /(background|color)$/i } },
  },
  tags: ['autodocs'],
};

export default preview;
