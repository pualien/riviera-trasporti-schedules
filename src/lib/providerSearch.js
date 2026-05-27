export const PROVIDER_SEARCH_TABS = ['trains', 'flixbus', 'blablacar'];

export const PROVIDER_SEARCH_SOURCES = Object.freeze({
  trains: 'https://dati.regione.liguria.it/dataset/ds-637',
  flixbus: 'https://mobilitydatabase.org/feeds/gtfs/tdg-11681',
  blablacar: 'https://www.blablacar.it/search-car-sharing',
});

const DEFAULT_PROVIDER_SEARCH_VALUES = Object.freeze({
  from: '',
  to: '',
  date: '',
});

const PROVIDER_HOME_URLS = Object.freeze({
  trains: 'https://www.lefrecce.it/',
  flixbus: 'https://www.flixbus.it/',
  blablacar: 'https://www.blablacar.it/search-car-sharing',
});

const FLIXBUS_CITIES = Object.freeze({
  alassio: '83207e26-6672-4b11-b7ad-ff07d8189e77',
  albenga: '4d86cced-82b4-4be4-8a9c-9b28c4f443a5',
  'diano marina': '873217d6-1cc3-4464-8cae-217f63d56456',
  diano: '873217d6-1cc3-4464-8cae-217f63d56456',
  genoa: '40df4521-8646-11e6-9066-549f350fcb0c',
  genova: '40df4521-8646-11e6-9066-549f350fcb0c',
  'genova principe': '40df4521-8646-11e6-9066-549f350fcb0c',
  'genova piazza principe': '40df4521-8646-11e6-9066-549f350fcb0c',
  imperia: '0f1a2bda-42d4-4417-808d-2da7d4a98201',
  sanremo: '83f11a76-676c-4cd0-ae59-668e1a716496',
  'san remo': '83f11a76-676c-4cd0-ae59-668e1a716496',
  savona: '40e2b7ad-8646-11e6-9066-549f350fcb0c',
  'savona stazione fs': '40e2b7ad-8646-11e6-9066-549f350fcb0c',
  ventimiglia: '32183c0e-909d-48ce-8c32-7a0f77b4db5c',
});

export function isProviderSearchTab(tab) {
  return PROVIDER_SEARCH_TABS.includes(tab);
}

export function createDefaultProviderSearchState() {
  return Object.fromEntries(
    PROVIDER_SEARCH_TABS.map((provider) => [provider, { ...DEFAULT_PROVIDER_SEARCH_VALUES }]),
  );
}

export function updateProviderSearchState(state, provider, values = {}) {
  if (!isProviderSearchTab(provider)) {
    return state;
  }

  return {
    ...state,
    [provider]: {
      ...DEFAULT_PROVIDER_SEARCH_VALUES,
      ...state?.[provider],
      from: String(values.from ?? state?.[provider]?.from ?? ''),
      to: String(values.to ?? state?.[provider]?.to ?? ''),
      date: String(values.date ?? state?.[provider]?.date ?? ''),
    },
  };
}

function normalizePlace(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function isIsoDate(value = '') {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatProviderDate(value = '', separator = '-') {
  if (!isIsoDate(value)) {
    return '';
  }

  const [year, month, day] = value.split('-');
  return [day, month, year].join(separator);
}

function buildTrenitaliaSearchUrl(values) {
  if (!values.from?.trim() || !values.to?.trim()) {
    return PROVIDER_HOME_URLS.trains;
  }

  const departureDate = formatProviderDate(values.date, '-');
  const params = new URLSearchParams({
    action: 'searchTickets',
    lang: 'itit',
    departureStation: values.from.trim(),
    arrivalStation: values.to.trim(),
  });

  if (departureDate) {
    params.set('departureDate', departureDate);
  }

  params.set('departureTime', '08');
  params.set('noOfAdults', '1');
  params.set('noOfChildren', '0');

  return `https://www.lefrecce.it/Channels.Website.WEB/website/auth/handoff?${params.toString()}`;
}

function buildFlixBusSearchUrl(values) {
  const departureCity = FLIXBUS_CITIES[normalizePlace(values.from)];
  const arrivalCity = FLIXBUS_CITIES[normalizePlace(values.to)];

  if (!departureCity || !arrivalCity) {
    return PROVIDER_HOME_URLS.flixbus;
  }

  const params = new URLSearchParams({
    departureCity,
    arrivalCity,
  });

  const rideDate = formatProviderDate(values.date, '.');

  if (rideDate) {
    params.set('rideDate', rideDate);
  }

  params.set('adult', '1');
  params.set('_locale', 'it');

  return `https://shop.flixbus.it/search?${params.toString()}`;
}

function buildBlaBlaCarSearchUrl(values) {
  const params = new URLSearchParams();

  if (values.from?.trim()) {
    params.set('fn', values.from.trim());
  }

  if (values.to?.trim()) {
    params.set('tn', values.to.trim());
  }

  if (isIsoDate(values.date)) {
    params.set('db', values.date);
  }

  params.set('seats', '1');

  return `${PROVIDER_HOME_URLS.blablacar}?${params.toString()}`;
}

export function buildProviderSearchUrl(provider, values = DEFAULT_PROVIDER_SEARCH_VALUES) {
  if (provider === 'flixbus') {
    return buildFlixBusSearchUrl(values);
  }

  if (provider === 'blablacar') {
    return buildBlaBlaCarSearchUrl(values);
  }

  if (provider === 'trains') {
    return buildTrenitaliaSearchUrl(values);
  }

  return PROVIDER_HOME_URLS[provider] ?? PROVIDER_HOME_URLS.trains;
}
