import { describe, expect, it } from 'vitest';
import {
  SHARE_CHANNELS,
  buildRouteShareUrl,
  buildSocialShareHref,
} from '../../src/lib/shareRoute.js';

describe('shareRoute', () => {
  it('adds stable route share UTM values and channel-specific sources', () => {
    const baseUrl = 'https://azzuriva.example/app?tab=search&from=Imperia&day=feriale';

    expect(buildRouteShareUrl(baseUrl, 'link')).toBe(
      'https://azzuriva.example/app?tab=search&from=Imperia&day=feriale&utm_source=share_link&utm_medium=route_share&utm_campaign=azzuriva_route_share',
    );
    expect(buildRouteShareUrl(baseUrl, 'whatsapp')).toContain('utm_source=share_whatsapp');
    expect(buildRouteShareUrl(baseUrl, 'telegram')).toContain('utm_source=share_telegram');
    expect(buildRouteShareUrl(baseUrl, 'facebook')).toContain('utm_source=share_facebook');
    expect(buildRouteShareUrl(baseUrl, 'x')).toContain('utm_source=share_x');
  });

  it('keeps existing non-share query parameters and replaces old share UTM parameters', () => {
    const sharedUrl = buildRouteShareUrl(
      'https://azzuriva.example/app?tab=search&utm_source=old&utm_medium=old&utm_campaign=old#details',
      'facebook',
    );

    expect(sharedUrl).toBe(
      'https://azzuriva.example/app?tab=search&utm_source=share_facebook&utm_medium=route_share&utm_campaign=azzuriva_route_share#details',
    );
  });

  it('builds social target URLs around the channel share URL', () => {
    const shareUrl = 'https://azzuriva.example/app?tab=search&utm_source=share_whatsapp';
    const text = 'Imperia -> Sanremo';

    expect(buildSocialShareHref({ channel: 'whatsapp', shareUrl, text })).toBe(
      `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`,
    );
    expect(buildSocialShareHref({ channel: 'telegram', shareUrl, text })).toBe(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
    );
    expect(buildSocialShareHref({ channel: 'facebook', shareUrl, text })).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    );
    expect(buildSocialShareHref({ channel: 'x', shareUrl, text })).toBe(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
    );
    expect(buildSocialShareHref({ channel: 'link', shareUrl, text })).toBe(shareUrl);
  });

  it('lists the supported share channels in modal order', () => {
    expect(SHARE_CHANNELS.map((channel) => channel.id)).toEqual([
      'link',
      'whatsapp',
      'telegram',
      'facebook',
      'x',
    ]);
  });
});
