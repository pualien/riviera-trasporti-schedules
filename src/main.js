import { buildRouteSummary, findDirectTrips } from './lib/query.js';
import { toMinutes } from './lib/time.js';
import { renderEmptyState } from './ui/renderEmptyState.js';
import { renderResultsView } from './ui/renderResults.js';
import { renderSearchForm } from './ui/renderSearchForm.js';

const app = document.querySelector('#app');

function currentMinutes() {
  const now = new Date();
  return (now.getHours() * 60) + now.getMinutes();
}

function nextDepartures(matches, count = 3) {
  const nowMinutes = currentMinutes();
  const upcoming = matches.filter((match) => toMinutes(match.departureTime) >= nowMinutes);
  const source = upcoming.length ? upcoming : matches;
  return source.slice(0, count);
}

function renderShell(content) {
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div>
          <p class="brand-kicker">Riviera Transit</p>
          <p class="brand-subtitle">Official PDF, clearer consultation</p>
        </div>
        <a class="topbar-link" href="https://rivieratrasporti.it/" target="_blank" rel="noreferrer">
          Riviera Trasporti
        </a>
      </header>
      ${content}
    </div>
  `;
}

function bindForm({ trips, aliases, values }) {
  const form = document.querySelector('#route-form');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const state = {
      from: String(formData.get('from') ?? ''),
      to: String(formData.get('to') ?? ''),
      dayType: String(formData.get('dayType') ?? 'feriale'),
    };

    const matches = findDirectTrips({
      from: state.from,
      to: state.to,
      dayType: state.dayType,
      aliases,
      trips,
    });

    if (!matches.length) {
      renderShell(
        `
          ${renderSearchForm(state)}
          ${renderEmptyState('Try another stop alias, browse the official PDF, or adjust the day type.')}
        `,
      );
      bindForm({ trips, aliases, values: state });
      return;
    }

    renderShell(
      `
        ${renderSearchForm(state)}
        ${renderResultsView({
          routeLabel: `${state.from} -> ${state.to}`,
          summary: buildRouteSummary(matches),
          nextDepartures: nextDepartures(matches),
          allDepartures: matches,
        })}
      `,
    );
    bindForm({ trips, aliases, values: state });
  });

  if (values) {
    form.querySelector('[name="from"]').value = values.from;
    form.querySelector('[name="to"]').value = values.to;
    form.querySelector('[name="dayType"]').value = values.dayType;
  }
}

async function boot() {
  try {
    const [trips, stops] = await Promise.all([
      fetch('./assets/data/trips.json').then((response) => response.json()),
      fetch('./assets/data/stops.json').then((response) => response.json()),
    ]);

    const aliases = Object.fromEntries(stops.map((stop) => [stop.canonical, stop.variants]));

    renderShell(renderSearchForm());
    bindForm({ trips, aliases });
  } catch (error) {
    renderShell(
      renderEmptyState(
        'The timetable data is not available yet. Run the static data build before publishing this page.',
      ),
    );
    console.error(error);
  }
}

boot();
