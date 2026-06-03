import { createTranslator } from '../lib/i18n.js';
import {
  SHARE_CHANNELS,
  buildRouteShareUrl,
  buildSocialShareHref,
} from '../lib/shareRoute.js';
import { renderTaxiOptionsSection } from './renderTaxiOption.js';
import { renderShareLogo } from './renderLogos.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function pdfHref(pdfUrl, sourcePage) {
  if (!pdfUrl || pdfUrl === '#') {
    return '#';
  }

  return sourcePage ? `${pdfUrl}#page=${sourcePage}` : pdfUrl;
}

function renderDepartureCard(departure, t, pdfUrl) {
  const className = departure.isSelected
    ? 'departure-card departure-card--selected'
    : 'departure-card';
  const actionLabel = departure.isSelected
    ? t('results.selectedAction')
    : t('results.detailsAction');
  const detailActionLabel = `${actionLabel}: ${departure.departureTime} ${t('results.arrives').toLowerCase()} ${departure.arrivalTime} · ${t('results.line')} ${departure.lineId}`;
  const detailAction = departure.tripKey
    ? `<button type="button" class="departure-detail-action" data-select-departure="${escapeHtml(departure.tripKey)}" aria-label="${escapeHtml(detailActionLabel)}" aria-pressed="${departure.isSelected ? 'true' : 'false'}">${escapeHtml(actionLabel)}</button>`
    : `<span>${escapeHtml(actionLabel)}</span>`;
  const shareAction = departure.tripKey
    ? `<button type="button" class="departure-share-action" data-share-departure="${escapeHtml(departure.tripKey)}">${escapeHtml(t('results.shareDeparture'))}</button>`
    : '';

  return `
    <article class="${className}" data-trip-key="${departure.tripKey ?? ''}">
      <div class="departure-main">
        <strong>${departure.departureTime}</strong>
        <p>${t('results.arrives')} ${departure.arrivalTime} · ${t('results.line')} ${departure.lineId}</p>
      </div>
      <div class="departure-meta">
        <span>${departure.durationMinutes} min</span>
        ${detailAction}
        ${shareAction}
        <a href="${pdfHref(pdfUrl, departure.sourcePage)}" target="_blank" rel="noreferrer">${t('results.openPdf')}</a>
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

function renderSaveFeedback(saveFeedback, t) {
  if (!saveFeedback?.status) {
    return '';
  }

  return `
    <p class="route-action-feedback" role="status" aria-live="polite">
      ${escapeHtml(t(`results.saveFeedback.${saveFeedback.status}`))}
    </p>
  `;
}

function renderSharedRouteContext(sharedRouteContext, t) {
  if (!sharedRouteContext?.visible) {
    return '';
  }

  let bodyKey = 'results.sharedContext.routeOnly';

  if (sharedRouteContext.selectedDepartureRestored) {
    bodyKey = 'results.sharedContext.restored';
  } else if (sharedRouteContext.shareScope === 'departure' && sharedRouteContext.tripKey) {
    bodyKey = 'results.sharedContext.departureUnavailable';
  }

  return `
    <section class="shared-route-context">
      <div>
        <p class="eyebrow">${escapeHtml(t('results.sharedContext.title'))}</p>
        <p>${escapeHtml(t(bodyKey))}</p>
      </div>
      <div class="shared-route-context-actions">
        <button type="button" class="topbar-link" data-save-current-route>${escapeHtml(t('results.sharedContext.save'))}</button>
        <button type="button" class="topbar-link" data-reverse-shared-route>${escapeHtml(t('results.sharedContext.reverse'))}</button>
        <button type="button" class="topbar-link" data-share-current-route>${escapeHtml(t('results.sharedContext.shareAgain'))}</button>
      </div>
    </section>
  `;
}

function renderShareModal(shareModal, routeLabel, t) {
  if (!shareModal?.baseUrl) {
    return '';
  }

  const directShareUrl = buildRouteShareUrl(shareModal.baseUrl, 'link');
  const statusMessage = shareModal.status ? t(`results.share.${shareModal.status}`) : '';
  const shareText = shareModal.text || routeLabel;
  const shareOptions = SHARE_CHANNELS
    .filter((channel) => channel.id !== 'link')
    .map((channel) => {
      const shareUrl = buildRouteShareUrl(shareModal.baseUrl, channel.id);
      const href = buildSocialShareHref({
        channel: channel.id,
        shareUrl,
        text: shareText,
      });

      return `
        <a class="share-option share-option--${escapeHtml(channel.id)}" href="${escapeHtml(href)}" target="_blank" rel="noreferrer"
          data-share-option="${escapeHtml(channel.id)}" data-share-url="${escapeHtml(shareUrl)}">
          ${renderShareLogo(channel.id)}
          <span>${escapeHtml(t(channel.labelKey))}</span>
        </a>
      `;
    })
    .join('');

  return `
    <div class="share-modal-backdrop" data-share-modal-backdrop>
      <section class="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-modal-title" data-share-modal>
        <div class="share-modal-head">
          <div>
            <p class="eyebrow">${escapeHtml(t('results.shareRoute'))}</p>
            <h3 id="share-modal-title">${escapeHtml(t('results.share.title'))}</h3>
            <p>${escapeHtml(t('results.share.subtitle'))}</p>
          </div>
          <button type="button" class="share-modal-close" data-share-modal-close aria-label="${escapeHtml(t('results.share.close'))}">x</button>
        </div>
        <label class="share-link-field">
          <span>${escapeHtml(t('results.share.directLink'))}</span>
          <input type="text" readonly value="${escapeHtml(directShareUrl)}" data-share-direct-link>
        </label>
        <div class="share-actions">
          <button type="button" class="share-option share-option--link" data-share-copy-link data-share-url="${escapeHtml(directShareUrl)}">
            ${renderShareLogo('link')}
            <span>${escapeHtml(t('results.share.copyLink'))}</span>
          </button>
          ${shareOptions}
        </div>
        <p class="share-modal-status" role="status" aria-live="polite">${escapeHtml(statusMessage)}</p>
      </section>
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
  taxiOptions = [],
  selectedTripKey = null,
  selectedTripPanel = '',
  routeActions = { saveFeedback: null, shareModal: null },
  sharedRouteContext = null,
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
          <div class="summary-actions">
            <button type="button" class="topbar-link" data-save-current-route>${t('results.saveRoute')}</button>
            <button type="button" class="topbar-link" data-share-current-route>${t('results.shareRoute')}</button>
            ${renderSaveFeedback(routeActions.saveFeedback, t)}
          </div>
        </div>

        ${renderSummaryMetrics(summary, t)}
        ${renderTaxiOptionsSection(taxiOptions, { t })}
      </article>

      ${renderSharedRouteContext(sharedRouteContext, t)}

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
      ${renderShareModal(routeActions.shareModal, routeLabel, t)}
    </section>
  `;
}
