/**
 * Stands in for `storybook/test`, which the stories import for their interaction tests (`play`
 * functions) and for `fn()` action spies. The docs site renders the stories as examples and never
 * runs `play`, so these do nothing: `fn()` is an empty callback.
 */

export const fn = (implementation?: (...args: never[]) => unknown) =>
  (implementation ?? (() => undefined)) as (...args: never[]) => unknown;

const nothing = () => {
  throw new Error('Interaction tests do not run on the documentation site.');
};

export const expect = nothing;
export const userEvent = new Proxy({}, { get: () => nothing });
export const within = nothing;
export const waitFor = nothing;
