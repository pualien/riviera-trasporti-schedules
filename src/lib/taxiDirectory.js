const TAXI_DIRECTORY = {
  imperia: {
    provinceId: 'imperia',
    provinceLabel: 'Provincia di Imperia',
    serviceLabel: 'Taxi Imperia',
    phone: '+39 0183 3785',
    callHref: 'tel:+3901833785',
    bookingUrl: null,
    sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
    verifiedAt: '2026-05-12',
  },
  savona: {
    provinceId: 'savona',
    provinceLabel: 'Provincia di Savona',
    serviceLabel: 'Radio Taxi Albenga',
    phone: '+39 328 7254729',
    callHref: 'tel:+393287254729',
    bookingUrl: 'https://www.taxialbenga.it/contatti/',
    sourceUrl: 'https://www.radiotaxialbenga.it/',
    verifiedAt: '2026-05-12',
  },
};

export function findTaxiOptionByProvince(provinceId) {
  return TAXI_DIRECTORY[provinceId] ?? null;
}
