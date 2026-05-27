import { createTranslator } from '../lib/i18n.js';
import { normalizeText } from '../lib/normalize.js';

const STOP_LIST_LIMIT = 48;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function compareLineIds(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true });
}

function normalizedQuery(query = '') {
  return normalizeText(query).trim();
}

function lineMatchesQuery(line, query) {
  if (!query) {
    return true;
  }

  return [
    line.lineId,
    ...(line.directions ?? []),
    ...(line.stops ?? []).map((stop) => stop.canonical),
  ].some((value) => normalizeText(value).includes(query));
}

function stopMatchesQuery(stop, query) {
  if (!query) {
    return true;
  }

  return [
    stop.canonical,
    ...(stop.lines ?? []),
  ].some((value) => normalizeText(value).includes(query));
}

function lineGroupFor(lineId, t) {
  const match = String(lineId ?? '').match(/\d+/);

  if (!match) {
    return {
      key: 'other',
      label: t('browse.otherGroup'),
      rank: Number.MAX_SAFE_INTEGER,
    };
  }

  const number = Number(match[0]);
  const start = number < 10 ? 1 : Math.floor(number / 10) * 10;
  const end = number < 10 ? 9 : start + 9;

  return {
    key: `line-${start}`,
    label: t('browse.lineGroup', { range: `${start}-${end}` }),
    rank: start,
  };
}

function stopGroupFor(stop, t) {
  const letter = (String(stop.canonical ?? '').trim().match(/[a-z0-9]/i)?.[0] ?? '#').toUpperCase();

  return {
    key: `stop-${letter}`,
    label: letter === '#'
      ? t('browse.otherGroup')
      : t('browse.stopGroup', { letter }),
    rank: letter === '#' ? Number.MAX_SAFE_INTEGER : letter.charCodeAt(0),
  };
}

function groupItems(items, getGroup) {
  const groups = new Map();

  for (const item of items) {
    const group = getGroup(item);

    if (!groups.has(group.key)) {
      groups.set(group.key, {
        ...group,
        items: [],
      });
    }

    groups.get(group.key).items.push(item);
  }

  return [...groups.values()].sort((left, right) => left.rank - right.rank || compareText(left.label, right.label));
}

function renderStopActions(stop, t) {
  return `
    <div class="browse-stop-actions">
      <button type="button" data-search-from-stop="${escapeHtml(stop.id)}">
        ${escapeHtml(t('browse.searchFromHere'))}
      </button>
      <button type="button" data-search-to-stop="${escapeHtml(stop.id)}">
        ${escapeHtml(t('browse.searchToHere'))}
      </button>
    </div>
  `;
}

function renderLineDetail({ selectedLine, t }) {
  if (!selectedLine) {
    return `<p class="browse-empty-detail">${escapeHtml(t('browse.selectLine'))}</p>`;
  }

  return `
    <div class="browse-detail">
      <h3>${escapeHtml(t('results.line'))} ${escapeHtml(selectedLine.lineId)}</h3>
      <ul>
        ${selectedLine.directions.map((direction) => `<li>${escapeHtml(direction)}</li>`).join('')}
      </ul>
      <div class="browse-stop-list">
        ${selectedLine.stops.map((stop) => `
          <div class="browse-stop-row">
            <strong>${escapeHtml(stop.canonical)}</strong>
            ${renderStopActions(stop, t)}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStopDetail({ selectedStop, t }) {
  if (!selectedStop) {
    return `<p class="browse-empty-detail">${escapeHtml(t('browse.selectStop'))}</p>`;
  }

  return `
    <div class="browse-detail">
      <h3>${escapeHtml(selectedStop.canonical)}</h3>
      <ul>
        ${selectedStop.lines.map((lineId) => `
          <li>${escapeHtml(t('results.line'))} ${escapeHtml(lineId)}</li>
        `).join('')}
      </ul>
      ${renderStopActions(selectedStop, t)}
    </div>
  `;
}

function renderLineButton(line, selectedLineId, t) {
  const directionSummary = line.directions.slice(0, 2).join(' / ');

  return `
    <button
      type="button"
      data-browse-line="${escapeHtml(line.lineId)}"
      ${line.lineId === selectedLineId ? 'aria-current="page"' : ''}
    >
      <span class="browse-row-copy">
        <strong>${escapeHtml(t('results.line'))} ${escapeHtml(line.lineId)}</strong>
        ${directionSummary ? `<small>${escapeHtml(directionSummary)}</small>` : ''}
      </span>
    </button>
  `;
}

function renderStopButton(stop, selectedStopId, t) {
  return `
    <button
      type="button"
      data-browse-stop="${escapeHtml(stop.id)}"
      ${stop.id === selectedStopId ? 'aria-current="page"' : ''}
    >
      <span class="browse-row-copy">
        <strong>${escapeHtml(stop.canonical)}</strong>
        <small>${escapeHtml(stop.lines.map((lineId) => `${t('results.line')} ${lineId}`).join(', '))}</small>
      </span>
    </button>
  `;
}

function renderGroups(groups, renderItem) {
  if (!groups.length) {
    return '';
  }

  return groups
    .map((group) => `
      <section class="browse-group">
        <h3>${escapeHtml(group.label)}</h3>
        <div class="browse-group-list">
          ${group.items.map(renderItem).join('')}
        </div>
      </section>
    `)
    .join('');
}

function renderListMessage(message) {
  return message ? `<p class="browse-list-message">${escapeHtml(message)}</p>` : '';
}

function renderBrowseFilter({ activeMode, query, visibleCount, totalCount, t }) {
  const filterLabel = activeMode === 'stops'
    ? t('browse.filterStops')
    : t('browse.filterLines');
  const placeholder = activeMode === 'stops'
    ? t('browse.filterStopsPlaceholder')
    : t('browse.filterLinesPlaceholder');
  const summary = query
    ? t('browse.filteredCount', { visible: visibleCount, total: totalCount })
    : (visibleCount < totalCount
      ? t('browse.limitedStops', { visible: visibleCount, total: totalCount })
      : t('browse.totalCount', { total: totalCount }));

  return `
    <label class="browse-filter">
      <span>${escapeHtml(filterLabel)}</span>
      <input
        name="browseFilter"
        type="search"
        value="${escapeHtml(query)}"
        placeholder="${escapeHtml(placeholder)}"
        autocomplete="off"
        data-browse-filter
      />
    </label>
    <p class="browse-count">${escapeHtml(summary)}</p>
  `;
}

function renderLineMode({ browseIndex, selectedLineId, query, t }) {
  const selectedLine = browseIndex.lines.find((line) => line.lineId === selectedLineId) ?? null;
  const normalized = normalizedQuery(query);
  const filteredLines = browseIndex.lines
    .filter((line) => lineMatchesQuery(line, normalized))
    .sort((left, right) => compareLineIds(left.lineId, right.lineId));
  const groups = groupItems(filteredLines, (line) => lineGroupFor(line.lineId, t));

  return `
    ${renderBrowseFilter({
      activeMode: 'lines',
      query,
      visibleCount: filteredLines.length,
      totalCount: browseIndex.lines.length,
      t,
    })}
    <div class="browse-layout">
      <div class="browse-list">
        ${renderGroups(groups, (line) => renderLineButton(line, selectedLineId, t))}
        ${renderListMessage(filteredLines.length ? '' : t('browse.noMatches'))}
      </div>
      ${renderLineDetail({ selectedLine, t })}
    </div>
  `;
}

function renderStopMode({ browseIndex, selectedStopId, query, t }) {
  const selectedStop = browseIndex.stops.find((stop) => stop.id === selectedStopId) ?? null;
  const normalized = normalizedQuery(query);
  const filteredStops = browseIndex.stops
    .filter((stop) => stopMatchesQuery(stop, normalized))
    .sort((left, right) => compareText(left.canonical, right.canonical));
  const visibleStops = normalized ? filteredStops : filteredStops.slice(0, STOP_LIST_LIMIT);
  const groups = groupItems(visibleStops, (stop) => stopGroupFor(stop, t));

  return `
    ${renderBrowseFilter({
      activeMode: 'stops',
      query,
      visibleCount: visibleStops.length,
      totalCount: browseIndex.stops.length,
      t,
    })}
    <div class="browse-layout">
      <div class="browse-list">
        ${renderGroups(groups, (stop) => renderStopButton(stop, selectedStopId, t))}
        ${renderListMessage(visibleStops.length ? '' : t('browse.noMatches'))}
      </div>
      ${renderStopDetail({ selectedStop, t })}
    </div>
  `;
}

export function renderBrowseView({
  t = createTranslator('en'),
  browseIndex = { lines: [], stops: [] },
  mode = 'lines',
  selectedLineId = null,
  selectedStopId = null,
  query = '',
} = {}) {
  const activeMode = mode === 'stops' ? 'stops' : 'lines';

  return `
    <section class="browse-view">
      <div>
        <p class="eyebrow">${escapeHtml(t('tabs.browse'))}</p>
        <h2>${escapeHtml(t('browse.title'))}</h2>
        <p>${escapeHtml(t('browse.subtitle'))}</p>
      </div>
      <div class="browse-mode-switch">
        <button type="button" data-browse-mode="lines" ${activeMode === 'lines' ? 'aria-current="page"' : ''}>
          ${escapeHtml(t('browse.lines'))}
        </button>
        <button type="button" data-browse-mode="stops" ${activeMode === 'stops' ? 'aria-current="page"' : ''}>
          ${escapeHtml(t('browse.stops'))}
        </button>
      </div>
      ${activeMode === 'lines'
        ? renderLineMode({ browseIndex, selectedLineId, query, t })
        : renderStopMode({ browseIndex, selectedStopId, query, t })}
    </section>
  `;
}
