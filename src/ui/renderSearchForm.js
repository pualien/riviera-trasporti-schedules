function renderLocationButton(fieldName) {
  return `
    <button type="button" class="field-location-button" data-location-field="${fieldName}">
      Use my location
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

function renderSuggestionButtons(suggestions = []) {
  return suggestions
    .map(
      ({ value, meta = '', label = '' }) => `
        <button type="button" class="picker-option" data-from-value="${escapeHtml(value)}">
          <span class="picker-option-copy">
            <span class="picker-option-label">${escapeHtml(value)}</span>
            ${(meta || label) ? `<small>${escapeHtml(meta || label)}</small>` : ''}
          </span>
          <span class="picker-option-action" aria-hidden="true">Choose</span>
        </button>
      `,
    )
    .join('');
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

function renderRouteProgress({ fromLocalitySelected, exactFromStop, toStopSelected }) {
  const areaState = fromLocalitySelected ? 'done' : 'active';
  const stopState = exactFromStop ? 'done' : (fromLocalitySelected ? 'active' : 'pending');
  const destinationState = toStopSelected ? 'done' : (fromLocalitySelected ? 'active' : 'pending');

  return `
    <div class="route-progress" aria-label="Route picker steps">
      ${renderProgressStep({
        index: '1',
        label: 'Area',
        detail: fromLocalitySelected ? 'Departure area chosen' : 'Choose departure area',
        state: areaState,
      })}
      ${renderProgressStep({
        index: '2',
        label: 'Exact stop',
        detail: exactFromStop ? 'Direct-match stop locked' : 'Refine only if needed',
        state: stopState,
      })}
      ${renderProgressStep({
        index: '3',
        label: 'Destination',
        detail: toStopSelected ? 'Direct stop selected' : 'Choose direct destination',
        state: destinationState,
      })}
    </div>
  `;
}

function renderDestinationPanel({
  destinationMode,
  destinationMessage,
  reachableDestinations,
  selectedLocalityLabel,
  exactFromStop,
}) {
  const matchScope = exactFromStop
    ? exactFromStop.canonical
    : (selectedLocalityLabel || 'Selected area');
  const matchScopeLabel = exactFromStop ? 'Exact stop' : 'Departure area';
  const destinationCountLabel = `${reachableDestinations.length} direct option${reachableDestinations.length === 1 ? '' : 's'}`;

  if (destinationMode === 'informational' || destinationMode === 'empty') {
    return `
      <div class="picker-panel-head">
        <div class="picker-panel-copy">${escapeHtml(destinationMessage)}</div>
        <div class="picker-panel-meta">
          <span class="picker-panel-tag">${destinationMode === 'empty' ? 'No matches yet' : 'Waiting for area'}</span>
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
                <small>Direct destination</small>
              </span>
              <span class="picker-option-action" aria-hidden="true">Choose</span>
            </button>
          `,
        )
        .join('')}
    </div>
  `;
}

export function renderSearchForm({
  from = '',
  to = '',
  fromInput = from,
  fromLocalitySelected = false,
  exactFromStop = null,
  fromSuggestions = [],
  fromPanelOpen = false,
  toInput = to,
  toStopSelected = false,
  toPanelOpen = false,
  reachableDestinations = [],
  destinationMode = 'informational',
  destinationMessage = 'Choose a departure area first to see direct destinations.',
  selectedLocalityLabel = '',
  dayType = 'feriale',
} = {}) {
  const fromHelp = exactFromStop
    ? 'Exact departure stop selected for direct-service matching.'
    : (fromLocalitySelected
      ? 'Area selected. Refine to the exact stop only if you need narrower matches.'
      : 'Start with an area, then refine to the exact stop if needed.');
  const toHelp = fromLocalitySelected
    ? 'Only direct destinations from the selected departure side appear here.'
    : 'Direct destinations unlock after you choose a departure area.';

  return `
    <section class="hero-shell hero-shell--compact">
      <div class="hero-copy">
        <p class="eyebrow">Ricerca Percorsi / Route Lookup</p>
        <h1>Find direct Riviera buses faster than scanning the PDF.</h1>
        <p class="hero-text">
          Choose a departure area, narrow to the exact stop, then browse only direct destinations.
        </p>
      </div>

      <form id="route-form" class="search-form search-form--capsule">
        <div class="search-form-intro">
          <p class="field-hint">Start broad, then refine only when you need to.</p>
          ${renderRouteProgress({
            fromLocalitySelected,
            exactFromStop,
            toStopSelected,
          })}
        </div>
        <label class="field">
          <span>Da / From</span>
          <div class="field-input-row">
            <input
              name="from"
              value="${escapeHtml(fromInput)}"
              placeholder="Porto Maurizio"
              autocomplete="off"
              data-field="from"
            />
            ${renderLocationButton('from')}
          </div>
          <small>${fromHelp}</small>
          ${fromPanelOpen ? `<div class="picker-panel" data-panel="from">${renderSuggestionButtons(fromSuggestions)}</div>` : ''}
        </label>

        <label class="field">
          <span>A / To</span>
          <div class="field-input-row">
            <input
              name="to"
              value="${escapeHtml(toInput)}"
              placeholder="Choose direct destination"
              autocomplete="off"
              data-field="to"
            />
            ${renderLocationButton('to')}
          </div>
          <small>${toHelp}</small>
          ${toPanelOpen ? `<div class="picker-panel" data-panel="to">${renderDestinationPanel({
            destinationMode,
            destinationMessage,
            reachableDestinations,
            selectedLocalityLabel,
            exactFromStop,
          })}</div>` : ''}
        </label>

        <label class="field">
          <span>Giorno / Day type</span>
          <select name="dayType" class="field-select">
            <option value="feriale" ${dayType === 'feriale' ? 'selected' : ''}>Feriale / Weekday</option>
            <option value="sabato" ${dayType === 'sabato' ? 'selected' : ''}>Sabato / Saturday</option>
            <option value="festivo" ${dayType === 'festivo' ? 'selected' : ''}>Festivo / Holiday</option>
            <option value="scolastico" ${dayType === 'scolastico' ? 'selected' : ''}>Scolastico / School</option>
          </select>
        </label>

        <button type="submit" class="search-form-submit">Show departures</button>
      </form>
    </section>
  `;
}
