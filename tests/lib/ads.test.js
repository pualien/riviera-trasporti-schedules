import { describe, expect, it } from 'vitest';
import {
  ADSENSE_SCRIPT_SELECTOR,
  buildAdSenseScriptUrl,
  hasValidAdSenseClientId,
  installAutoAdsScript,
} from '../../src/lib/ads.js';

function createFakeDocument() {
  const headChildren = [];

  return {
    head: {
      append(node) {
        headChildren.push(node);
      },
    },
    createElement(tagName) {
      return {
        tagName,
        dataset: {},
      };
    },
    querySelector(selector) {
      if (selector !== ADSENSE_SCRIPT_SELECTOR) {
        return null;
      }

      return headChildren.find((node) => node.dataset.adsenseAutoAds === 'true') ?? null;
    },
    get headChildren() {
      return headChildren;
    },
  };
}

describe('ads helpers', () => {
  it('validates AdSense publisher IDs and builds the script URL', () => {
    expect(hasValidAdSenseClientId('ca-pub-1234567890123456')).toBe(true);
    expect(hasValidAdSenseClientId('pub-1234567890123456')).toBe(false);
    expect(buildAdSenseScriptUrl('ca-pub-1234567890123456')).toBe(
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456',
    );
    expect(buildAdSenseScriptUrl('')).toBeNull();
  });

  it('injects the Auto ads script once when a valid client is configured', () => {
    const doc = createFakeDocument();
    const win = {};

    expect(installAutoAdsScript(doc, win, 'ca-pub-1234567890123456')).toBe(true);
    expect(doc.headChildren).toHaveLength(1);
    expect(doc.headChildren[0]).toMatchObject({
      async: true,
      crossOrigin: 'anonymous',
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456',
    });
    expect(doc.headChildren[0].dataset.adsenseAutoAds).toBe('true');
    expect(win.__AZZURIVA_ADSENSE_CLIENT__).toBe('ca-pub-1234567890123456');

    expect(installAutoAdsScript(doc, win, 'ca-pub-1234567890123456')).toBe(false);
    expect(doc.headChildren).toHaveLength(1);
  });

  it('does nothing when the client ID is missing or invalid', () => {
    const doc = createFakeDocument();
    const win = {};

    expect(installAutoAdsScript(doc, win, '')).toBe(false);
    expect(installAutoAdsScript(doc, win, 'ca-pub-not-real')).toBe(false);
    expect(doc.headChildren).toHaveLength(0);
    expect(win.__AZZURIVA_ADSENSE_CLIENT__).toBeUndefined();
  });
});
