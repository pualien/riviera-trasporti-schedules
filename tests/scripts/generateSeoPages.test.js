import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SITE, generateSeoPages } from '../../scripts/generate-seo-pages.mjs';

const tempRoots = [];

async function writeJson(rootDir, relativePath, value) {
  await writeFile(path.join(rootDir, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

async function readOutput(rootDir, relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function createFixtureRoot() {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'azzuriva-seo-'));
  tempRoots.push(rootDir);
  await mkdir(path.join(rootDir, 'assets/data'), { recursive: true });

  await writeJson(rootDir, 'assets/data/metadata.json', {
    source: {
      title: 'Fixture orario',
      url: 'https://example.com/orario.pdf',
      effectiveDate: '2026-05-01',
    },
    builtAt: '2026-05-28T12:00:00.000Z',
  });
  await writeJson(rootDir, 'assets/data/stops.json', [
    { id: 'imperia', canonical: 'Imperia' },
    { id: 'sanremo', canonical: 'Sanremo Autostazione' },
  ]);
  await writeJson(rootDir, 'assets/data/localities.json', [
    { id: 'imperia', label: 'Imperia', stopIds: ['imperia'] },
    { id: 'sanremo', label: 'Sanremo', stopIds: ['sanremo'] },
  ]);
  await writeJson(rootDir, 'assets/data/trips.json', [
    {
      lineId: '12',
      direction: 'Imperia - Sanremo',
      dayType: 'feriale',
      sourcePage: 23,
      stops: [
        { stopId: 'imperia', name: 'Imperia', time: '08:00' },
        { stopId: 'sanremo', name: 'Sanremo', time: '08:45' },
      ],
    },
  ]);

  return rootDir;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((rootDir) => rm(rootDir, { recursive: true, force: true })));
});

describe('generateSeoPages', () => {
  it('writes route, place, line, sitemap, robots, and fallback pages from data assets', async () => {
    const rootDir = await createFixtureRoot();

    await expect(generateSeoPages({ rootDir })).resolves.toEqual({
      routeCount: 1,
      placeCount: 2,
      lineCount: 1,
    });

    await expect(readOutput(rootDir, 'routes/imperia/sanremo/index.html')).resolves.toContain(
      'Bus Imperia - Sanremo',
    );
    await expect(readOutput(rootDir, 'places/imperia/index.html')).resolves.toContain('Bus da Imperia');
    await expect(readOutput(rootDir, 'places/imperia/index.html')).resolves.toContain(
      'href="/riviera-trasporti-schedules/routes/imperia/sanremo/"',
    );
    await expect(readOutput(rootDir, 'lines/12/index.html')).resolves.toContain('linea 12');
    await expect(readOutput(rootDir, 'sitemap.xml')).resolves.toContain('/routes/imperia/sanremo/');
    await expect(readOutput(rootDir, 'sitemap.xml')).resolves.toContain(
      '<loc>https://pualien.github.io/riviera-trasporti-schedules/</loc>',
    );
    await expect(readOutput(rootDir, 'robots.txt')).resolves.toContain('Sitemap:');
    await expect(readOutput(rootDir, '404.html')).resolves.toContain('Azzuriva');
  });

  it('uses the GitHub Pages default site without duplicating the app path in rendered links', async () => {
    const rootDir = await createFixtureRoot();

    expect(DEFAULT_SITE).toMatchObject({
      baseUrl: 'https://pualien.github.io/riviera-trasporti-schedules',
      appPath: '/riviera-trasporti-schedules/',
    });

    await generateSeoPages({ rootDir });

    const routeHtml = await readOutput(rootDir, 'routes/imperia/sanremo/index.html');
    expect(routeHtml).toContain('href="/riviera-trasporti-schedules/?tab=search');
    expect(routeHtml).toContain('href="/riviera-trasporti-schedules/styles.css"');
    expect(routeHtml).not.toContain('/riviera-trasporti-schedules/riviera-trasporti-schedules/');
  });

  it('removes stale generated route pages before writing the current page set', async () => {
    const rootDir = await createFixtureRoot();

    await generateSeoPages({ rootDir });
    await expect(readOutput(rootDir, 'routes/imperia/sanremo/index.html')).resolves.toContain(
      'Bus Imperia - Sanremo',
    );

    await generateSeoPages({ rootDir, routeLimit: 0 });

    await expect(readOutput(rootDir, 'routes/imperia/sanremo/index.html')).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(readOutput(rootDir, 'sitemap.xml')).resolves.not.toContain('/routes/imperia/sanremo/');
  });
});
