import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import { workspaceAliases } from '../aliases.js';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.tsx', '../src/**/*.mdx'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  core: { disableTelemetry: true },
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: { alias: workspaceAliases },
    }),
};

export default config;
