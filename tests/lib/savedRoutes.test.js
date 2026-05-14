import { describe, expect, it } from 'vitest';
import {
  addFavoriteRoute,
  addRecentRoute,
  createRouteIdentity,
  readSavedRoutes,
  removeFavoriteRoute,
} from '../../src/lib/savedRoutes.js';

function createStorage(initialValue = null) {
  const values = new Map();
  if (initialValue) {
    values.set('riviera:saved-routes', JSON.stringify(initialValue));
  }
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const route = {
  fromInput: 'Porto Maurizio',
  fromLocalityId: 'porto-maurizio',
  fromStopId: null,
  toInput: 'Sanremo Autostazione',
  toStopId: 'sanremo-autostazione',
  dayType: 'feriale',
  resultType: 'results',
  resultCount: 4,
  timestamp: '2026-05-14T09:00:00.000Z',
};

describe('savedRoutes', () => {
  it('builds a stable route identity from ids and labels', () => {
    expect(createRouteIdentity(route)).toBe('porto-maurizio||Sanremo Autostazione|sanremo-autostazione|feriale');
  });

  it('adds recent routes newest first and dedupes by identity', () => {
    const storage = createStorage();
    addRecentRoute(storage, route);
    addRecentRoute(storage, { ...route, timestamp: '2026-05-14T10:00:00.000Z', resultCount: 2 });

    expect(readSavedRoutes(storage).recents).toHaveLength(1);
    expect(readSavedRoutes(storage).recents[0]).toMatchObject({
      timestamp: '2026-05-14T10:00:00.000Z',
      resultCount: 2,
    });
  });

  it('caps favorites and recents at 8 entries', () => {
    const storage = createStorage();
    for (let index = 0; index < 10; index += 1) {
      addRecentRoute(storage, { ...route, toInput: `Stop ${index}`, toStopId: `stop-${index}` });
      addFavoriteRoute(storage, { ...route, toInput: `Fav ${index}`, toStopId: `fav-${index}` });
    }

    expect(readSavedRoutes(storage).recents).toHaveLength(8);
    expect(readSavedRoutes(storage).favorites).toHaveLength(8);
  });

  it('removes favorites by identity', () => {
    const storage = createStorage();
    addFavoriteRoute(storage, route);
    removeFavoriteRoute(storage, createRouteIdentity(route));

    expect(readSavedRoutes(storage).favorites).toEqual([]);
  });

  it('returns empty lists when storage is unavailable', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    expect(readSavedRoutes(storage)).toEqual({ favorites: [], recents: [], available: false });
  });
});
