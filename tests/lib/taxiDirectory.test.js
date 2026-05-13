import { describe, expect, it } from 'vitest';
import {
  findTaxiOptionByProvince,
  findTaxiOptionByStop,
  listTaxiOptions,
} from '../../src/lib/taxiDirectory.js';

describe('findTaxiOptionByProvince', () => {
  it('returns the curated province fallback taxi options', () => {
    expect(findTaxiOptionByProvince('imperia')).toMatchObject({
      serviceId: 'taxi-imperia',
      provinceId: 'imperia',
      phone: '+39 0183 3785',
      sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
      verifiedAt: '2026-05-13',
    });

    expect(findTaxiOptionByProvince('savona')).toMatchObject({
      serviceId: 'radio-taxi-albenga',
      provinceId: 'savona',
      phone: '+39 328 7254729',
      sourceUrl: 'https://www.radiotaxialbenga.it/',
      verifiedAt: '2026-05-13',
    });
  });

  it('returns null for provinces without curated coverage', () => {
    expect(findTaxiOptionByProvince('genova')).toBeNull();
  });

  it('returns destination-specific verified services by stop coverage', () => {
    expect(findTaxiOptionByStop({
      id: 'diano-marina',
      canonical: 'diano marina',
      variants: [],
    })).toMatchObject({
      serviceId: 'mauro-taxi-diano-marina',
      serviceLabel: 'Mauro Taxi Diano Marina',
      phone: '+39 347 0439704',
    });

    expect(findTaxiOptionByStop({
      id: 'arma-di-taggia',
      canonical: 'arma di taggia',
      variants: [],
    })).toMatchObject({
      serviceId: 'radio-taxi-sanremo',
      serviceLabel: 'Radio Taxi Sanremo',
      phone: '+39 0184 541454',
    });

    expect(findTaxiOptionByStop({
      id: 'andora-stazione-fs',
      canonical: 'andora stazione fs',
      variants: [],
    })).toMatchObject({
      serviceId: 'radio-taxi-albenga',
      serviceLabel: 'Radio Taxi Albenga',
      phone: '+39 328 7254729',
    });
  });

  it('lists all curated taxi options for the shell directory section', () => {
    const services = listTaxiOptions();

    expect(services.map((entry) => entry.serviceId)).toEqual([
      'taxi-imperia',
      'mauro-taxi-diano-marina',
      'radio-taxi-sanremo',
      'taxi-ventimiglia',
      'taxi-bordighera',
      'radio-taxi-albenga',
    ]);

    expect(services.find((entry) => entry.serviceId === 'radio-taxi-sanremo')).toMatchObject({
      coverageLabels: ['Sanremo', 'Arma di Taggia', 'Taggia'],
    });

    expect(services.find((entry) => entry.serviceId === 'radio-taxi-albenga')).toMatchObject({
      coverageLabels: ['Andora', 'Albenga'],
    });
  });
});
