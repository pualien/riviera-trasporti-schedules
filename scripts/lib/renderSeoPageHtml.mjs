function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value = '') {
  return escapeHtml(value);
}

function trimSlashes(value = '') {
  return String(value).replace(/^\/+|\/+$/g, '');
}

function validatePathSegment(segment) {
  if (!segment || /[?#]/.test(segment)) {
    throw new Error(`Unsafe SEO path segment: ${segment}`);
  }
}

function pagePath(section, slug) {
  const slugSegments = trimSlashes(slug).split('/').filter(Boolean);
  const segments = [section, ...slugSegments];

  for (const segment of segments) {
    validatePathSegment(segment);
  }

  return `/${segments.map((segment) => encodeURIComponent(segment)).join('/')}/`;
}

function basePath(site) {
  return new URL(site.baseUrl).pathname.replace(/\/+$/g, '');
}

function joinPath(...parts) {
  const cleanParts = parts.map((part) => trimSlashes(part)).filter(Boolean);
  if (!cleanParts.length) {
    return '/';
  }

  const joined = `/${cleanParts.join('/')}`;
  const lastPart = String(parts.at(-1) ?? '');
  const trailingSlash = lastPart.endsWith('/');

  return `${joined}${trailingSlash ? '/' : ''}`;
}

function publicPath(site, path) {
  return joinPath(basePath(site), path);
}

function appPath(site) {
  return joinPath(basePath(site), site.appPath ?? '/');
}

function canonicalUrl(site, path) {
  const base = new URL(site.baseUrl);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (/[?#]/.test(cleanPath)) {
    throw new Error(`Unsafe SEO path: ${cleanPath}`);
  }

  return `${base.origin}${basePath(site)}${cleanPath}`;
}

function sourcePdfUrl(metadata, page) {
  const sourceUrl = metadata?.source?.url;

  if (!sourceUrl) {
    return '';
  }

  return page ? `${sourceUrl}#page=${encodeURIComponent(page)}` : sourceUrl;
}

function formatList(values = [], formatter = (value) => value) {
  return values.map((value) => `<li>${formatter(value)}</li>`).join('\n');
}

function renderLayout({ site, metadata, path, title, description, body }) {
  const canonical = canonicalUrl(site, path);
  const sourceTitle = metadata?.source?.title ?? 'orario ufficiale';
  const effectiveDate = metadata?.source?.effectiveDate;
  const builtAt = metadata?.builtAt;

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttribute(description)}">
  <link rel="canonical" href="${escapeAttribute(canonical)}">
  <link rel="stylesheet" href="${escapeAttribute(publicPath(site, '/styles.css'))}">
</head>
<body>
  <main class="seo-page">
${body}
    <footer>
      <p>Dati da ${escapeHtml(sourceTitle)}${effectiveDate ? `, validi dal ${escapeHtml(effectiveDate)}` : ''}.</p>
      ${builtAt ? `<p>Pagina generata il ${escapeHtml(builtAt)}.</p>` : ''}
    </footer>
  </main>
</body>
</html>`;
}

function routeSearchUrl(site, route) {
  const params = new URLSearchParams({
    tab: 'search',
    from: route.fromLabel ?? '',
    to: route.toLabel ?? '',
  });
  const [day] = route.dayTypes ?? [];

  if (day) {
    params.set('day', day);
  }

  return `${appPath(site)}?${params.toString()}`;
}

function lineSearchUrl(site, departure) {
  const params = new URLSearchParams({
    tab: 'search',
    from: departure.fromLabel ?? '',
    to: departure.toLabel ?? '',
  });

  if (departure.dayType) {
    params.set('day', departure.dayType);
  }

  return `${appPath(site)}?${params.toString()}`;
}

function lineLabel(lineId) {
  return `Linea ${lineId}`;
}

export function renderRoutePageHtml({ site, metadata, route }) {
  const path = pagePath('routes', route.slug);
  const title = `Bus ${route.fromLabel} - ${route.toLabel}`;
  const dayTypes = route.dayTypes ?? [];
  const lines = route.lineIds ?? [];
  const departures = route.departures ?? [];
  const description = `Orari bus Riviera Trasporti da ${route.fromLabel} a ${route.toLabel}.`;
  const body = `    <header>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <a class="button" href="${escapeAttribute(routeSearchUrl(site, route))}">Cerca nell'app</a>
      <a class="button secondary" href="${escapeAttribute(publicPath(site, path))}">Condividi questa pagina</a>
    </header>
    <section>
      <h2>Linee disponibili</h2>
      <ul>
${formatList(lines, (lineId) => escapeHtml(lineLabel(lineId)))}
      </ul>
    </section>
    <section>
      <h2>Prime partenze</h2>
      <table>
        <thead>
          <tr>
            <th>Linea</th>
            <th>Giorno</th>
            <th>Partenza</th>
            <th>Arrivo</th>
            <th>Fonte</th>
          </tr>
        </thead>
        <tbody>
${departures
  .map((departure) => {
    const pdfUrl = sourcePdfUrl(metadata, departure.sourcePage);
    return `          <tr>
            <td>${escapeHtml(lineLabel(departure.lineId))}</td>
            <td>${escapeHtml(departure.dayType)}</td>
            <td>${escapeHtml(departure.departureTime)}</td>
            <td>${escapeHtml(departure.arrivalTime)}</td>
            <td>${pdfUrl ? `<a href="${escapeAttribute(pdfUrl)}">PDF pagina ${escapeHtml(departure.sourcePage)}</a>` : ''}</td>
          </tr>`;
  })
  .join('\n')}
        </tbody>
      </table>
      ${dayTypes.length ? `<p>Servizi: ${escapeHtml(dayTypes.join(', '))}.</p>` : ''}
    </section>`;

  return renderLayout({ site, metadata, path, title, description, body });
}

export function renderPlacePageHtml({ site, metadata, place }) {
  const path = pagePath('places', place.slug);
  const title = `Bus da ${place.label}`;
  const description = `Destinazioni dirette e linee Riviera Trasporti da ${place.label}.`;
  const destinations = place.directDestinations ?? [];
  const lines = place.lineIds ?? [];
  const body = `    <header>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </header>
    <section>
      <h2>Destinazioni dirette</h2>
      <ul>
${formatList(destinations, (destination) => {
  const href = destination.routeSlug
    ? publicPath(site, pagePath('routes', destination.routeSlug))
    : publicPath(site, pagePath('places', destination.slug));
  return `<a href="${escapeAttribute(href)}">${escapeHtml(destination.label)}</a>`;
})}
      </ul>
    </section>
    <section>
      <h2>Linee</h2>
      <ul>
${formatList(lines, (lineId) => escapeHtml(lineLabel(lineId)))}
      </ul>
    </section>`;

  return renderLayout({ site, metadata, path, title, description, body });
}

export function renderLinePageHtml({ site, metadata, line }) {
  const path = pagePath('lines', line.slug);
  const title = `Riviera Trasporti linea ${line.lineId}`;
  const description = `Direzioni, fermate e giorni di servizio della linea ${line.lineId}.`;
  const directions = line.directions ?? [];
  const stops = line.stops ?? [];
  const sourcePages = line.sourcePages ?? [];
  const departures = line.departures ?? [];
  const [representativeDeparture] = departures;
  const lineSearchCta = representativeDeparture
    ? `      <a class="button" href="${escapeAttribute(lineSearchUrl(site, representativeDeparture))}">Cerca nell'app</a>`
    : '';
  const departuresSection = departures.length
    ? `    <section>
      <h2>Partenze rappresentative</h2>
      <table>
        <thead>
          <tr>
            <th>Giorno</th>
            <th>Da</th>
            <th>A</th>
            <th>Partenza</th>
            <th>Arrivo</th>
            <th>Fonte</th>
          </tr>
        </thead>
        <tbody>
${departures
  .map((departure) => {
    const pdfUrl = sourcePdfUrl(metadata, departure.sourcePage);
    return `          <tr>
            <td>${escapeHtml(departure.dayType)}</td>
            <td>${escapeHtml(departure.fromLabel)}</td>
            <td>${escapeHtml(departure.toLabel)}</td>
            <td>${escapeHtml(departure.departureTime)}</td>
            <td>${escapeHtml(departure.arrivalTime)}</td>
            <td>${pdfUrl ? `<a href="${escapeAttribute(pdfUrl)}">PDF pagina ${escapeHtml(departure.sourcePage)}</a>` : ''}</td>
          </tr>`;
  })
  .join('\n')}
        </tbody>
      </table>
    </section>`
    : '';
  const body = `    <header>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
${lineSearchCta}
    </header>
    <section>
      <h2>Direzioni</h2>
      <ul>
${formatList(directions, escapeHtml)}
      </ul>
    </section>
    <section>
      <h2>Fermate principali</h2>
      <ul>
${formatList(stops, (stop) => escapeHtml(stop.canonical))}
      </ul>
    </section>
${departuresSection}
    <section>
      <h2>Fonte</h2>
      <ul>
${formatList(sourcePages, (page) => {
  const pdfUrl = sourcePdfUrl(metadata, page);
  return pdfUrl ? `<a href="${escapeAttribute(pdfUrl)}">PDF pagina ${escapeHtml(page)}</a>` : `Pagina ${escapeHtml(page)}`;
})}
      </ul>
    </section>`;

  return renderLayout({ site, metadata, path, title, description, body });
}
