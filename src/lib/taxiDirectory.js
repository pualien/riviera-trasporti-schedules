import { normalizeText } from './normalize.js';

function createTaxiOption({
  phones = [],
  coverageLabels = [],
  coverageStopIds = [],
  coverageMatchTokens = [],
  provinceFallback = false,
  ...entry
}) {
  const [primaryPhone] = phones;

  return {
    ...entry,
    phone: entry.phone ?? primaryPhone?.label ?? null,
    callHref: entry.callHref ?? primaryPhone?.href ?? null,
    phones,
    coverageLabels,
    coverageStopIds,
    coverageMatchTokens: coverageMatchTokens.map((token) => normalizeText(token)),
    provinceFallback,
  };
}

const TAXI_SERVICES = [
  createTaxiOption({
    serviceId: 'taxi-imperia',
    provinceId: 'imperia',
    provinceLabel: 'Provincia di Imperia',
    serviceLabel: 'Taxi Imperia',
    phones: [
      {
        label: '+39 0183 3785',
        href: 'tel:+3901833785',
      },
    ],
    sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
    verifiedAt: '2026-05-13',
    coverageLabels: ['Imperia', 'Porto Maurizio'],
    coverageStopIds: [
      'imperia-porto-maurizio',
      'porto-maurizio-pensilina',
      'porto-maurizio-pens',
      'imperia-p-maurizio-colla-san-bartolomeo',
      'imperia-oneglia',
      'imperia-on',
      'imperia-pm-igiene',
    ],
    coverageMatchTokens: [
      'imperia porto maurizio',
      'porto maurizio',
      'imperia oneglia',
      'imperia on',
      'imperia pm',
    ],
    provinceFallback: true,
  }),
  createTaxiOption({
    serviceId: 'mauro-taxi-diano-marina',
    provinceId: 'imperia',
    provinceLabel: 'Provincia di Imperia',
    serviceLabel: 'Mauro Taxi Diano Marina',
    phones: [
      {
        label: '+39 347 0439704',
        href: 'tel:+393470439704',
      },
    ],
    bookingUrl: 'https://maurotaxi.it/it/',
    sourceUrl: 'https://maurotaxi.it/it/',
    verifiedAt: '2026-05-13',
    coverageLabels: ['Diano Marina'],
    coverageStopIds: [
      'diano-marina',
      'd-marina-via-cesare-battisti-capolinea',
      'd-marina-vecchia-stazione',
    ],
    coverageMatchTokens: ['diano marina', 'd marina'],
  }),
  createTaxiOption({
    serviceId: 'radio-taxi-sanremo',
    provinceId: 'imperia',
    provinceLabel: 'Provincia di Imperia',
    serviceLabel: 'Radio Taxi Sanremo',
    phones: [
      {
        label: '+39 0184 541454',
        href: 'tel:+390184541454',
      },
    ],
    bookingUrl: 'https://radiotaxisanremo.com/',
    sourceUrl: 'https://radiotaxisanremo.com/',
    verifiedAt: '2026-05-13',
    coverageLabels: ['Sanremo', 'Arma di Taggia', 'Taggia'],
    coverageStopIds: [
      'sanremo-s-martino-stadio',
      'sanremo-autostazione',
      'sanremo-partenza',
      'sanremo-arrivo',
      'arma-di-taggia',
      'arma-di-taggia-rossat',
      'taggia-stazione-fs',
      'taggia-capolinea',
      'taggia',
    ],
    coverageMatchTokens: ['sanremo', 'arma di taggia', 'taggia'],
  }),
  createTaxiOption({
    serviceId: 'taxi-ventimiglia',
    provinceId: 'imperia',
    provinceLabel: 'Provincia di Imperia',
    serviceLabel: 'Taxi Ventimiglia',
    phones: [
      {
        label: '+39 0184 19611',
        href: 'tel:+39018419611',
      },
    ],
    sourceUrl: 'https://www.comune.ventimiglia.im.it/it-it/novita/avvisi/2024/nuovo-servizio-di-prenotazione-taxi-305272-1-49bb2c42152864a612c5c33db14b9bb7',
    verifiedAt: '2026-05-13',
    coverageLabels: ['Ventimiglia'],
    coverageMatchTokens: ['ventimiglia'],
  }),
  createTaxiOption({
    serviceId: 'taxi-bordighera',
    provinceId: 'imperia',
    provinceLabel: 'Provincia di Imperia',
    serviceLabel: 'Taxi Bordighera',
    phones: [
      {
        label: '+39 0184 261574',
        href: 'tel:+390184261574',
      },
    ],
    bookingUrl: 'https://taxibordighera.com/',
    sourceUrl: 'https://taxibordighera.com/',
    verifiedAt: '2026-05-13',
    coverageLabels: ['Bordighera'],
    coverageMatchTokens: ['bordighera'],
  }),
  createTaxiOption({
    serviceId: 'radio-taxi-albenga',
    provinceId: 'savona',
    provinceLabel: 'Provincia di Savona',
    serviceLabel: 'Radio Taxi Albenga',
    phones: [
      {
        label: '+39 328 7254729',
        href: 'tel:+393287254729',
      },
      {
        label: '+39 0182 0303',
        href: 'tel:+3901820303',
      },
    ],
    bookingUrl: 'https://www.radiotaxialbenga.it/contatti',
    sourceUrl: 'https://www.radiotaxialbenga.it/',
    verifiedAt: '2026-05-13',
    coverageLabels: ['Andora', 'Albenga'],
    coverageStopIds: [
      'andora-bivio-ss1-per-a10',
      'andora-stazione-fs',
      'andora-rotonda-s-s-1',
      'andora-fs',
      'albenga',
    ],
    coverageMatchTokens: ['andora', 'albenga'],
    provinceFallback: true,
  }),
];

const PROVINCE_FALLBACKS = new Map(
  TAXI_SERVICES
    .filter((entry) => entry.provinceFallback)
    .map((entry) => [entry.provinceId, entry]),
);

function stopMatchesCoverage(stop, entry) {
  if (!stop) {
    return false;
  }

  if (entry.coverageStopIds.includes(stop.id)) {
    return true;
  }

  const stopTokens = [
    stop.canonical,
    ...(stop.variants ?? []),
  ]
    .map((token) => normalizeText(token))
    .filter(Boolean);

  return stopTokens.some((stopToken) =>
    entry.coverageMatchTokens.some((coverageToken) =>
      stopToken === coverageToken
      || stopToken.startsWith(`${coverageToken} `)
      || stopToken.includes(` ${coverageToken} `)
      || stopToken.includes(coverageToken),
    ));
}

export function findTaxiOptionByStop(stop) {
  return TAXI_SERVICES.find((entry) => stopMatchesCoverage(stop, entry)) ?? null;
}

export function findTaxiOptionByProvince(provinceId) {
  return PROVINCE_FALLBACKS.get(provinceId) ?? null;
}

export function listTaxiOptions() {
  return TAXI_SERVICES;
}
