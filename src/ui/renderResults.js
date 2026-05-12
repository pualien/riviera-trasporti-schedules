import { createTranslator } from '../lib/i18n.js';
import { renderTaxiOption } from './renderTaxiOption.js';

function renderDepartureCard(departure, t, pdfUrl) {
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
        <a href="${pdfUrl}#page=${departure.sourcePage}" target="_blank" rel="noreferrer">${t('results.openPdf')}</a>
      </div>
    </article>
  `;
}

function renderSummaryMetrics(summary, t) {
  return `
    <div class="metrics">
      <div class="metric">
        <span>${summary.serviceEnded ? t('results.noMoreDeparturesToday') : t('results.nextDeparture')}</span>
        <strong>${summary.nextDeparture?.departureTime ?? '—'}</strong>
      </div>
      <div class="metric">
        <span>${t('results.soonestArrival')}</span>
        <strong>${summary.soonestArrival?.arrivalTime ?? '—'}</strong>
      </div>
      <div class="metric">
        <span>${t('results.lastDepartureToday')}</span>
        <strong>${summary.lastDepartureTime ?? '—'}</strong>
      </div>
      <div class="metric">
        <span>${t('results.averageDuration')}</span>
        <strong>${summary.averageDurationMinutes} min</strong>
      </div>
    </div>
  `;
}

export function renderResultsView({
  t = createTranslator('en'),
  routeLabel,
  pdfUrl = '#',
  summary,
  nextDepartures,
  allDepartures,
  taxiOption = null,
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

        ${renderSummaryMetrics(summary, t)}
        ${renderTaxiOption(taxiOption, { t })}
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
          }, t, pdfUrl)).join('')}
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
          }, t, pdfUrl)).join('')}
        </div>
      </section>
      ${selectedTripPanel}
    </section>
  `;
}
