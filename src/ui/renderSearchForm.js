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
  dayType = 'feriale',
} = {}) {
  return `
    <section class="hero-shell">
      <div class="hero-copy">
        <p class="eyebrow">Direct Route Lookup</p>
        <h1>Find buses from Porto Maurizio to Sanremo.</h1>
        <p class="hero-text">
          Search the official Riviera Trasporti winter timetable with a clearer route-first view.
          See the next departures now, then the full direct timetable for the selected day type.
        </p>
      </div>

      <form id="route-form" class="search-form">
        <label class="field">
          <span>Da / From</span>
          <div class="field-input-row">
            <input name="from" value="${from}" placeholder="Porto Maurizio" autocomplete="off" />
            ${renderLocationButton('from')}
          </div>
        </label>

        <label class="field">
          <span>A / To</span>
          <div class="field-input-row">
            <input name="to" value="${to}" placeholder="Sanremo" autocomplete="off" />
            ${renderLocationButton('to')}
          </div>
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
