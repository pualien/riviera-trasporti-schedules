import { describe, expect, it } from 'vitest';
import {
  renderLinePageHtml,
  renderPlacePageHtml,
  renderRouteIndexPageHtml,
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
  it('renders a route index page grouped by origin with route links', () => {
    const html = renderRouteIndexPageHtml({
      site: {
        ...site,
        gtmId: 'GTM-TEST',
      },
      metadata,
      routes: [
        {
          slug: 'imperia/sanremo',
          fromLabel: 'Imperia',
          toLabel: 'Sanremo',
          lineIds: ['12'],
          departureCount: 48,
        },
        {
          slug: 'imperia/taggia',
          fromLabel: 'Imperia',
          toLabel: 'Taggia',
          lineIds: ['12'],
          departureCount: 36,
        },
        {
          slug: 'sanremo/bordighera',
          fromLabel: 'Sanremo',
          toLabel: 'Bordighera',
          lineIds: ['2'],
          departureCount: 24,
        },
      ],
    });

    expect(html).toContain(
      '<link rel="canonical" href="https://pualien.github.io/riviera-trasporti-schedules/routes/">',
    );
    expect(html).toContain('Percorsi bus Riviera Trasporti');
    expect(html).toContain('3 percorsi');
    expect(html).toContain('Da Imperia');
    expect(html).toContain('href="/riviera-trasporti-schedules/routes/imperia/sanremo/"');
    expect(html).toContain('Imperia - Sanremo');
    expect(html).toContain('Linea 12');
    expect(html).toContain('48 partenze');
    expect(html).toContain(
      'href="/riviera-trasporti-schedules/?utm_source=seo_routes_index&amp;utm_medium=seo_page&amp;utm_campaign=riviera_dei_fiori_route_finder_seo"',
    );
    expect(html.indexOf('Da Imperia')).toBeLessThan(html.indexOf('Da Sanremo'));
    expect(html).toContain("tab:'seo_routes_index'");
  });

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
            fromStopId: 'imperia-oneglia',
            fromLabel: 'Imperia Oneglia',
            toStopId: 'sanremo-autostazione',
            toLabel: 'Sanremo Autostazione',
            sourcePage: 23,
          },
        ],
        search: {
          fromLabel: 'Imperia',
          fromLocalityId: 'imperia',
          toLabel: 'Sanremo Autostazione',
          toStopId: 'sanremo-autostazione',
          dayType: 'feriale',
        },
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
    expect(html).toContain('fromLocality=imperia');
    expect(html).toContain('to=Sanremo+Autostazione');
    expect(html).toContain('toStop=sanremo-autostazione');
    expect(html).toContain('utm_source=seo_route');
    expect(html).toContain('utm_medium=seo_page');
    expect(html).toContain('utm_campaign=riviera_dei_fiori_route_finder_seo');
    expect(html).toContain('Link permanente');
    expect(html).toContain('href="/riviera-trasporti-schedules/routes/imperia/sanremo/"');
  });

  it('renders GTM and SEO-page outbound analytics hooks when configured', () => {
    const html = renderRoutePageHtml({
      site: {
        ...site,
        gtmId: 'GTM-TEST',
      },
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

    expect(html).toContain('GTM-TEST');
    expect(html).toContain("event:'landing_context'");
    expect(html).toContain("tab:'seo_route'");
    expect(html).toContain("event:'outbound_click'");
    expect(html).toContain("context:'seo_page'");
  });

  it('renders PWA metadata and service-worker registration on generated pages', () => {
    const html = renderRoutePageHtml({
      site,
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

    expect(html).toContain('<link rel="manifest" href="/riviera-trasporti-schedules/manifest.webmanifest">');
    expect(html).toContain('<meta name="theme-color" content="#eb4c60">');
    expect(html).toContain('<link rel="apple-touch-icon" href="/riviera-trasporti-schedules/assets/brand/apple-touch-icon.png">');
    expect(html).toContain("navigator.serviceWorker.register('/riviera-trasporti-schedules/service-worker.js')");
    expect(html).toContain("type:'CACHE_URL'");
    expect(html).toContain('url:window.location.href');
  });

  it('renders place and line pages with self canonical URLs and Italian headings', () => {
    const placeHtml = renderPlacePageHtml({
      site,
      metadata,
      place: {
        slug: 'sanremo',
        label: 'Sanremo',
        localityId: 'sanremo',
        directDestinations: [
          { label: 'Imperia', slug: 'imperia', routeSlug: 'sanremo/imperia' },
          {
            label: 'Andora',
            slug: 'andora',
            search: {
              fromLabel: 'Sanremo',
              fromLocalityId: 'sanremo',
              toLabel: 'Andora Autostazione',
              toStopId: 'andora-autostazione',
              dayType: 'feriale',
            },
          },
        ],
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
    expect(placeHtml).toContain(
      'href="/riviera-trasporti-schedules/?tab=search&amp;from=Sanremo&amp;to=Andora+Autostazione&amp;fromLocality=sanremo&amp;toStop=andora-autostazione&amp;day=feriale&amp;utm_source=seo_place&amp;utm_medium=seo_page&amp;utm_campaign=riviera_dei_fiori_route_finder_seo"',
    );
    expect(placeHtml).toContain('Destinazioni dirette');
    expect(lineHtml).toContain('Riviera Trasporti linea 12');
  });

  it('renders line page departure rows with an app search CTA for a representative stop pair', () => {
    const html = renderLinePageHtml({
      site,
      metadata,
      line: {
        slug: '12',
        lineId: '12',
        directions: ['Imperia - Sanremo'],
        stops: [{ canonical: 'Imperia' }, { canonical: 'Sanremo Autostazione' }],
        dayTypes: ['feriale'],
        sourcePages: [23],
        departures: [
          {
            dayType: 'feriale',
            direction: 'Imperia - Sanremo',
            departureTime: '08:00',
            arrivalTime: '08:45',
            fromLabel: 'Imperia',
            toLabel: 'Sanremo Autostazione',
            sourcePage: 23,
          },
        ],
      },
    });

    expect(html).toContain('Partenze rappresentative');
    expect(html).toContain('<td>feriale</td>');
    expect(html).toContain('<td>08:00</td>');
    expect(html).toContain('<td>08:45</td>');
    expect(html).toContain('<td>Imperia</td>');
    expect(html).toContain('<td>Sanremo Autostazione</td>');
    expect(html).toContain('https://example.com/orario.pdf#page=23');
    expect(html).toContain(
      'href="/riviera-trasporti-schedules/?tab=search&amp;from=Imperia&amp;to=Sanremo+Autostazione&amp;day=feriale&amp;utm_source=seo_line&amp;utm_medium=seo_page&amp;utm_campaign=riviera_dei_fiori_route_finder_seo"',
    );
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

    expect(routeHtml).toContain(
      'href="/base/app/?tab=search&amp;from=Imperia&amp;to=Sanremo&amp;day=feriale&amp;utm_source=seo_route&amp;utm_medium=seo_page&amp;utm_campaign=riviera_dei_fiori_route_finder_seo"',
    );
    expect(routeHtml).toContain('href="/base/styles.css"');
    expect(routeHtml).not.toContain('/riviera-trasporti-schedules/styles.css');
    expect(placeHtml).toContain(
      'href="/base/app/?tab=search&amp;from=Sanremo&amp;to=Imperia&amp;day=feriale&amp;utm_source=seo_place&amp;utm_medium=seo_page&amp;utm_campaign=riviera_dei_fiori_route_finder_seo"',
    );
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
    expect(html).not.toContain('Imperia <Centro>');
    expect(html).not.toContain('PDF <orario>');
    expect(html).not.toContain('Linea 12"><script>');
  });
});
