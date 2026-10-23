/** How the library's folders are presented: a name for people, and where in the list they go. */

export type Group = 'Actions' | 'Inputs' | 'Navigation' | 'Feedback' | 'Content' | 'Graphics';

export const GROUPS: readonly Group[] = [
  'Actions',
  'Inputs',
  'Navigation',
  'Feedback',
  'Content',
  'Graphics',
];

interface Entry {
  title: string;
  group: Group;
}

export const CATALOG: Record<string, Entry> = {
  // Actions
  button: { title: 'Button', group: 'Actions' },
  'button-group': { title: 'Button group', group: 'Actions' },
  'split-button': { title: 'Split button', group: 'Actions' },
  'icon-button': { title: 'Icon button', group: 'Actions' },
  fab: { title: 'Floating action button', group: 'Actions' },
  'fab-menu': { title: 'FAB menu', group: 'Actions' },
  // Inputs
  'text-field': { title: 'Text field', group: 'Inputs' },
  select: { title: 'Select', group: 'Inputs' },
  autocomplete: { title: 'Autocomplete', group: 'Inputs' },
  checkbox: { title: 'Checkbox', group: 'Inputs' },
  radio: { title: 'Radio button', group: 'Inputs' },
  switch: { title: 'Switch', group: 'Inputs' },
  slider: { title: 'Slider', group: 'Inputs' },
  chip: { title: 'Chip', group: 'Inputs' },
  'segmented-button': { title: 'Segmented button', group: 'Inputs' },
  'date-picker': { title: 'Date picker', group: 'Inputs' },
  'time-picker': { title: 'Time picker', group: 'Inputs' },
  // Navigation
  'app-bar': { title: 'Top app bar', group: 'Navigation' },
  'bottom-app-bar': { title: 'Bottom app bar', group: 'Navigation' },
  toolbar: { title: 'Toolbar', group: 'Navigation' },
  'navigation-bar': { title: 'Navigation bar', group: 'Navigation' },
  'navigation-rail': { title: 'Navigation rail', group: 'Navigation' },
  'navigation-drawer': { title: 'Navigation drawer', group: 'Navigation' },
  tabs: { title: 'Tabs', group: 'Navigation' },
  menu: { title: 'Menu', group: 'Navigation' },
  'search-bar': { title: 'Search bar', group: 'Navigation' },
  search: { title: 'Search', group: 'Navigation' },
  // Feedback
  dialog: { title: 'Dialog', group: 'Feedback' },
  sheet: { title: 'Sheets', group: 'Feedback' },
  snackbar: { title: 'Snackbar', group: 'Feedback' },
  tooltip: { title: 'Tooltip', group: 'Feedback' },
  banner: { title: 'Banner', group: 'Feedback' },
  badge: { title: 'Badge', group: 'Feedback' },
  progress: { title: 'Progress indicators', group: 'Feedback' },
  'loading-indicator': { title: 'Loading indicator', group: 'Feedback' },
  // Content
  card: { title: 'Card', group: 'Content' },
  list: { title: 'List', group: 'Content' },
  carousel: { title: 'Carousel', group: 'Content' },
  accordion: { title: 'Accordion', group: 'Content' },
  divider: { title: 'Divider', group: 'Content' },
  typography: { title: 'Typography', group: 'Content' },
  // Graphics
  shapes: { title: 'Shapes', group: 'Graphics' },
};

/** `WithIconsAndSupportingText` → `With icons and supporting text`. */
export function humanize(name: string): string {
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ');
  const text = words.map((w, i) => (i === 0 ? w : w.toLowerCase())).join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
