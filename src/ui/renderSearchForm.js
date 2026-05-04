function renderLocationButton(fieldName) {
  return `
    <button type="button" class="field-location-button" data-location-field="${fieldName}">
      Use my location
    </button>
  `;
}

export function renderSearchForm({
  from = 'Porto Maurizio',
  to = 'Sanremo',
  fromInput = from,
  fromLocalityLabel = '',
  exactFromStop = null,
  exactStopChoices = [],
  fromSuggestions = [],
  toInput = to,
  reachableDestinations = [],
  destinationMessage = '',
  dayType = 'feriale',
} = {}) {
  const toDisabled = exactFromStop ? '' : 'disabled';
  const fromHelp = exactFromStop
    ? (fromLocalityLabel
      ? `Exact stop confirmed in ${fromLocalityLabel}.`
      : 'Exact departure stop confirmed.')
    : fromLocalityLabel && exactStopChoices.length > 0
      ? `Choose the exact stop in ${fromLocalityLabel}.`
      : 'Start from a broad place like Porto Maurizio.';
  const fromSuggestionsMarkup = fromSuggestions
    .map(({ value, label = '' }) => `<option value="${value}"${label ? ` label="${label}"` : ''}></option>`)
    .join('');
  const destinationsMarkup = reachableDestinations
    .map((stop) => `<option value="${stop.canonical}" data-stop-id="${stop.id}"></option>`)
    .join('');
  const destinationHelp = exactFromStop && reachableDestinations.length === 0
    ? (destinationMessage || 'No direct destinations found from this stop for the selected day type.')
    : 'Only direct destinations from the selected stop are shown.';

  return `
    <section class="hero-shell">
      <div class="hero-copy">
        <p class="eyebrow">Riviera Trasporti Search</p>
        <h1>Search Riviera Trasporti faster than reading the full PDF.</h1>
        <p class="hero-text">
          Choose an area first, confirm the exact stop, then browse only direct destinations
          published in the official timetable.
        </p>
      </div>

      <form id="route-form" class="search-form">
        <p class="field-hint">Choose area, then exact stop.</p>
        <label class="field">
          <span>Da / From</span>
          <div class="field-input-row">
            <input
              name="from"
              value="${fromInput}"
              placeholder="Porto Maurizio"
              autocomplete="off"
              list="from-options"
            />
            ${renderLocationButton('from')}
          </div>
          <datalist id="from-options">${fromSuggestionsMarkup}</datalist>
          <small>${fromHelp}</small>
        </label>

        <label class="field">
          <span>A / To</span>
          <div class="field-input-row">
            <input
              name="to"
              value="${toInput}"
              placeholder="Choose direct destination"
              autocomplete="off"
              ${toDisabled}
              list="to-destinations"
            />
            ${renderLocationButton('to')}
          </div>
          <datalist id="to-destinations">${destinationsMarkup}</datalist>
          <small>${destinationHelp}</small>
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
