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

function escapeScriptString(value = '') {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/</g, '\\x3c')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
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

const SEO_UTM_MEDIUM = 'seo_page';
const SEO_UTM_CAMPAIGN = 'riviera_dei_fiori_route_finder_seo';

function addSeoUtm(params, source) {
  params.set('utm_source', source);
  params.set('utm_medium', SEO_UTM_MEDIUM);
  params.set('utm_campaign', SEO_UTM_CAMPAIGN);
}

function renderGtmHead(site, pageType) {
  if (!site.gtmId) {
    return '';
  }

  const gtmId = escapeScriptString(site.gtmId);
  const tab = escapeScriptString(pageType);

  return `  <script>
window.dataLayer=window.dataLayer||[];
window.dataLayer.push({event:'landing_context',tab:'${tab}',has_route_params:false,has_share_utm:false,utm_source:'',utm_medium:'',utm_campaign:'',referrer_type:document.referrer?'referral':'direct',language:document.documentElement.lang||'it'});
</script>
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
  <!-- End Google Tag Manager -->`;
}

function renderGtmNoScript(site) {
  if (!site.gtmId) {
    return '';
  }

  return `  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${escapeAttribute(site.gtmId)}"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->`;
}

function renderPwaHead(site) {
  return `  <link rel="icon" type="image/png" sizes="32x32" href="${escapeAttribute(publicPath(site, '/assets/brand/favicon-32x32.png'))}">
  <link rel="icon" type="image/png" sizes="16x16" href="${escapeAttribute(publicPath(site, '/assets/brand/favicon-16x16.png'))}">
  <link rel="apple-touch-icon" href="${escapeAttribute(publicPath(site, '/assets/brand/apple-touch-icon.png'))}">
  <link rel="manifest" href="${escapeAttribute(publicPath(site, '/manifest.webmanifest'))}">
  <meta name="theme-color" content="#eb4c60">`;
}

function renderSeoServiceWorkerScript(site) {
  const serviceWorkerPath = escapeScriptString(publicPath(site, '/service-worker.js'));

  return `  <script>
(function(){
  if(!('serviceWorker' in navigator)){ return; }

  window.addEventListener('load', function(){
    navigator.serviceWorker.register('${serviceWorkerPath}').then(function(){
      return navigator.serviceWorker.ready;
    }).then(function(registration){
      var worker = registration.active || navigator.serviceWorker.controller;
      if(worker){
        worker.postMessage({type:'CACHE_URL',url:window.location.href});
      }
    }).catch(function(error){
      console.error('Service worker registration failed', error);
    });
  });
})();
</script>`;
}

function renderSeoOutboundScript(site) {
  if (!site.gtmId) {
    return '';
  }

  return `  <script>
(function(){
  function targetType(href){
    var normalizedHref = String(href || '').toLowerCase();

    if(normalizedHref.indexOf('.pdf') !== -1){ return 'official_pdf'; }
    if(normalizedHref.indexOf('tel:') === 0){ return 'taxi_call'; }
    if(normalizedHref.indexOf('trenitalia') !== -1 || normalizedHref.indexOf('lefrecce.it') !== -1 || normalizedHref.indexOf('dati.regione.liguria.it') !== -1){ return 'train'; }
    if(normalizedHref.indexOf('flixbus') !== -1){ return 'flixbus'; }
    if(normalizedHref.indexOf('blablacar') !== -1){ return 'blablacar'; }
    if(normalizedHref.indexOf('wa.me') !== -1 || normalizedHref.indexOf('t.me') !== -1 || normalizedHref.indexOf('facebook.com/sharer') !== -1 || normalizedHref.indexOf('twitter.com/intent') !== -1){ return 'social_share'; }

    return 'external';
  }

  document.addEventListener('click', function(event){
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;

    if(!link){ return; }

    var href = link.getAttribute('href') || '';

    if(!/^https?:/i.test(href) && !/^tel:/i.test(href)){ return; }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({event:'outbound_click',target_type:targetType(href),context:'seo_page'});
  });
})();
</script>`;
}

function renderLayout({ site, metadata, path, title, description, body, pageType }) {
  const canonical = canonicalUrl(site, path);
  const sourceTitle = metadata?.source?.title ?? 'orario ufficiale';
  const effectiveDate = metadata?.source?.effectiveDate;
  const builtAt = metadata?.builtAt;
  const gtmHead = renderGtmHead(site, pageType);
  const gtmNoScript = renderGtmNoScript(site);
  const pwaHead = renderPwaHead(site);
  const seoOutboundScript = renderSeoOutboundScript(site);
  const serviceWorkerScript = renderSeoServiceWorkerScript(site);

  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttribute(description)}">
  <link rel="canonical" href="${escapeAttribute(canonical)}">
${pwaHead}
  <link rel="stylesheet" href="${escapeAttribute(publicPath(site, '/styles.css'))}">
${gtmHead ? `${gtmHead}\n` : ''}</head>
<body>
${gtmNoScript ? `${gtmNoScript}\n` : ''}  <main class="seo-page">
${body}
    <footer>
      <p>Dati da ${escapeHtml(sourceTitle)}${effectiveDate ? `, validi dal ${escapeHtml(effectiveDate)}` : ''}.</p>
      ${builtAt ? `<p>Pagina generata il ${escapeHtml(builtAt)}.</p>` : ''}
    </footer>
  </main>
${seoOutboundScript ? `${seoOutboundScript}\n` : ''}${serviceWorkerScript}
</body>
</html>`;
}

function routeSearchUrl(site, route) {
  const search = route.search ?? {};
  const params = new URLSearchParams({
    tab: 'search',
    from: search.fromLabel ?? route.fromLabel ?? '',
    to: search.toLabel ?? route.toLabel ?? '',
  });
  const day = search.dayType ?? (route.dayTypes ?? [])[0];

  if (search.fromLocalityId) {
    params.set('fromLocality', search.fromLocalityId);
  }

  if (search.fromStopId) {
    params.set('fromStop', search.fromStopId);
  }

  if (search.toStopId) {
    params.set('toStop', search.toStopId);
  }

  if (day) {
    params.set('day', day);
  }

  addSeoUtm(params, 'seo_route');

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

  addSeoUtm(params, 'seo_line');

  return `${appPath(site)}?${params.toString()}`;
}

function placeDestinationSearchUrl(site, place, destination) {
  const search = destination.search ?? {};
  const params = new URLSearchParams({
    tab: 'search',
    from: search.fromLabel ?? place.label ?? '',
    to: search.toLabel ?? destination.label ?? '',
  });

  if (search.fromLocalityId ?? place.localityId) {
    params.set('fromLocality', search.fromLocalityId ?? place.localityId);
  }

  if (search.fromStopId) {
    params.set('fromStop', search.fromStopId);
  }

  if (search.toStopId) {
    params.set('toStop', search.toStopId);
  }

  params.set('day', search.dayType ?? 'feriale');
  addSeoUtm(params, 'seo_place');

  return `${appPath(site)}?${params.toString()}`;
}

function routeIndexSearchUrl(site) {
  const params = new URLSearchParams();
  addSeoUtm(params, 'seo_routes_index');

  return `${appPath(site)}?${params.toString()}`;
}

function lineLabel(lineId) {
  return `Linea ${lineId}`;
}

function pluralizeItalian(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function routeGroupsByOrigin(routes = []) {
  const groups = new Map();

  for (const route of routes) {
    const key = route.fromLabel ?? '';

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(route);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([fromLabel, groupRoutes]) => ({
      fromLabel,
      routes: groupRoutes.sort(
        (left, right) => compareText(left.toLabel, right.toLabel) || compareText(left.slug, right.slug),
      ),
    }));
}

export function renderRouteIndexPageHtml({ site, metadata, routes = [] }) {
  const path = '/routes/';
  const title = 'Percorsi bus Riviera Trasporti';
  const routeCount = routes.length;
  const description = `Sfoglia ${pluralizeItalian(routeCount, 'percorso bus diretto', 'percorsi bus diretti')} Riviera Trasporti per citta di partenza.`;
  const groups = routeGroupsByOrigin(routes);
  const routeGroups = groups.length
    ? groups
      .map(
        (group) => `    <section>
      <h2>Da ${escapeHtml(group.fromLabel)}</h2>
      <ul>
${formatList(group.routes, (route) => {
  const href = publicPath(site, pagePath('routes', route.slug));
  const lines = (route.lineIds ?? []).map(lineLabel).join(', ');
  const departureCount = Number(route.departureCount ?? 0);
  const meta = [
    lines,
    departureCount ? pluralizeItalian(departureCount, 'partenza', 'partenze') : '',
  ].filter(Boolean).join(' · ');

  return `<a href="${escapeAttribute(href)}">${escapeHtml(route.fromLabel)} - ${escapeHtml(route.toLabel)}</a>${meta ? ` <span>${escapeHtml(meta)}</span>` : ''}`;
})}
      </ul>
    </section>`,
      )
      .join('\n')
    : `    <section>
      <h2>Percorsi</h2>
      <p>Nessun percorso statico generato per ora. Usa la ricerca nell'app per consultare le corse dirette.</p>
    </section>`;
  const body = `    <header>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
      <p>${escapeHtml(pluralizeItalian(routeCount, 'percorso', 'percorsi'))} disponibili.</p>
      <a class="button" href="${escapeAttribute(routeIndexSearchUrl(site))}">Cerca nell'app</a>
    </header>
${routeGroups}`;

  return renderLayout({ site, metadata, path, title, description, body, pageType: 'seo_routes_index' });
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
      <a class="button secondary" href="${escapeAttribute(publicPath(site, path))}">Link permanente</a>
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

  return renderLayout({ site, metadata, path, title, description, body, pageType: 'seo_route' });
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
    : placeDestinationSearchUrl(site, place, destination);
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

  return renderLayout({ site, metadata, path, title, description, body, pageType: 'seo_place' });
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

  return renderLayout({ site, metadata, path, title, description, body, pageType: 'seo_line' });
}
