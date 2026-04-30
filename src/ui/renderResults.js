const PDF_URL =
  'https://rivieratrasporti.it/images/_ORARI/2025-2026_Orario_Invernale_Generale_7%C2%AAVer_dal_01-04-2026.pdf';

function renderDepartureCard(departure) {
  return `
    <article class="departure-card">
      <div class="departure-main">
        <strong>${departure.departureTime}</strong>
        <p>Arrives ${departure.arrivalTime} · Linea ${departure.lineId}</p>
      </div>
      <div class="departure-meta">
        <span>${departure.durationMinutes} min</span>
        <a href="${PDF_URL}#page=${departure.sourcePage}" target="_blank" rel="noreferrer">Open PDF</a>
      </div>
    </article>
  `;
}

export function renderResultsView({ routeLabel, summary, nextDepartures, allDepartures }) {
  return `
    <section class="results-shell">
      <article class="summary-card">
        <div class="summary-head">
          <div>
            <p class="eyebrow">Route Summary</p>
            <h2>${routeLabel}</h2>
          </div>
          <div class="summary-lines">Linea ${summary.lines.join(', ')}</div>
        </div>

        <div class="metrics">
          <div class="metric">
            <span>Average</span>
            <strong>${summary.averageDurationMinutes} min</strong>
          </div>
          <div class="metric">
            <span>First</span>
            <strong>${summary.firstDeparture}</strong>
          </div>
          <div class="metric">
            <span>Last</span>
            <strong>${summary.lastDeparture}</strong>
          </div>
        </div>
      </article>

      <section class="results-section">
        <div class="section-head">
          <h3>Next departures</h3>
          <p>Le prossime corse dirette / Upcoming direct rides</p>
        </div>
        <div class="departure-list">
          ${nextDepartures.map(renderDepartureCard).join('')}
        </div>
      </section>

      <section class="results-section">
        <div class="section-head">
          <h3>All departures</h3>
          <p>Tutte le corse dirette per il giorno selezionato</p>
        </div>
        <div class="departure-list">
          ${allDepartures.map(renderDepartureCard).join('')}
        </div>
      </section>
    </section>
  `;
}
