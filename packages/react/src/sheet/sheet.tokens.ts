/**
 * Which Material 3 tokens feed the Sheet's private variables.
 *
 * Modal sheets only: a bottom sheet (docked, or floating with a margin and fully rounded
 * corners) and a side sheet. The standard (non-modal) sheets are not ported yet. A side sheet's
 * corner shape is published for the end edge (`16 0 0 16`); the start edge mirrors it in CSS.
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
  ],
} satisfies ComponentTokenSpec;
