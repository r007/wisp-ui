/**
 * Which Material 3 Expressive tokens feed the progress indicators' private variables.
 *
 * Linear and circular indicators share their colours; geometry is per shape. Material
 * publishes a flat and a wavy size for each: a wavy linear bar is taller (10px) and a
 * wavy circle larger (48px), to make room for the wave.
 *
 * The wave's amplitude and wavelength are published too, but the circular wave is a
 * computed path, so `circular-progress.tsx` repeats those two numbers (and says so);
 * the linear wave is a CSS mask and reads them from here.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.progress-indicator';

export default {
  name: 'Progress',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      // The track and indicator are rounded ends; "circular" has no animated radius here.
      vars: {
        'active-color': 'active-indicator.color',
        'track-color': 'track.color',
        'stop-color': 'stop-indicator.color',
      },
    },
    {
      selector: '.linear',
      prefix: `${BASE}.linear`,
      vars: {
        height: 'height',
        'wavy-height': 'with-wave.height',
        thickness: 'active-indicator.thickness',
        'track-thickness': 'track.thickness',
        gap: 'track-active-indicator-space',
        'stop-size': 'stop-indicator.size',
        'stop-trailing-space': 'stop-indicator.trailing-space',
        amplitude: 'active-indicator.wave.amplitude',
        wavelength: 'active-indicator.wave.wavelength',
        'indeterminate-wavelength': 'indeterminate.active-indicator.wave.wavelength',
      },
    },
    {
      selector: '.circular',
      prefix: `${BASE}.circular`,
      vars: {
        size: 'size',
        'wavy-size': 'with-wave.size',
        thickness: 'active-indicator.thickness',
        'track-thickness': 'track.thickness',
        gap: 'track-active-indicator-space',
      },
    },
  ],
} satisfies ComponentTokenSpec;
