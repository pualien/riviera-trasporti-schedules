import { createTranslator } from '../lib/i18n.js';

const PDF_URL =
  'https://rivieratrasporti.it/images/_ORARI/2025-2026_Orario_Invernale_Generale_7%C2%AAVer_dal_01-04-2026.pdf';

function renderDepartureCard(departure, t) {
  const className = departure.isSelected
    ? 'departure-card departure-card--selected'
    : 'departure-card';

  return `
    <article class="${className}" data-trip-key="${departure.tripKey ?? ''}">
      <div class="departure-main">
        <strong>${departure.departureTime}</strong>
        <p>${t('results.arrives')} ${departure.arrivalTime} · ${t('results.line')} ${departure.lineId}</p>
      </div>
      <div class="departure-meta">
        <span>${departure.durationMinutes} min</span>
        <span>${t('results.showTripMap')}</span>
        <a href="${PDF_URL}#page=${departure.sourcePage}" target="_blank" rel="noreferrer">${t('results.openPdf')}</a>
      </div>
    </article>
  `;
}

export function renderResultsView({
  t = createTranslator('en'),
  routeLabel,
  summary,
  nextDepartures,
  allDepartures,
  selectedTripKey = null,
  selectedTripPanel = '',
}) {
  return `
    <section class="results-shell">
      <article class="summary-card">
        <div class="summary-head">
          <div>
            <p class="eyebrow">${t('results.routeSummary')}</p>
            <h2>${routeLabel}</h2>
          </div>
          <div class="summary-lines">${t('results.line')} ${summary.lines.join(', ')}</div>
        </div>

        <div class="metrics">
          <div class="metric">
            <span>${t('results.average')}</span>
            <strong>${summary.averageDurationMinutes} min</strong>
          </div>
          <div class="metric">
            <span>${t('results.first')}</span>
            <strong>${summary.firstDeparture}</strong>
          </div>
          <div class="metric">
            <span>${t('results.last')}</span>
            <strong>${summary.lastDeparture}</strong>
          </div>
        </div>
      </article>

      <section class="results-section">
        <div class="section-head">
          <h3>${t('results.nextDepartures')}</h3>
          <p>${t('results.nextDeparturesSubtitle')}</p>
        </div>
        <div class="departure-list">
          ${nextDepartures.map((departure) => renderDepartureCard({
            ...departure,
            isSelected: departure.tripKey === selectedTripKey,
          }, t)).join('')}
        </div>
      </section>

      <section class="results-section">
        <div class="section-head">
          <h3>${t('results.allDepartures')}</h3>
          <p>${t('results.allDeparturesSubtitle')}</p>
        </div>
        <div class="departure-list">
          ${allDepartures.map((departure) => renderDepartureCard({
            ...departure,
            isSelected: departure.tripKey === selectedTripKey,
          }, t)).join('')}
        </div>
      </section>
      ${selectedTripPanel}
    </section>
  `;
}
