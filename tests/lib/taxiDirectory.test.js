import { describe, expect, it } from 'vitest';
import { findTaxiOptionByProvince, listTaxiOptions } from '../../src/lib/taxiDirectory.js';

describe('findTaxiOptionByProvince', () => {
  it('returns the curated Imperia and Savona taxi options', () => {
    expect(findTaxiOptionByProvince('imperia')).toMatchObject({
      provinceId: 'imperia',
      phone: '+39 0183 3785',
      phones: [
        {
          label: '+39 0183 3785',
          href: 'tel:+3901833785',
        },
      ],
      sourceUrl: 'https://www.comune.imperia.it/it/page/taxi-imperia',
      verifiedAt: '2026-05-12',
    });

    expect(findTaxiOptionByProvince('savona')).toMatchObject({
      provinceId: 'savona',
      phone: '+39 328 7254729',
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
      sourceUrl: 'https://www.radiotaxialbenga.it/',
      verifiedAt: '2026-05-12',
    });
  });

  it('returns null for provinces without curated coverage', () => {
    expect(findTaxiOptionByProvince('genova')).toBeNull();
  });

  it('lists all curated taxi options for the shell directory section', () => {
    expect(listTaxiOptions()).toHaveLength(2);
    expect(listTaxiOptions().map((entry) => entry.provinceId)).toEqual(['imperia', 'savona']);
  });
});
