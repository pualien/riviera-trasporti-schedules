const PROJECT_PATH = '/riviera-trasporti-schedules';

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

function pagePath(section, slug) {
  const cleanSlug = trimSlashes(slug);
  return cleanSlug ? `/${section}/${cleanSlug}/` : `/${section}/`;
}

function canonicalUrl(site, path) {
  const base = new URL(site.baseUrl);
  const basePath = base.pathname.replace(/\/+$/g, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base.origin}${basePath}${encodeURI(cleanPath)}`;
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
  <link rel="stylesheet" href="${PROJECT_PATH}/styles.css">
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

function routeSearchUrl(route) {
  const params = new URLSearchParams({
    tab: 'search',
    from: route.fromLabel ?? '',
    to: route.toLabel ?? '',
  });
  const [day] = route.dayTypes ?? [];

  if (day) {
    params.set('day', day);
  }

  return `${PROJECT_PATH}/?${params.toString()}`;
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
      <a class="button" href="${escapeAttribute(routeSearchUrl(route))}">Cerca nell'app</a>
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
  const href = pagePath('places', destination.slug);
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
  const body = `    <header>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
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
