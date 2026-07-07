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

function renderCountdown(minutesUntilDeparture, t) {
  if (!Number.isFinite(minutesUntilDeparture)) {
    return '';
  }

  if (minutesUntilDeparture <= 0) {
    return t('results.countdown.now');
  }

  return t('results.countdown.minutes', { minutes: minutesUntilDeparture });
}

function renderDepartureCard(departure, t, pdfUrl, { compact = false, sourceInfo = null } = {}) {
  const className = [
    'departure-card',
    departure.isSelected ? 'departure-card--selected' : '',
    compact ? 'departure-card--compact' : '',
    departure.minutesUntilDeparture !== undefined ? 'departure-card--answer' : '',
  ].filter(Boolean).join(' ');
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
  const pdfAction = compact
    ? ''
    : departure.sourcePage
      ? `<a href="${pdfHref(pdfUrl, departure.sourcePage)}" target="_blank" rel="noreferrer">${t('results.openPdf')}</a>`
      : sourceInfo?.type === 'gtfs'
        ? `<span>${escapeHtml(t('results.feedSourceOnly'))}</span>`
        : '';

  return `
    <article class="${className}" data-trip-key="${departure.tripKey ?? ''}">
      <div class="departure-main">
        <div class="departure-main-row">
          <strong>${departure.departureTime}</strong>
          <span class="line-badge">${escapeHtml(t('results.line'))} ${escapeHtml(departure.lineId)}</span>
        </div>
        <p>${escapeHtml(t('results.arrives'))} ${escapeHtml(departure.arrivalTime)}</p>
        ${departure.minutesUntilDeparture !== undefined ? `<p class="departure-countdown">${escapeHtml(renderCountdown(departure.minutesUntilDeparture, t))}</p>` : ''}
      </div>
      <div class="departure-meta">
        <span>${departure.durationMinutes} min</span>
        ${detailAction}
        ${compact ? '' : shareAction}
        ${pdfAction}
      </div>
    </article>
  `;
}

function renderNextAnswerCard({
  nextDepartures = [],
  selectedTripKey,
  t,
  pdfUrl,
  sourceInfo,
}) {
  if (!nextDepartures.length) {
    return '';
  }

  return `
    <section class="next-answer-card" aria-labelledby="next-answer-title">
      <div class="section-head">
        <h3 id="next-answer-title">${escapeHtml(t('results.nextAnswerTitle'))}</h3>
        <p>${escapeHtml(t('results.nextAnswerSubtitle'))}</p>
      </div>
      <div class="departure-list departure-list--answer">
        ${nextDepartures.map((departure) => renderDepartureCard({
    ...departure,
    isSelected: departure.tripKey === selectedTripKey,
  }, t, pdfUrl, { sourceInfo })).join('')}
      </div>
    </section>
  `;
}

function timeBandKey(departureTime = '') {
  const hour = Number.parseInt(String(departureTime).slice(0, 2), 10);

  if (!Number.isFinite(hour)) {
    return 'unknown';
  }

  if (hour >= 5 && hour < 12) {
    return 'morning';
  }

  if (hour >= 12 && hour < 18) {
    return 'afternoon';
  }

  if (hour >= 18 && hour < 24) {
    return 'evening';
  }

  return 'night';
}

function renderDepartureArchive({
  departures = [],
  selectedTripKey,
  t,
  open = false,
  compact = true,
  pdfUrl = '#',
  sourceInfo = null,
}) {
  if (!departures.length) {
    return '';
  }

  const groupedDepartures = new Map();
  const bandOrder = ['morning', 'afternoon', 'evening', 'night', 'unknown'];

  for (const departure of departures) {
    const bandKey = timeBandKey(departure.departureTime);
    const bandDepartures = groupedDepartures.get(bandKey) ?? [];

    bandDepartures.push(departure);
    groupedDepartures.set(bandKey, bandDepartures);
  }

  return `
    <details class="departure-archive"${open ? ' open' : ''}>
      <summary>
        <span>${escapeHtml(t('results.allDeparturesCount', { count: departures.length }))}</span>
        <small>${escapeHtml(t('results.allDeparturesDisclosure'))}</small>
      </summary>
      <div class="departure-archive-groups">
        ${bandOrder.map((bandKey) => {
    const bandDepartures = groupedDepartures.get(bandKey);

    if (!bandDepartures?.length) {
      return '';
    }

    return `
          <section class="departure-time-band">
            <div class="departure-time-band-head">
              <h4>${escapeHtml(t(`results.timeBand.${bandKey}`))}</h4>
              <span>${escapeHtml(t('results.timeBandCount', { count: bandDepartures.length }))}</span>
            </div>
            <div class="departure-list departure-list--compact">
              ${bandDepartures.map((departure) => renderDepartureCard({
    ...departure,
    isSelected: departure.tripKey === selectedTripKey,
  }, t, pdfUrl, { compact, sourceInfo })).join('')}
            </div>
          </section>
        `;
  }).join('')}
      </div>
    </details>
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

function renderSourceNote(sourceInfo, t) {
  if (sourceInfo?.type !== 'gtfs') {
    return '';
  }

  return `<p class="results-source-note">${escapeHtml(t('results.gtfsSourceNote'))}</p>`;
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

function renderSecondaryTaxiOptions(taxiOptions, t) {
  if (!taxiOptions.length) {
    return '';
  }

  return `
    <details class="secondary-route-options">
      <summary>
        <span>${escapeHtml(t('taxi.routeSecondarySummary'))}</span>
        <small>${escapeHtml(t('taxi.routeSecondaryDetail'))}</small>
      </summary>
      ${renderTaxiOptionsSection(taxiOptions, { t })}
    </details>
  `;
}

function renderNoBusAlternatives(taxiOptions, t) {
  if (!taxiOptions.length) {
    return '';
  }

  return `
    <section class="no-bus-alternatives">
      <div class="taxi-section-head">
        <h3>${escapeHtml(t('taxi.noBusTitle'))}</h3>
        <p>${escapeHtml(t('taxi.noBusDetail'))}</p>
      </div>
      ${renderTaxiOptionsSection(taxiOptions, { t })}
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
  sourceInfo = null,
}) {
  const archiveAsPrimary = !nextDepartures.length;

  return `
    <section class="results-shell">
      <article class="summary-card" data-result-anchor>
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

        ${renderNextAnswerCard({
    nextDepartures,
    selectedTripKey,
    t,
    pdfUrl,
    sourceInfo,
  })}
        ${renderSummaryMetrics(summary, t)}
        ${renderSourceNote(sourceInfo, t)}
      </article>

      ${renderSharedRouteContext(sharedRouteContext, t)}

      ${allDepartures.length ? `
      <section class="results-section results-section--archive">
        <div class="section-head">
          <h3>${t('results.allDepartures')}</h3>
          <p>${t('results.allDeparturesSubtitle')}</p>
        </div>
        ${renderDepartureArchive({
    departures: allDepartures,
    selectedTripKey,
    t,
    open: archiveAsPrimary,
    compact: !archiveAsPrimary,
    pdfUrl,
    sourceInfo,
  })}
      </section>
      ` : ''}
      ${selectedTripPanel}
      ${summary.serviceEnded ? renderNoBusAlternatives(taxiOptions, t) : renderSecondaryTaxiOptions(taxiOptions, t)}
      ${renderShareModal(routeActions.shareModal, routeLabel, t)}
    </section>
  `;
}
