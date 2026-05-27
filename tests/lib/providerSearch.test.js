import { describe, expect, it } from 'vitest';
import {
  buildProviderSearchUrl,
  createDefaultProviderSearchState,
  updateProviderSearchState,
} from '../../src/lib/providerSearch.js';

describe('providerSearch', () => {
  it('creates isolated default search state for each external provider', () => {
    expect(createDefaultProviderSearchState()).toEqual({
      trains: { from: '', to: '', date: '' },
      flixbus: { from: '', to: '', date: '' },
      blablacar: { from: '', to: '', date: '' },
    });
  });

  it('updates one provider search without leaking values into the others', () => {
    const updated = updateProviderSearchState(createDefaultProviderSearchState(), 'flixbus', {
      from: 'Sanremo',
      to: 'Ventimiglia',
      date: '2026-06-01',
    });

    expect(updated.flixbus).toEqual({
      from: 'Sanremo',
      to: 'Ventimiglia',
      date: '2026-06-01',
    });
    expect(updated.trains.from).toBe('');
    expect(updated.blablacar.to).toBe('');
  });

  it('builds a Trenitalia handoff URL with the typed route and travel date', () => {
    const url = buildProviderSearchUrl('trains', {
      from: 'Imperia',
      to: 'Sanremo',
      date: '2026-06-01',
    });

    expect(url).toBe('https://www.lefrecce.it/Channels.Website.WEB/website/auth/handoff?action=searchTickets&lang=itit&departureStation=Imperia&arrivalStation=Sanremo&departureDate=01-06-2026&departureTime=08&noOfAdults=1&noOfChildren=0');
  });

  it('builds a prefilled FlixBus shop search with FlixBus city UUIDs and date format', () => {
    const url = buildProviderSearchUrl('flixbus', {
      from: 'Sanremo',
      to: 'Ventimiglia',
      date: '2026-06-01',
    });

    expect(url).toBe('https://shop.flixbus.it/search?departureCity=83f11a76-676c-4cd0-ae59-668e1a716496&arrivalCity=32183c0e-909d-48ce-8c32-7a0f77b4db5c&rideDate=01.06.2026&adult=1&_locale=it');
  });

  it('falls back to provider search pages when a route cannot be safely prefilled', () => {
    expect(buildProviderSearchUrl('trains', {
      from: '',
      to: 'Sanremo',
      date: '2026-06-01',
    })).toBe('https://www.lefrecce.it/');

    expect(buildProviderSearchUrl('flixbus', {
      from: 'Unknown',
      to: 'Sanremo',
      date: '2026-06-01',
    })).toBe('https://www.flixbus.it/');
  });

  it('builds a BlaBlaCar search handoff with the typed places and date', () => {
    const url = buildProviderSearchUrl('blablacar', {
      from: 'Genova',
      to: 'Milano',
      date: '2026-06-01',
    });

    expect(url).toBe('https://www.blablacar.it/search-car-sharing?fn=Genova&tn=Milano&db=2026-06-01&seats=1');
  });
});
