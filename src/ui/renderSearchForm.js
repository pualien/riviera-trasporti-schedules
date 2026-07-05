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

function renderActiveDescendantAttribute(activeOptionId) {
  return activeOptionId ? `aria-activedescendant="${escapeHtml(activeOptionId)}"` : '';
}

function renderComboboxInput({
  name,
  value,
  placeholder,
  enterKeyHint,
  panelId,
  panelOpen,
  activeOptionId,
  fieldName,
}) {
  return `
    <input
      name="${escapeHtml(name)}"
      value="${escapeHtml(value)}"
      placeholder="${escapeHtml(placeholder)}"
      autocomplete="off"
      inputmode="search"
      enterkeyhint="${escapeHtml(enterKeyHint)}"
      role="combobox"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      aria-controls="${escapeHtml(panelId)}"
      aria-expanded="${panelOpen ? 'true' : 'false'}"
      ${renderActiveDescendantAttribute(activeOptionId)}
      data-field="${escapeHtml(fieldName)}"
    />
  `;
}

function renderSearchInputRow({
  name,
  value,
  placeholder,
  enterKeyHint,
  panelId,
  panelOpen,
  activeOptionId,
  fieldName,
  t,
}) {
  return `
    <div class="field-input-row">
      ${renderComboboxInput({
        name,
        value,
        placeholder,
        enterKeyHint,
        panelId,
        panelOpen,
        activeOptionId,
        fieldName,
      })}
      ${renderLocationButton(fieldName, t('search.useMyLocation'))}
    </div>
  `;
}

function renderFieldLabel(fieldName, label) {
  return `<span id="${escapeHtml(fieldName)}-field-label">${escapeHtml(label)}</span>`;
}

function renderSuggestionButtons(attributeName, suggestions = [], t, {
  activeOptionId = null,
  idPrefix,
  startIndex = 0,
} = {}) {
  return suggestions
    .map(
      ({ value, meta = '', label = '', type = '' }, index) => {
        const optionId = `${idPrefix}-${startIndex + index}`;
        const selected = activeOptionId === optionId;
        const displayLabel = label || value;

        return `
        <button
          type="button"
          id="${optionId}"
          class="picker-option${selected ? ' picker-option--active' : ''}"
          role="option"
          aria-selected="${selected ? 'true' : 'false'}"
          tabindex="-1"
          ${attributeName}="${escapeHtml(value)}"
          ${type ? `data-option-type="${escapeHtml(type)}"` : ''}
        >
          <span class="picker-option-copy">
            <span class="picker-option-label">${escapeHtml(displayLabel)}</span>
            ${meta ? `<small>${escapeHtml(meta)}</small>` : ''}
          </span>
          <span class="picker-option-action" aria-hidden="true">${escapeHtml(t('search.panel.choose'))}</span>
        </button>
      `;
      },
    )
    .join('');
}

function renderFromPanel(fromSuggestions, t, {
  activeOptionId = null,
  collapseOriginRefinement = false,
} = {}) {
  const {
    exactStops = [],
  } = fromSuggestions ?? {};

  return `
    <div id="from-picker-panel" class="picker-panel" data-panel="from" role="listbox" aria-labelledby="from-field-label">
      <div class="picker-option-group" role="group" aria-label="${escapeHtml(t('search.fromPanel.browseAll'))}">
        <div class="picker-panel-head">
          <div class="picker-panel-copy">${escapeHtml(t('search.fromPanel.browseAll'))}</div>
        </div>
        <div class="picker-option-list">
          ${renderSuggestionButtons('data-from-value', exactStops, t, {
            activeOptionId,
            idPrefix: 'from-picker-option',
          })}
        </div>
      </div>
    </div>
  `;
}

function renderCompactResultSearch({ t, compactRouteLabel, dayType }) {
  return `
    <section class="route-edit-summary" data-route-edit-summary>
      <div>
        <p class="eyebrow">${escapeHtml(t('search.compactEyebrow'))}</p>
        <h1>${escapeHtml(compactRouteLabel || t('search.compactTitle'))}</h1>
        <p>${escapeHtml(t('search.compactDay', { day: t(`search.dayType.${dayType}`) }))}</p>
      </div>
      <button type="button" class="topbar-link" data-edit-search>
        ${escapeHtml(t('search.editSearch'))}
      </button>
    </section>
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
  activeOptionId,
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
          (stop, index) => {
            const optionId = `to-picker-option-${index}`;
            const selected = activeOptionId === optionId;

            return `
            <button
              type="button"
              id="${optionId}"
              class="picker-option${selected ? ' picker-option--active' : ''}"
              role="option"
              aria-selected="${selected ? 'true' : 'false'}"
              tabindex="-1"
              data-stop-id="${escapeHtml(stop.id)}"
              data-to-value="${escapeHtml(stop.canonical)}"
            >
              <span class="picker-option-copy">
                <span class="picker-option-label">${escapeHtml(stop.displayLabel || stop.canonical)}</span>
                <small>${escapeHtml(t('search.panel.stop'))}</small>
              </span>
              <span class="picker-option-action" aria-hidden="true">${escapeHtml(t('search.panel.choose'))}</span>
            </button>
          `;
          },
        )
        .join('')}
    </div>
  `;
}

function renderToPanel({
  t,
  destinationMode,
  destinationMessage,
  reachableDestinations,
  selectedLocalityLabel,
  exactFromStop,
  activeOptionId,
}) {
  const hasOptions = destinationMode !== 'informational' && destinationMode !== 'empty';
  const roleAttributes = hasOptions
    ? 'role="listbox" aria-labelledby="to-field-label"'
    : 'role="status" aria-live="polite"';

  return `
    <div id="to-picker-panel" class="picker-panel" data-panel="to" ${roleAttributes}>${renderDestinationPanel({
      t,
      destinationMode,
      destinationMessage,
      reachableDestinations,
      selectedLocalityLabel,
      exactFromStop,
      activeOptionId,
    })}</div>
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
  fromActiveOptionId = null,
  toInput = to,
  toStopSelected = false,
  toPanelOpen = false,
  toActiveOptionId = null,
  reachableDestinations = [],
  destinationMode = 'informational',
  destinationMessage,
  selectedLocalityLabel = '',
  dayType = 'feriale',
  collapseOriginRefinement = false,
  compactResultMode = false,
  compactRouteLabel = '',
} = {}) {
  if (compactResultMode) {
    return renderCompactResultSearch({ t, compactRouteLabel, dayType });
  }

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
          ${renderFieldLabel('from', t('search.fromLabel'))}
          ${renderSearchInputRow({
            name: 'from',
            value: fromInput,
            placeholder: t('search.fromPlaceholder'),
            enterKeyHint: 'next',
            panelId: 'from-picker-panel',
            panelOpen: fromPanelOpen,
            activeOptionId: fromActiveOptionId,
            fieldName: 'from',
            t,
          })}
          <small>${fromHelp}</small>
          ${fromPanelOpen ? renderFromPanel(fromSuggestions, t, {
    activeOptionId: fromActiveOptionId,
    collapseOriginRefinement,
  }) : ''}
        </label>

        <label class="field">
          ${renderFieldLabel('to', t('search.toLabel'))}
          ${renderSearchInputRow({
            name: 'to',
            value: toInput,
            placeholder: t('search.toPlaceholder'),
            enterKeyHint: 'search',
            panelId: 'to-picker-panel',
            panelOpen: toPanelOpen,
            activeOptionId: toActiveOptionId,
            fieldName: 'to',
            t,
          })}
          <small>${toHelp}</small>
          ${toPanelOpen ? renderToPanel({
            t,
            destinationMode,
            destinationMessage: resolvedDestinationMessage,
            reachableDestinations,
            selectedLocalityLabel,
            exactFromStop,
            activeOptionId: toActiveOptionId,
          }) : ''}
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
