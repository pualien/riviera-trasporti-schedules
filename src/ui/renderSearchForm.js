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
          <span>${escapeHtml(value)}</span>
          ${(meta || label) ? `<small>${escapeHtml(meta || label)}</small>` : ''}
        </button>
      `,
    )
    .join('');
}

function renderDestinationPanel({ destinationMode, destinationMessage, reachableDestinations }) {
  if (destinationMode === 'informational' || destinationMode === 'empty') {
    return `<div class="picker-panel-copy">${escapeHtml(destinationMessage)}</div>`;
  }

  return `
    <div class="picker-panel-copy">${escapeHtml(destinationMessage)}</div>
    <div class="picker-option-list">
      ${reachableDestinations
        .map(
          (stop) => `
            <button type="button" class="picker-option" data-stop-id="${stop.id}" data-to-value="${escapeHtml(stop.canonical)}">
              <span>${escapeHtml(stop.canonical)}</span>
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
  exactFromStop = null,
  fromSuggestions = [],
  fromPanelOpen = false,
  toInput = to,
  toPanelOpen = false,
  reachableDestinations = [],
  destinationMode = 'informational',
  destinationMessage = 'Choose a departure area first to see direct destinations.',
  dayType = 'feriale',
} = {}) {
  const fromHelp = exactFromStop
    ? 'Exact departure stop selected.'
    : 'Start with an area, then refine to the exact stop if needed.';

  return `
    <section class="hero-shell hero-shell--compact">
      <div class="hero-copy">
        <p class="eyebrow">Riviera Trasporti Search</p>
        <h1>Find direct Riviera buses faster than scanning the PDF.</h1>
        <p class="hero-text">
          Choose a departure area, narrow to the exact stop, then browse only direct destinations.
        </p>
      </div>

      <form id="route-form" class="search-form search-form--capsule">
        <p class="field-hint">Start broad, then refine only when you need to.</p>
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
          <small>Only direct destinations appear here.</small>
          ${toPanelOpen ? `<div class="picker-panel" data-panel="to">${renderDestinationPanel({
            destinationMode,
            destinationMessage,
            reachableDestinations,
          })}</div>` : ''}
        </label>

        <label class="field">
          <span>Giorno / Day type</span>
          <select name="dayType">
            <option value="feriale" ${dayType === 'feriale' ? 'selected' : ''}>Feriale / Weekday</option>
            <option value="sabato" ${dayType === 'sabato' ? 'selected' : ''}>Sabato / Saturday</option>
            <option value="festivo" ${dayType === 'festivo' ? 'selected' : ''}>Festivo / Holiday</option>
            <option value="scolastico" ${dayType === 'scolastico' ? 'selected' : ''}>Scolastico / School</option>
          </select>
        </label>

        <button type="submit">Show departures</button>
      </form>
    </section>
  `;
}
