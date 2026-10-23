/**
 * Which Material 3 tokens feed the Sheet's private variables.
 *
 * Modal sheets: a bottom sheet (docked, or floating with a margin and fully rounded corners)
 * and a side sheet. A side sheet's corner shape is published for the end edge (`16 0 0 16`);
 * the start edge mirrors it in CSS.
 *
 * Standard (non-modal) sheets take the same tokens, except where `docked.standard.*` says
 * otherwise: the bottom sheet's elevation, and a side sheet that is `surface`, flat, square and
 * bordered by a divider (it shares the page's colour, so nothing else sets it apart).
 */
import type { ComponentTokenSpec } from '@wisp-ui/codegen/spec';

const BASE = 'md.comp.sheet';

export default {
  name: 'Sheet',
  blocks: [
    {
      selector: '.bottom',
      prefix: `${BASE}.bottom`,
      vars: {
        'container-color': 'docked.container.color',
        'container-shape': 'docked.container.shape',
        'container-elevation': 'docked.modal.container.elevation',
        'handle-color': 'docked.drag-handle.color',
        'handle-width': 'docked.drag-handle.width',
        'handle-height': 'docked.drag-handle.height',
        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
      },
    },
    {
      selector: '.standardBottom',
      prefix: `${BASE}.bottom`,
      vars: {
        'container-color': 'docked.container.color',
        'container-shape': 'docked.container.shape',
        'container-elevation': 'docked.standard.container.elevation',
        'handle-color': 'docked.drag-handle.color',
        'handle-width': 'docked.drag-handle.width',
        'handle-height': 'docked.drag-handle.height',
        'focus-indicator-color': 'focus.indicator.color',
        'focus-indicator-thickness': 'focus.indicator.thickness',
        'focus-indicator-outline-offset': 'focus.indicator.outline.offset',
      },
    },
    {
      selector: '.floating',
      prefix: `${BASE}.floating`,
      vars: {
        'container-color': 'container.color',
        'container-shape': 'container.shape',
        'container-elevation': 'container.elevation',
      },
    },
    {
      selector: '.side',
      prefix: `${BASE}.side`,
      vars: {
        'container-color': 'docked.modal.container.color',
        'container-shape': 'docked.modal.container.shape',
        'container-elevation': 'docked.modal.container.elevation',
        'detached-shape': 'detached.container.shape',
        'min-width': 'docked.container.width',
        'headline-color': 'docked.headline.color',
        'headline-font': 'docked.headline.type',
        'divider-color': 'docked.divider.color',
      },
    },
    {
      selector: '.standardSide',
      prefix: `${BASE}.side`,
      vars: {
        'container-color': 'docked.standard.container.color',
        'container-shape': 'docked.container.shape',
        'container-elevation': 'docked.standard.container.elevation',
        'min-width': 'docked.container.width',
        'headline-color': 'docked.headline.color',
        'headline-font': 'docked.headline.type',
        'divider-color': 'docked.divider.color',
      },
    },
  ],
} satisfies ComponentTokenSpec;
