/**
 * Which Material 3 tokens feed the List's private variables.
 *
 * The variables are the *list-item contract*: ListItem reads only these, and the
 * container supplies them. `List` supplies them from `md.comp.list`; a Menu can supply
 * the same names from its own tokens and reuse the item.
 *
 * Material publishes two shape sets. The classic list is flat and square; the
 * Expressive "segmented" list separates items by 2px and morphs their corners
 * (4px at rest, 12px on hover, 16px on focus and press). The component picks the set
 * from its `segmented` prop.
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const ITEM = 'list-item';
const STATES = ['hover', 'focus', 'pressed'] as const;
/** The resting token plus its interaction siblings, which must all match. */
const same = (path: string, lead = `${ITEM}.`) => [
  `${lead}${path}`,
  ...STATES.map((state) => `${lead}${state}.${path}`),
];
/** Only the interaction siblings. */
const active = (path: string, lead = `${ITEM}.`) =>
  STATES.map((state) => `${lead}${state}.${path}`);

export default {
  name: 'List',
  blocks: [
    {
      selector: '.root',
      prefix: 'md.comp.list',
      // Corners animate between shapes, so "circular" needs a real radius.
      circularRadius: 'calc(var(--_avatar-size) / 2)',
      vars: {
        // Geometry.
        'one-line-height': `${ITEM}.one-line.container.height`,
        'two-line-height': `${ITEM}.two-line.container.height`,
        'three-line-height': `${ITEM}.three-line.container.height`,
        'leading-space': `${ITEM}.leading-space`,
        'trailing-space': `${ITEM}.trailing-space`,
        'top-space': `${ITEM}.top-space`,
        'bottom-space': `${ITEM}.bottom-space`,
        'between-space': `${ITEM}.between-space`,
        'segment-gap': 'segmented.gap',
        'divider-leading-space': 'divider.leading-space',
        'divider-trailing-space': 'divider.trailing-space',

        // Container.
        'container-color': `${ITEM}.container.color`,
        'segmented-container-color': `${ITEM}.segmented.container.color`,
        'selected-container-color': `${ITEM}.selected.container.color`,

        // Shapes: classic, then Expressive (segmented).
        shape: `${ITEM}.container.shape`,
        'selected-shape': `${ITEM}.selected.container.shape`,
        'segment-shape': `${ITEM}.container.expressive.shape`,
        'segment-hover-shape': `${ITEM}.hovered.container.expressive.shape`,
        'segment-active-shape': [
          `${ITEM}.focused.container.expressive.shape`,
          `${ITEM}.pressed.container.expressive.shape`,
          `${ITEM}.selected.container.expressive.shape`,
          `${ITEM}.selected.hovered.container.expressive.shape`,
          `${ITEM}.selected.focused.container.expressive.shape`,
          `${ITEM}.selected.pressed.container.expressive.shape`,
        ],

        // Text.
        'label-font': `${ITEM}.label-text.type`,
        'label-color': same('label-text.color'),
        'selected-label-color': same('label-text.color', `${ITEM}.selected.`),
        'supporting-font': `${ITEM}.supporting-text.type`,
        'supporting-color': `${ITEM}.supporting-text.color`,
        'selected-supporting-color': `${ITEM}.selected.supporting-text.color`,
        'overline-font': `${ITEM}.overline.type`,
        'overline-color': `${ITEM}.overline.color`,
        'selected-overline-color': `${ITEM}.selected.overline.color`,
        'trailing-text-font': `${ITEM}.trailing-supporting-text.type`,
        'trailing-text-color': `${ITEM}.trailing-supporting-text.color`,
        'selected-trailing-text-color': `${ITEM}.selected.trailing-supporting-text.color`,

        // Icons. Unselected ones never change; a selected item's turn to on-surface while it is
        // interacted with.
        'icon-size': [`${ITEM}.leading-icon.size`, `${ITEM}.trailing-icon.size`],
        'expressive-icon-size': [
          `${ITEM}.leading-icon.expressive.size`,
          `${ITEM}.trailing-icon.expressive.size`,
        ],
        'leading-icon-color': [`${ITEM}.leading-icon.color`, ...active('leading-icon.icon.color')],
        'selected-leading-icon-color': `${ITEM}.selected.leading-icon.color`,
        'selected-leading-icon-color-active': active('leading-icon.color', `${ITEM}.selected.`),
        'trailing-icon-color': [
          `${ITEM}.trailing-icon.color`,
          ...active('trailing-icon.icon.color'),
        ],
        'selected-trailing-icon-color': `${ITEM}.selected.trailing-icon.color`,
        'selected-trailing-icon-color-active': active('trailing-icon.color', `${ITEM}.selected.`),

        // Leading media.
        'avatar-size': `${ITEM}.leading-avatar.size`,
        'avatar-shape': `${ITEM}.leading-avatar.shape`,
        'avatar-color': `${ITEM}.leading-avatar.color`,
        'avatar-label-color': `${ITEM}.leading-avatar-label.color`,
        'avatar-label-font': `${ITEM}.leading-avatar-label.type`,
        'image-width': `${ITEM}.leading-image.width`,
        'image-height': `${ITEM}.leading-image.height`,
        'image-shape': `${ITEM}.leading-image.expressive.shape`,
        'video-width': `${ITEM}.leading-video.width`,
        'video-height': `${ITEM}.small.leading-video.height`,
        'video-shape': `${ITEM}.leading-video.shape`,

        // State layer: one colour per selection, shared by hover, focus and press.
        'state-layer-color': active('state-layer.color'),
        'selected-state-layer-color': active('state-layer.color', `${ITEM}.selected.`),
        'hover-state-layer-opacity': [
          `${ITEM}.hover.state-layer.opacity`,
          `${ITEM}.selected.hover.state-layer.opacity`,
        ],
        'focus-state-layer-opacity': [
          `${ITEM}.focus.state-layer.opacity`,
          `${ITEM}.selected.focus.state-layer.opacity`,
        ],
        'pressed-state-layer-opacity': [
          `${ITEM}.pressed.state-layer.opacity`,
          `${ITEM}.selected.pressed.state-layer.opacity`,
        ],

        // Disabled: fixed opacities of on-surface. A selected item shares every one but
        // its container.
        'disabled-label-color': [
          `${ITEM}.disabled.label-text.color`,
          `${ITEM}.selected.disabled.label-text.color`,
        ],
        'disabled-label-opacity': [
          `${ITEM}.disabled.label-text.opacity`,
          `${ITEM}.selected.disabled.label-text.opacity`,
        ],
        'disabled-supporting-color': [
          `${ITEM}.disabled.supporting-text.color`,
          `${ITEM}.disabled.overline.color`,
        ],
        'disabled-supporting-opacity': [
          `${ITEM}.disabled.supporting-text.opacity`,
          `${ITEM}.disabled.overline.opacity`,
        ],
        'disabled-icon-color': [
          `${ITEM}.disabled.leading-icon.color`,
          `${ITEM}.disabled.trailing-icon.color`,
        ],
        'disabled-icon-opacity': [
          `${ITEM}.disabled.leading-icon.opacity`,
          `${ITEM}.disabled.trailing-icon.opacity`,
        ],
        'disabled-selected-container-color': `${ITEM}.selected.disabled.container.color`,
        'disabled-selected-container-opacity': `${ITEM}.selected.disabled.container.opacity`,

        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
      },
    },
  ],
} satisfies ComponentTokenSpec;
