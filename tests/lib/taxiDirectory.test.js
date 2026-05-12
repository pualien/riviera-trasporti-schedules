import { describe, expect, it } from 'vitest';
import { findTaxiOptionByProvince } from '../../src/lib/taxiDirectory.js';

describe('findTaxiOptionByProvince', () => {
  it('returns the curated Imperia and Savona taxi options', () => {
    expect(findTaxiOptionByProvince('imperia')).toMatchObject({
      provinceId: 'imperia',
      phone: '+39 0183 3785',
      sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
      verifiedAt: '2026-05-12',
    });

    expect(findTaxiOptionByProvince('savona')).toMatchObject({
      provinceId: 'savona',
      phone: '+39 328 7254729',
      sourceUrl: 'https://www.radiotaxialbenga.it/',
      verifiedAt: '2026-05-12',
    });
  });

  it('returns null for provinces without curated coverage', () => {
    expect(findTaxiOptionByProvince('genova')).toBeNull();
  });
});
