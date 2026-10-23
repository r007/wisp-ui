import { describe, expect, it } from 'vitest';
import {
  applyColorScheme,
  COLOR_SCHEME_STORAGE_KEY,
  colorSchemeScript,
  readColorScheme,
  resolveColorScheme,
  storeColorScheme,
} from '../src/index.js';

/** An element that records what is set on it, as the DOM would. */
function fakeElement() {
  const properties = new Map<string, string>();
  return {
    properties,
    style: {
      setProperty: (name: string, value: string) => void properties.set(name, value),
      removeProperty: (name: string) => {
        properties.delete(name);
        return '';
      },
    },
    dataset: {} as DOMStringMap,
  };
}

function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe('applyColorScheme', () => {
  it('sets the element’s colour scheme, and a data attribute to style by', () => {
    const el = fakeElement();
    applyColorScheme('dark', el);
    expect(el.properties.get('color-scheme')).toBe('dark');
    expect(el.dataset.wispColorScheme).toBe('dark');
    applyColorScheme('light', el);
    expect(el.properties.get('color-scheme')).toBe('light');
    expect(el.dataset.wispColorScheme).toBe('light');
  });

  it('lets the system decide again by taking its own setting off', () => {
    const el = fakeElement();
    applyColorScheme('dark', el);
    applyColorScheme('system', el);
    expect(el.properties.has('color-scheme')).toBe(false);
    expect(el.dataset.wispColorScheme).toBeUndefined();
  });

  it('works on anything with an inline style', () => {
    const el = { style: fakeElement().style };
    expect(() => applyColorScheme('dark', el)).not.toThrow();
  });
});

describe('resolveColorScheme', () => {
  const asking = (dark: boolean) => (query: string) =>
    ({ matches: dark && query.includes('dark') }) as MediaQueryList;

  it('is what it is told, unless it is told to follow the system', () => {
    expect(resolveColorScheme('light', asking(true))).toBe('light');
    expect(resolveColorScheme('dark', asking(false))).toBe('dark');
  });

  it('asks the system for `system`', () => {
    expect(resolveColorScheme('system', asking(true))).toBe('dark');
    expect(resolveColorScheme('system', asking(false))).toBe('light');
  });
});

describe('readColorScheme and storeColorScheme', () => {
  it('remembers a choice, under one key', () => {
    const storage = fakeStorage();
    expect(storeColorScheme('dark', storage)).toBe(true);
    expect(storage.items.get(COLOR_SCHEME_STORAGE_KEY)).toBe('dark');
    expect(readColorScheme(storage)).toBe('dark');
  });

  it('forgets it for `system`', () => {
    const storage = fakeStorage({ [COLOR_SCHEME_STORAGE_KEY]: 'dark' });
    storeColorScheme('system', storage);
    expect(storage.items.has(COLOR_SCHEME_STORAGE_KEY)).toBe(false);
    expect(readColorScheme(storage)).toBe('system');
  });

  it('is `system` when nothing, or nonsense, is stored', () => {
    expect(readColorScheme(fakeStorage())).toBe('system');
    expect(readColorScheme(fakeStorage({ [COLOR_SCHEME_STORAGE_KEY]: 'sepia' }))).toBe('system');
  });

  it('survives storage that throws, as blocked site data does', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readColorScheme(throwing)).toBe('system');
    expect(storeColorScheme('dark', throwing)).toBe(false);
  });

  it('does not throw where there is no localStorage at all', () => {
    expect(readColorScheme()).toBe('system');
    expect(storeColorScheme('dark')).toBe(false);
  });
});

describe('colorSchemeScript', () => {
  /** Runs the script against a fake page with the given stored value. */
  function run(stored: string | null, broken = false) {
    const el = fakeElement();
    const storage = fakeStorage(stored === null ? {} : { [COLOR_SCHEME_STORAGE_KEY]: stored });
    new Function('localStorage', 'document', colorSchemeScript)(
      broken
        ? {
            getItem: () => {
              throw new Error('blocked');
            },
          }
        : storage,
      { documentElement: el },
    );
    return el;
  }

  it('applies a remembered dark or light, as applyColorScheme does', () => {
    for (const scheme of ['dark', 'light'] as const) {
      const viaScript = run(scheme);
      const viaApply = fakeElement();
      applyColorScheme(scheme, viaApply);
      expect(viaScript.properties).toEqual(viaApply.properties);
      expect(viaScript.dataset).toEqual(viaApply.dataset);
    }
  });

  it('leaves the page to the system when nothing, `system` or nonsense is remembered', () => {
    for (const stored of [null, 'system', 'sepia']) {
      const el = run(stored);
      expect(el.properties.size).toBe(0);
    }
  });

  it('does nothing, quietly, when storage throws', () => {
    expect(run('dark', true).properties.size).toBe(0);
  });

  it('is one short line', () => {
    expect(colorSchemeScript).not.toContain('\n');
    expect(colorSchemeScript.length).toBeLessThan(300);
  });
});
