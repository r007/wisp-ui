/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  // Generated stylesheets are rewritten by `pnpm codegen`; the dist output is built.
  ignoreFiles: [
    '**/*.generated.css',
    '**/*.generated.module.css',
    '**/dist/**',
    '**/storybook-static/**',
    '**/node_modules/**',
  ],
  rules: {
    // Class names live in CSS Modules and are camelCase (`styles.focusRing`).
    'selector-class-pattern': null,
    // Private component variables are `--_name`, and system tokens follow the spec's
    // dotted names turned into `--md-sys-…`; neither matches the default kebab pattern.
    'custom-property-pattern': null,
    // `:global()` is CSS Modules syntax.
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],

    // ── Architecture: hand-written CSS never contains a literal colour. ──────────
    // Every colour comes from a Material token (`var(--md-sys-color-*)`) or a
    // private variable defined in the generated token module, so theming,
    // dark mode and contrast levels reach every component.
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
    ],

    // Biome formats; these stylistic rules would fight it.
    'declaration-empty-line-before': null,
    'comment-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'rule-empty-line-before': null,
    'at-rule-empty-line-before': null,
    'value-keyword-case': null,
    // `inset-inline: 0 auto` and similar are clearer than the longhand.
    'declaration-block-no-redundant-longhand-properties': null,
    // Browser-specific properties are needed for some touch/tap behaviour.
    'property-no-vendor-prefix': [
      true,
      { ignoreProperties: ['user-select', '-webkit-user-select', 'tap-highlight-color'] },
    ],
    // Heuristic that cannot see that paired `:not(:disabled, [aria-disabled])` guards make
    // states mutually exclusive. State styling is ordered by intent and covered by tests.
    'no-descending-specificity': null,
    // `translate`, `inset`, `color-mix` and friends are intended; do not "fix" them.
    'declaration-property-value-no-unknown': null,
  },
};
