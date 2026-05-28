import { describe, expect, it } from 'vitest';
import {
  SHARE_CHANNELS,
  buildDepartureShareText,
  buildNativeSharePayload,
  buildRouteShareUrl,
  buildRouteShareText,
  buildSocialShareHref,
} from '../../src/lib/shareRoute.js';

describe('shareRoute', () => {
  it('adds stable route share UTM values and channel-specific sources', () => {
    const baseUrl = 'https://riviera-dei-fiori-route-finder.example/app?tab=search&from=Imperia&day=feriale';

    expect(buildRouteShareUrl(baseUrl, 'link')).toBe(
      'https://riviera-dei-fiori-route-finder.example/app?tab=search&from=Imperia&day=feriale&utm_source=share_link&utm_medium=route_share&utm_campaign=riviera_dei_fiori_route_share',
    );
    expect(buildRouteShareUrl(baseUrl, 'whatsapp')).toContain('utm_source=share_whatsapp');
    expect(buildRouteShareUrl(baseUrl, 'telegram')).toContain('utm_source=share_telegram');
    expect(buildRouteShareUrl(baseUrl, 'facebook')).toContain('utm_source=share_facebook');
    expect(buildRouteShareUrl(baseUrl, 'x')).toContain('utm_source=share_x');
    expect(buildRouteShareUrl(baseUrl, 'native')).toContain('utm_source=share_native');
    expect(SHARE_CHANNELS.map((channel) => channel.id)).not.toContain('native');
  });

  it('keeps existing non-share query parameters and replaces old share UTM parameters', () => {
    const sharedUrl = buildRouteShareUrl(
      'https://riviera-dei-fiori-route-finder.example/app?tab=search&utm_source=old&utm_medium=old&utm_campaign=old#details',
      'facebook',
    );

    expect(sharedUrl).toBe(
      'https://riviera-dei-fiori-route-finder.example/app?tab=search&utm_source=share_facebook&utm_medium=route_share&utm_campaign=riviera_dei_fiori_route_share#details',
    );
  });

  it('builds social target URLs around the channel share URL', () => {
    const shareUrl = 'https://riviera-dei-fiori-route-finder.example/app?tab=search&utm_source=share_whatsapp';
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

  it('builds route share text around the next departure', () => {
    expect(
      buildRouteShareText({
        routeLabel: 'Imperia -> Sanremo',
        dayTypeLabel: 'Feriale',
        nextDeparture: { departureTime: '14:25', arrivalTime: '15:10', lineId: '12' },
        sourceLabel: 'PDF ufficiale Riviera Trasporti',
      }),
    ).toBe(
      'Riviera Dei Fiori Route Finder: Imperia -> Sanremo, linea 12, parte 14:25, arriva 15:10. Giorno: Feriale. Orario dal PDF ufficiale Riviera Trasporti.',
    );
  });

  it('builds route-level share text when there is no next departure', () => {
    expect(
      buildRouteShareText({
        routeLabel: 'Imperia -> Sanremo',
        dayTypeLabel: 'Feriale',
        nextDeparture: null,
        sourceLabel: 'PDF ufficiale Riviera Trasporti',
      }),
    ).toBe(
      'Riviera Dei Fiori Route Finder: Imperia -> Sanremo. Giorno: Feriale. Orario dal PDF ufficiale Riviera Trasporti.',
    );
  });

  it('uses default route share options when omitted', () => {
    expect(() => buildRouteShareText()).not.toThrow();
    expect(buildRouteShareText()).toBe(
      'Riviera Dei Fiori Route Finder: undefined. Giorno: undefined. Orario dal PDF ufficiale Riviera Trasporti.',
    );
  });

  it('builds departure share text around the selected departure', () => {
    expect(
      buildDepartureShareText({
        routeLabel: 'Imperia -> Sanremo',
        dayTypeLabel: 'Sabato',
        departure: { departureTime: '18:05', arrivalTime: '18:45', lineId: '12' },
        sourceLabel: 'PDF ufficiale Riviera Trasporti',
      }),
    ).toBe(
      'Riviera Dei Fiori Route Finder: Imperia -> Sanremo, linea 12, parte 18:05, arriva 18:45. Giorno: Sabato. Orario dal PDF ufficiale Riviera Trasporti.',
    );
  });

  it('uses default departure share options when omitted', () => {
    expect(() => buildDepartureShareText()).not.toThrow();
    expect(buildDepartureShareText()).toBe(
      'Riviera Dei Fiori Route Finder: undefined. Giorno: undefined. Orario dal PDF ufficiale Riviera Trasporti.',
    );
  });

  it('builds native share payloads without changing fields', () => {
    const title = 'Riviera Dei Fiori Route Finder';
    const text = 'Imperia -> Sanremo';
    const url = 'https://riviera-dei-fiori-route-finder.example/app';

    expect(buildNativeSharePayload({ title, text, url })).toEqual({ title, text, url });
  });

  it('uses default native share payload options when omitted', () => {
    expect(() => buildNativeSharePayload()).not.toThrow();
    expect(buildNativeSharePayload()).toEqual({
      title: undefined,
      text: undefined,
      url: undefined,
    });
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
