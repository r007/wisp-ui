/**
 * Which Material 3 Expressive tokens feed the Menu's private variables.
 *
 * `md.comp.menus` is the Expressive menu: a 16px popup of 44px items with 4px corners that
 * round to 12px at the ends of a group and when selected. It has two colour schemes,
 * `standard` (a low surface, tertiary selection) and `vibrant` (a tertiary container).
 *
 * A menu item is a list item, so the item variables are the *list-item contract* (see
 * `list.tokens.ts`), supplied here from the menu's own tokens. The menu publishes no type
 * tokens; its text uses the list item's.
 */
import type { ComponentTokenSpec, TokenBlock } from '@wisp-ui/codegen/spec';

const MENUS = 'md.comp.menus';
const ITEM = 'menu-item';
const STATES = ['hovered', 'focused', 'pressed'] as const;
/** The resting token plus its interaction siblings, which must all match. */
const same = (path: string, lead: string) => [
  `${lead}${path}`,
  ...STATES.map((state) => `${lead}${state}.${path}`),
];
const active = (path: string, lead: string) => STATES.map((state) => `${lead}${state}.${path}`);

/** The colours of one scheme: the popup, then each item state. */
const scheme = (name: 'standard' | 'vibrant'): TokenBlock => {
  const i = `${name}.${ITEM}.`;
  const selected = `${i}selected.`;
  // Standard publishes every state; vibrant publishes only the resting selected icon.
  const everyState = name === 'standard';
  const selectedSame = (path: string) => (everyState ? same(path, selected) : `${selected}${path}`);
  const selectedActive = (path: string) =>
    everyState ? active(path, selected) : `${selected}${path}`;
  return {
    selector: `.${name}`,
    prefix: MENUS,
    vars: {
      'panel-color': `${name}.container.color`,
      // Vibrant items have no container of their own: they sit on the popup's colour.
      'container-color': name === 'vibrant' ? `${name}.container.color` : `${i}container.color`,
      'selected-container-color': `${selected}container.color`,

      'label-color': same('label-text.color', i),
      'selected-label-color': same('label-text.color', selected),
      'supporting-color': `${i}supporting-text.color`,
      'selected-supporting-color': `${selected}supporting-text.color`,
      'trailing-text-color': `${i}trailing-supporting-text.color`,
      'selected-trailing-text-color': `${selected}trailing-supporting-text.color`,

      // Unselected icons keep their resting colour; vibrant alone shifts them on hover, which
      // the list item does not model.
      'leading-icon-color': `${i}leading-icon.color`,
      'selected-leading-icon-color': selectedSame('leading-icon.color'),
      'selected-leading-icon-color-active': selectedActive('leading-icon.color'),
      'trailing-icon-color': `${i}trailing-icon.color`,
      'selected-trailing-icon-color': selectedSame('trailing-icon.color'),
      'selected-trailing-icon-color-active': selectedActive('trailing-icon.color'),

      'state-layer-color': active('state-layer.color', i),
      'selected-state-layer-color': active('state-layer.color', selected),
      'hover-state-layer-opacity': [
        `${i}hovered.state-layer.opacity`,
        `${selected}hovered.state-layer.opacity`,
      ],
      'focus-state-layer-opacity': [
        `${i}focused.state-layer.opacity`,
        `${selected}focused.state-layer.opacity`,
      ],
      'pressed-state-layer-opacity': [
        `${i}pressed.state-layer.opacity`,
        `${selected}pressed.state-layer.opacity`,
      ],

      'disabled-label-color': [`${i}disabled.label-text.color`],
      'disabled-label-opacity': `${i}disabled.label-text.opacity`,
      'disabled-supporting-color': `${i}disabled.supporting-text.color`,
      'disabled-supporting-opacity': `${i}disabled.supporting-text.opacity`,
      'disabled-icon-color': [
        `${i}disabled.leading-icon.color`,
        `${i}disabled.trailing-icon.color`,
      ],
      'disabled-icon-opacity': [
        `${i}disabled.leading-icon.opacity`,
        `${i}disabled.trailing-icon.opacity`,
      ],
      // Vibrant publishes no disabled selected container: fade the selected one as standard does.
      'disabled-selected-container-color': everyState
        ? `${selected}disabled.container.color`
        : `${selected}container.color`,
      'disabled-selected-container-opacity': `standard.${ITEM}.selected.disabled.container.opacity`,
    },
  };
};

export default {
  name: 'Menu',
  blocks: [
    {
      selector: '.root',
      prefix: MENUS,
      vars: {
        'panel-shape': 'container.shape',
        'panel-elevation': 'container.elevation',
        'panel-padding': 'group.padding',
        'panel-gap': 'gap',

        // The list-item contract: geometry. A menu item is always a single line.
        'one-line-height': `${ITEM}.height`,
        'two-line-height': `${ITEM}.height`,
        'three-line-height': `${ITEM}.height`,
        'leading-space': `${ITEM}.leading-space`,
        'trailing-space': `${ITEM}.trailing-space`,
        'top-space': `${ITEM}.top-space`,
        'bottom-space': `${ITEM}.bottom-space`,
        'between-space': `${ITEM}.between-space`,
        'icon-size': [`${ITEM}.leading-icon.size`, `${ITEM}.trailing-icon.size`],

        // Corners: 4px, rounding to 12px when selected and at the ends of the group.
        shape: `${ITEM}.shape`,
        'selected-shape': `${ITEM}.selected.shape`,
        'end-shape': [`${ITEM}.first-child.shape`, `${ITEM}.last-child.shape`],
        'inner-corner': [
          `${ITEM}.first-child.inner-corner.corner-size`,
          `${ITEM}.last-child.inner-corner.corner-size`,
        ],

        'focus-indicator-color': `${ITEM}.focus.indicator.color`,
        'focus-indicator-thickness': `${ITEM}.focus.indicator.thickness`,
        'focus-indicator-outline-offset': `${ITEM}.focus.indicator.outline.offset`,
      },
    },
    {
      // Type comes from the list item.
      selector: '.root',
      prefix: 'md.comp.list.list-item',
      vars: {
        'label-font': 'label-text.type',
        'supporting-font': 'supporting-text.type',
        'trailing-text-font': 'trailing-supporting-text.type',
      },
    },
    scheme('standard'),
    scheme('vibrant'),
  ],
} satisfies ComponentTokenSpec;
