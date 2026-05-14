import { createTranslator } from '../lib/i18n.js';

function renderLocationButton(fieldName, label) {
  return `
    <button type="button" class="field-location-button" data-location-field="${fieldName}">
      ${escapeHtml(label)}
    </button>
  `;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderSuggestionButtons(attributeName, suggestions = [], t) {
  return suggestions
    .map(
      ({ value, meta = '', label = '', type = '' }) => `
        <button type="button" class="picker-option" ${attributeName}="${escapeHtml(value)}" ${type ? `data-option-type="${escapeHtml(type)}"` : ''}>
          <span class="picker-option-copy">
            <span class="picker-option-label">${escapeHtml(value)}</span>
            ${(meta || label) ? `<small>${escapeHtml(meta || label)}</small>` : ''}
          </span>
          <span class="picker-option-action" aria-hidden="true">${escapeHtml(t('search.panel.choose'))}</span>
        </button>
      `,
    )
    .join('');
}

function renderFromPanel(fromSuggestions, t) {
  const {
    areas = [],
    exactStops = [],
    exactStopHeading = '',
  } = fromSuggestions ?? {};
  const initialOptions = exactStopHeading
    ? areas
    : [...areas, ...exactStops];

  return `
    <div class="picker-panel" data-panel="from">
      <div class="picker-panel-head">
        <div class="picker-panel-copy">${escapeHtml(t('search.fromPanel.browseAll'))}</div>
      </div>
      <div class="picker-option-list">
        ${renderSuggestionButtons('data-from-value', initialOptions, t)}
      </div>
      ${exactStops.length && exactStopHeading ? `
        <div class="picker-panel-head">
          <div class="picker-panel-copy">${escapeHtml(t('search.fromPanel.refineWithin', { locality: exactStopHeading }))}</div>
        </div>
        <div class="picker-option-list">
          ${renderSuggestionButtons('data-from-value', exactStops, t)}
        </div>
      ` : ''}
    </div>
  `;
}

function renderProgressStep({ index, label, detail, state }) {
  return `
    <div class="route-progress-step route-progress-step--${state}">
      <span class="route-progress-index">${index}</span>
      <span class="route-progress-copy">
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
    </div>
  `;
}

function renderRouteProgress({ fromLocalitySelected, exactFromStop, toStopSelected, t }) {
  const areaState = fromLocalitySelected ? 'done' : 'active';
  const stopState = exactFromStop ? 'done' : (fromLocalitySelected ? 'active' : 'pending');
  const destinationState = toStopSelected ? 'done' : (fromLocalitySelected ? 'active' : 'pending');

  return `
    <div class="route-progress" aria-label="${escapeHtml(t('search.progress.label'))}">
      ${renderProgressStep({
        index: '1',
        label: t('search.progress.area'),
        detail: fromLocalitySelected ? t('search.progress.areaDone') : t('search.progress.areaPending'),
        state: areaState,
      })}
      ${renderProgressStep({
        index: '2',
        label: t('search.progress.stop'),
        detail: exactFromStop ? t('search.progress.stopDone') : t('search.progress.stopPending'),
        state: stopState,
      })}
      ${renderProgressStep({
        index: '3',
        label: t('search.progress.destination'),
        detail: toStopSelected ? t('search.progress.destinationDone') : t('search.progress.destinationPending'),
        state: destinationState,
      })}
    </div>
  `;
}

function renderDestinationPanel({
  t,
  destinationMode,
  destinationMessage,
  reachableDestinations,
  selectedLocalityLabel,
  exactFromStop,
}) {
  const matchScope = exactFromStop
    ? exactFromStop.canonical
    : (selectedLocalityLabel || t('search.destination.departureArea'));
  const matchScopeLabel = exactFromStop ? t('search.destination.exactStop') : t('search.destination.departureArea');
  const destinationCountLabel = reachableDestinations.length === 1
    ? t('search.destination.directOptions.one')
    : t('search.destination.directOptions.other', { count: reachableDestinations.length });

  if (destinationMode === 'informational' || destinationMode === 'empty') {
    return `
      <div class="picker-panel-head">
        <div class="picker-panel-copy">${escapeHtml(destinationMessage)}</div>
        <div class="picker-panel-meta">
          <span class="picker-panel-tag">${destinationMode === 'empty' ? t('search.panel.emptyTag') : t('search.panel.waitingTag')}</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="picker-panel-head">
      <div class="picker-panel-copy">${escapeHtml(destinationMessage)}</div>
      <div class="picker-panel-meta">
        <span class="picker-panel-tag">${escapeHtml(matchScopeLabel)}</span>
        <span class="picker-panel-tag">${escapeHtml(destinationCountLabel)}</span>
      </div>
    </div>
    <div class="picker-panel-context">
      <span class="picker-panel-context-label">${escapeHtml(matchScopeLabel)}</span>
      <strong>${escapeHtml(matchScope)}</strong>
    </div>
    <div class="picker-option-list">
      ${reachableDestinations
        .map(
          (stop) => `
            <button type="button" class="picker-option" data-stop-id="${stop.id}" data-to-value="${escapeHtml(stop.canonical)}">
              <span class="picker-option-copy">
                <span class="picker-option-label">${escapeHtml(stop.canonical)}</span>
                <small>${escapeHtml(t('search.panel.directDestination'))}</small>
              </span>
              <span class="picker-option-action" aria-hidden="true">${escapeHtml(t('search.panel.choose'))}</span>
            </button>
          `,
        )
        .join('')}
    </div>
  `;
}

export function renderSearchForm({
  t = createTranslator('en'),
  from = '',
  to = '',
  fromInput = from,
  fromLocalitySelected = false,
  exactFromStop = null,
  fromSuggestions = { areas: [], exactStops: [], exactStopHeading: '' },
  fromPanelOpen = false,
  toInput = to,
  toStopSelected = false,
  toPanelOpen = false,
  reachableDestinations = [],
  destinationMode = 'informational',
  destinationMessage,
  selectedLocalityLabel = '',
  dayType = 'feriale',
} = {}) {
  const originReady = fromLocalitySelected || Boolean(exactFromStop);
  const fromHelp = exactFromStop
    ? t('search.fromHelp.exact')
    : (fromLocalitySelected
      ? t('search.fromHelp.locality')
      : t('search.fromHelp.blank'));
  const toHelp = originReady
    ? t('search.toHelp.ready')
    : t('search.toHelp.locked');
  const resolvedDestinationMessage = destinationMessage ?? t('search.destination.informational');

  return `
    <section class="hero-shell hero-shell--compact">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(t('search.eyebrow'))}</p>
        <h1>${escapeHtml(t('search.title'))}</h1>
        <p class="hero-text">
          ${escapeHtml(t('search.heroText'))}
        </p>
      </div>

      <form id="route-form" class="search-form search-form--capsule">
        <div class="search-form-intro">
          <p class="field-hint">${escapeHtml(t('search.fieldHint'))}</p>
          ${renderRouteProgress({
            fromLocalitySelected,
            exactFromStop,
            toStopSelected,
            t,
          })}
          <div class="route-guidance">
            <span>${escapeHtml(t('search.guidance.origin'))}</span>
            <span>${escapeHtml(t('search.guidance.destination'))}</span>
            <span>${escapeHtml(t('search.guidance.departure'))}</span>
          </div>
        </div>
        <label class="field">
          <span>${escapeHtml(t('search.fromLabel'))}</span>
          <div class="field-input-row">
            <input
              name="from"
              value="${escapeHtml(fromInput)}"
              placeholder="${escapeHtml(t('search.fromPlaceholder'))}"
              autocomplete="off"
              data-field="from"
            />
            ${renderLocationButton('from', t('search.useMyLocation'))}
          </div>
          <small>${fromHelp}</small>
          ${fromPanelOpen ? renderFromPanel(fromSuggestions, t) : ''}
        </label>

        <label class="field">
          <span>${escapeHtml(t('search.toLabel'))}</span>
          <div class="field-input-row">
            <input
              name="to"
              value="${escapeHtml(toInput)}"
              placeholder="${escapeHtml(t('search.toPlaceholder'))}"
              autocomplete="off"
              data-field="to"
            />
            ${renderLocationButton('to', t('search.useMyLocation'))}
          </div>
          <small>${toHelp}</small>
          ${toPanelOpen ? `<div class="picker-panel" data-panel="to">${renderDestinationPanel({
            t,
            destinationMode,
            destinationMessage: resolvedDestinationMessage,
            reachableDestinations,
            selectedLocalityLabel,
            exactFromStop,
          })}</div>` : ''}
        </label>

        <label class="field">
          <span>${escapeHtml(t('search.dayTypeLabel'))}</span>
          <select name="dayType" class="field-select">
            <option value="feriale" ${dayType === 'feriale' ? 'selected' : ''}>${escapeHtml(t('search.dayType.feriale'))}</option>
            <option value="sabato" ${dayType === 'sabato' ? 'selected' : ''}>${escapeHtml(t('search.dayType.sabato'))}</option>
            <option value="festivo" ${dayType === 'festivo' ? 'selected' : ''}>${escapeHtml(t('search.dayType.festivo'))}</option>
            <option value="scolastico" ${dayType === 'scolastico' ? 'selected' : ''}>${escapeHtml(t('search.dayType.scolastico'))}</option>
          </select>
        </label>

        <button type="submit" class="search-form-submit">${escapeHtml(t('search.submit'))}</button>
      </form>
    </section>
  `;
}
