import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildLinePageSummaries,
  buildPlacePageSummaries,
  buildRoutePageCandidates,
} from './lib/seoPageData.mjs';
import {
  renderLinePageHtml,
  renderPlacePageHtml,
  renderRoutePageHtml,
} from './lib/renderSeoPageHtml.mjs';

export const DEFAULT_SITE = {
  baseUrl: 'https://pualien.github.io/riviera-trasporti-schedules',
  appPath: '/riviera-trasporti-schedules/',
  gtmId: 'GTM-WWVLPF5M',
};

async function readJson(rootDir, relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), 'utf8'));
}

async function writeText(rootDir, relativePath, value) {
  const outputPath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, value);
}

async function removeGeneratedPageDirs(rootDir) {
  await Promise.all(
    ['routes', 'places', 'lines'].map((dirname) =>
      rm(path.join(rootDir, dirname), { recursive: true, force: true }),
    ),
  );
}

function trimSlashes(value = '') {
  return String(value).replace(/^\/+|\/+$/g, '');
}

function pagePath(section, slug) {
  const segments = [section, ...trimSlashes(slug).split('/').filter(Boolean)];
  return `/${segments.map((segment) => encodeURIComponent(segment)).join('/')}/`;
}

function outputPath(section, slug) {
  return path.join(section, ...trimSlashes(slug).split('/').filter(Boolean), 'index.html');
}

function canonicalUrl(site, page) {
  const base = new URL(site.baseUrl);
  const basePath = base.pathname.replace(/\/+$/g, '');
  return `${base.origin}${basePath}${page}`;
}

function slashPath(value = '/') {
  const trimmed = trimSlashes(value);
  return trimmed ? `/${trimmed}/` : '/';
}

function rendererSite(site) {
  const basePath = new URL(site.baseUrl).pathname.replace(/\/+$/g, '');
  const appPath = slashPath(site.appPath);

  if (basePath && appPath === `${basePath}/`) {
    return { ...site, appPath: '/' };
  }

  return site;
}

function renderSitemap(site, pages) {
  const urls = pages.map((page) => `  <url><loc>${canonicalUrl(site, page)}</loc></url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function renderRobotsTxt(site) {
  return `User-agent: *
Allow: /

Sitemap: ${canonicalUrl(site, '/sitemap.xml')}
`;
}

function renderNotFoundHtml(site) {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Azzuriva - pagina non trovata</title>
  <meta name="robots" content="noindex">
</head>
<body>
  <main>
    <h1>Azzuriva</h1>
    <p>Pagina non trovata.</p>
    <a href="${canonicalUrl(site, '/')}">Torna all'app</a>
  </main>
</body>
</html>
`;
}

export async function generateSeoPages({ rootDir = process.cwd(), routeLimit = 50, site = DEFAULT_SITE } = {}) {
  const [metadata, trips, stops, localities] = await Promise.all([
    readJson(rootDir, 'assets/data/metadata.json'),
    readJson(rootDir, 'assets/data/trips.json'),
    readJson(rootDir, 'assets/data/stops.json'),
    readJson(rootDir, 'assets/data/localities.json'),
  ]);
  const routePages = buildRoutePageCandidates({ trips, localities, stops, limit: routeLimit });
  const routeSlugByPair = new Map(
    routePages.map((route) => [`${route.fromLocalityId}->${route.toLocalityId}`, route.slug]),
  );
  const placePages = buildPlacePageSummaries({ trips, localities, stops }).map((place) => ({
    ...place,
    directDestinations: place.directDestinations.map((destination) => ({
      ...destination,
      routeSlug: routeSlugByPair.get(`${place.localityId}->${destination.id}`),
    })),
  }));
  const linePages = buildLinePageSummaries({ trips, stops });
  const renderingSite = rendererSite(site);
  const sitemapPages = ['/'];

  await removeGeneratedPageDirs(rootDir);

  for (const route of routePages) {
    const page = pagePath('routes', route.slug);
    sitemapPages.push(page);
    await writeText(
      rootDir,
      outputPath('routes', route.slug),
      renderRoutePageHtml({ site: renderingSite, metadata, route }),
    );
  }

  for (const place of placePages) {
    const page = pagePath('places', place.slug);
    sitemapPages.push(page);
    await writeText(
      rootDir,
      outputPath('places', place.slug),
      renderPlacePageHtml({ site: renderingSite, metadata, place }),
    );
  }

  for (const line of linePages) {
    const page = pagePath('lines', line.slug);
    sitemapPages.push(page);
    await writeText(
      rootDir,
      outputPath('lines', line.slug),
      renderLinePageHtml({ site: renderingSite, metadata, line }),
    );
  }

  await writeText(rootDir, 'sitemap.xml', renderSitemap(site, sitemapPages));
  await writeText(rootDir, 'robots.txt', renderRobotsTxt(site));
  await writeText(rootDir, '404.html', renderNotFoundHtml(site));

  return {
    routeCount: routePages.length,
    placeCount: placePages.length,
    lineCount: linePages.length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { routeCount, placeCount, lineCount } = await generateSeoPages();
  console.log(`Generated ${routeCount} route pages, ${placeCount} place pages, ${lineCount} line pages.`);
}
