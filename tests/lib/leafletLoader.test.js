import { describe, expect, it } from 'vitest';
import { LEAFLET_JS_URL, ensureLeaflet } from '../../src/lib/leafletLoader.js';

function createFakeDocument() {
  const links = [];
  const scripts = [];

  function createElement(tagName) {
    const element = {
      tagName,
      dataset: {},
      listeners: {},
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      },
      remove() {
        if (tagName === 'script') {
          const index = scripts.indexOf(this);
          if (index >= 0) {
            scripts.splice(index, 1);
          }
        }
      },
    };

    return element;
  }

  const documentRef = {
    createElement,
    head: {
      append(element) {
        links.push(element);
      },
    },
    body: {
      append(element) {
        scripts.push(element);
      },
    },
    querySelector(selector) {
      if (selector.startsWith('link')) {
        return links[0] ?? null;
      }

      if (selector === `script[src="${LEAFLET_JS_URL}"]`) {
        return scripts.find((script) => script.src === LEAFLET_JS_URL) ?? null;
      }

      return null;
    },
  };

  return { documentRef, scripts };
}

describe('ensureLeaflet', () => {
  it('retries with a fresh script when a previous Leaflet script failed', async () => {
    const { documentRef, scripts } = createFakeDocument();
    const windowRef = {};

    const firstLoad = ensureLeaflet({ documentRef, windowRef });
    expect(scripts).toHaveLength(1);

    scripts[0].onerror(new Error('cdn unavailable'));
    await expect(firstLoad).rejects.toThrow('cdn unavailable');

    const secondLoad = ensureLeaflet({ documentRef, windowRef });
    expect(scripts).toHaveLength(1);
    expect(scripts[0].dataset.loadState).toBe('loading');

    scripts[0].onerror(new Error('cdn still unavailable'));
    await expect(secondLoad).rejects.toThrow('cdn still unavailable');
  });
});
