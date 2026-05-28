import { describe, expect, it } from 'vitest';
import {
  renderLinePageHtml,
  renderPlacePageHtml,
  renderRoutePageHtml,
} from '../../scripts/lib/renderSeoPageHtml.mjs';

const site = {
  baseUrl: 'https://pualien.github.io/riviera-trasporti-schedules',
  appPath: '/',
};

const metadata = {
  source: {
    title: 'Orario Riviera Trasporti',
    url: 'https://example.com/orario.pdf',
    effectiveDate: '2026-05-01',
  },
  builtAt: '2026-05-28T12:00:00.000Z',
};

describe('renderSeoPageHtml', () => {
  it('renders an Italian route page with canonical URL, source PDF, and app search CTA', () => {
    const html = renderRoutePageHtml({
      site,
      metadata,
      route: {
        slug: 'imperia/sanremo',
        fromLabel: 'Imperia',
        toLabel: 'Sanremo',
        lineIds: ['12'],
        dayTypes: ['feriale'],
        departures: [
          {
            lineId: '12',
            dayType: 'feriale',
            departureTime: '08:00',
            arrivalTime: '08:45',
            sourcePage: 23,
          },
        ],
      },
    });

    expect(html).toContain('<html lang="it">');
    expect(html).toContain(
      '<link rel="canonical" href="https://pualien.github.io/riviera-trasporti-schedules/routes/imperia/sanremo/">',
    );
    expect(html).toContain('Bus Imperia - Sanremo');
    expect(html).toContain('Linea 12');
    expect(html).toContain('08:00');
    expect(html).toContain('https://example.com/orario.pdf#page=23');
    expect(html).toContain('?tab=search');
    expect(html).toContain('from=Imperia');
    expect(html).toContain('to=Sanremo');
    expect(html).toContain('Condividi questa pagina');
    expect(html).toContain('href="/riviera-trasporti-schedules/routes/imperia/sanremo/"');
  });

  it('renders place and line pages with self canonical URLs and Italian headings', () => {
    const placeHtml = renderPlacePageHtml({
      site,
      metadata,
      place: {
        slug: 'sanremo',
        label: 'Sanremo',
        directDestinations: [{ label: 'Imperia', slug: 'imperia', routeSlug: 'sanremo/imperia' }],
        lineIds: ['12'],
      },
    });
    const lineHtml = renderLinePageHtml({
      site,
      metadata,
      line: {
        slug: '12',
        lineId: '12',
        directions: ['Imperia - Sanremo'],
        stops: [{ canonical: 'Sanremo Autostazione' }],
        dayTypes: ['feriale'],
        sourcePages: [23],
      },
    });

    expect(placeHtml).toContain(
      '<link rel="canonical" href="https://pualien.github.io/riviera-trasporti-schedules/places/sanremo/">',
    );
    expect(lineHtml).toContain(
      '<link rel="canonical" href="https://pualien.github.io/riviera-trasporti-schedules/lines/12/">',
    );
    expect(placeHtml).toContain('href="/riviera-trasporti-schedules/routes/sanremo/imperia/"');
    expect(placeHtml).toContain('Destinazioni dirette');
    expect(lineHtml).toContain('Riviera Trasporti linea 12');
  });

  it('builds internal page links and route CTA from configured baseUrl and appPath', () => {
    const configuredSite = {
      baseUrl: 'https://example.com/base',
      appPath: '/app/',
    };
    const routeHtml = renderRoutePageHtml({
      site: configuredSite,
      metadata,
      route: {
        slug: 'imperia/sanremo',
        fromLabel: 'Imperia',
        toLabel: 'Sanremo',
        lineIds: ['12'],
        dayTypes: ['feriale'],
        departures: [],
      },
    });
    const placeHtml = renderPlacePageHtml({
      site: configuredSite,
      metadata,
      place: {
        slug: 'sanremo',
        label: 'Sanremo',
        directDestinations: [{ label: 'Imperia', slug: 'imperia' }],
        lineIds: [],
      },
    });

    expect(routeHtml).toContain('href="/base/app/?tab=search&amp;from=Imperia&amp;to=Sanremo&amp;day=feriale"');
    expect(routeHtml).toContain('href="/base/styles.css"');
    expect(routeHtml).not.toContain('/riviera-trasporti-schedules/styles.css');
    expect(placeHtml).toContain('href="/base/places/imperia/"');
    expect(placeHtml).toContain('<link rel="canonical" href="https://example.com/base/places/sanremo/">');
  });

  it('rejects unsafe slugs before rendering canonical URLs', () => {
    expect(() =>
      renderRoutePageHtml({
        site,
        metadata,
        route: {
          slug: 'imperia/sanremo?tab=search#bad',
          fromLabel: 'Imperia',
          toLabel: 'Sanremo',
          lineIds: [],
          dayTypes: [],
          departures: [],
        },
      }),
    ).toThrow('Unsafe SEO path segment');
  });

  it('escapes dynamic text and URLs in rendered HTML', () => {
    const html = renderRoutePageHtml({
      site: {
        baseUrl: 'https://example.com/base?bad=<script>',
        appPath: '/',
      },
      metadata: {
        ...metadata,
        source: {
          title: 'PDF <orario>',
          url: 'https://example.com/orario.pdf?x=<script>',
          effectiveDate: '2026-05-01',
        },
      },
      route: {
        slug: 'imperia/sanremo',
        fromLabel: 'Imperia <Centro>',
        toLabel: 'Sanremo & Mare',
        lineIds: ['12"><script>'],
        dayTypes: ['feriale'],
        departures: [
          {
            lineId: '12"><script>',
            dayType: 'feriale',
            departureTime: '08:00',
            arrivalTime: '08:45',
            sourcePage: 23,
          },
        ],
      },
    });

    expect(html).toContain('Imperia &lt;Centro&gt;');
    expect(html).toContain('Sanremo &amp; Mare');
    expect(html).toContain('Linea 12&quot;&gt;&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
