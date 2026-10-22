/**
 * Which Material 3 Expressive tokens feed the Slider's private variables.
 *
 * Colours, the handle and the value bubble are shared; the track's thickness, its outer corner
 * and the handle's height come in five sizes. The slider is a native range input laid over
 * custom visuals, so the visuals read the value as a fraction (`--_fraction`) set inline.
 *
 * The inner corners where a track meets the handle are 2px (`inner-corner.corner-size` is
 * published as a four-value shape, which does not map to one radius), so that number lives in
 * the CSS.
 */
import type { ComponentTokenSpec, TokenBlock } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.slider';

const sizes = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;
/** Only the larger sizes have room for an icon in the track. */
const withIcon = new Set<string>(['medium', 'large', 'xlarge']);

const sizeBlock = (size: (typeof sizes)[number]): TokenBlock => ({
  selector: `.size-${size}`,
  prefix: `${BASE}.${size}`,
  // The track's ends are rounded rectangles; "circular" is not used for them.
  vars: {
    'active-height': 'active.track.height',
    'inactive-height': 'inactive.track.height',
    'leading-shape': 'active.track.shape.leading',
    'trailing-shape': 'inactive.track.shape.trailing',
    'handle-height': 'active.handle.height',
    ...(withIcon.has(size) && { 'icon-size': 'icon.size', 'icon-padding': 'icon.padding' }),
  },
});

export default {
  name: 'Slider',
  blocks: [
    {
      selector: '.root',
      prefix: BASE,
      circularRadius: '9999px',
      vars: {
        'handle-width': ['handle.width', 'hover.handle.width'],
        'handle-pressed-width': ['focus.handle.width', 'pressed.handle.width'],
        'handle-color': ['handle.color', 'pressed.handle.color', 'active.handle.color'],
        'handle-gap': ['active.handle.leading-space', 'active.handle.trailing-space'],

        'active-track-color': [
          'active.track.color',
          'focus.active.track.color',
          'pressed.active.track.color',
        ],
        'inactive-track-color': [
          'inactive.track.color',
          'focus.inactive.track.color',
          'pressed.inactive.track.color',
        ],
        'stop-color': 'inactive.stop-indicator.container.color',
        'stop-size': 'stop-indicator.size',
        'stop-trailing-space': 'stop-indicator.trailing-space',

        'value-container-color': 'value-indicator.container.color',
        'value-label-color': 'value-indicator.label.label-text.color',
        'value-bottom-space': 'value-indicator.active.bottom-space',

        'disabled-handle-color': 'disabled.handle.color',
        'disabled-handle-opacity': 'disabled.handle.opacity',
        'disabled-active-track-color': 'disabled.active.track.color',
        'disabled-active-track-opacity': 'disabled.active.track.opacity',
        'disabled-inactive-track-color': 'disabled.inactive.track.color',
        'disabled-inactive-track-opacity': 'disabled.inactive.track.opacity',
        'disabled-stop-color': 'disabled.inactive.stop-indicator.container.color',
      },
    },
    ...sizes.map(sizeBlock),
  ],
} satisfies ComponentTokenSpec;
