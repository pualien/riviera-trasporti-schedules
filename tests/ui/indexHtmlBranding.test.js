import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

describe('index.html branding', () => {
  it('uses the approved Riviera Dei Fiori Route Finder title and favicon assets', () => {
    expect(html).toContain('<title>Riviera Dei Fiori Route Finder</title>');
    expect(html).toContain('rel="icon" type="image/png" sizes="32x32" href="./assets/brand/favicon-32x32.png"');
    expect(html).toContain('rel="icon" type="image/png" sizes="16x16" href="./assets/brand/favicon-16x16.png"');
    expect(html).toContain('rel="apple-touch-icon" href="./assets/brand/apple-touch-icon.png"');
  });

  it('includes the Google Tag Manager snippets in head and body', () => {
    expect(html).toContain("})(window,document,'script','dataLayer','GTM-WWVLPF5M');</script>");
    expect(html).toContain('<body>\n    <!-- Google Tag Manager (noscript) -->');
    expect(html).toContain('https://www.googletagmanager.com/ns.html?id=GTM-WWVLPF5M');
  });

  it('includes canonical, description, social metadata, and crawlable shell copy', () => {
    expect(html).toContain('rel="canonical" href="https://pualien.github.io/riviera-trasporti-schedules/"');
    expect(html).toContain('name="description"');
    expect(html).toContain('<meta name="google-adsense-account" content="ca-pub-4752698416622962" />');
    expect(html).toContain('<script type="module" src="./src/lib/installAdSense.js?v=10"></script>');
    expect(html).toContain('property="og:site_name" content="Riviera Dei Fiori Route Finder"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('"name": "Riviera Dei Fiori Route Finder"');
    expect(html).toContain('"alternateName": "Riviera dei Fiori bus route lookup"');
    expect(html).toContain('Riviera Dei Fiori Route Finder helps you check direct Riviera Trasporti buses');
    expect(html).toContain('href="./routes/"');
    expect(html).toContain('Browse route pages');
    expect(html).toContain('Imperia, Sanremo, Ventimiglia, Andora');
    expect(html).toContain('Riviera Dei Fiori Route Finder is an independent bus route finder');
    expect(html).toContain('All verified taxi numbers');
    expect(html).toContain('+39 0183 3785');
    expect(html).toContain('+39 0182 0303');
  });
});
