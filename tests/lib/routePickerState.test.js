import { describe, expect, it } from 'vitest';
import { selectLocality, selectOriginStop } from '../../src/lib/routePickerState.js';

describe('routePickerState', () => {
  it('clears the chosen destination when a new locality is selected', () => {
    const nextState = selectLocality(
      {
        formValues: {
          fromInput: 'Porto Maurizio',
          fromLocalityId: 'porto-maurizio',
          fromStopId: 'imperia-porto-maurizio',
          toInput: 'sanremo autostazione',
          toStopId: 'sanremo-autostazione',
        },
        pickerState: { exactStopChoices: [], reachableDestinations: [] },
      },
      { id: 'andora', label: 'Andora', stopIds: ['andora-stazione-fs'] },
      [{ id: 'andora-stazione-fs', canonical: 'andora stazione fs' }],
    );

    expect(nextState.formValues.fromLocalityId).toBe('andora');
    expect(nextState.formValues.toStopId).toBeNull();
    expect(nextState.formValues.toInput).toBe('');
  });

  it('hydrates reachable destinations after an exact origin stop is confirmed', () => {
    const nextState = selectOriginStop(
      {
        formValues: {
          fromInput: 'Porto Maurizio',
          fromLocalityId: 'porto-maurizio',
          fromStopId: null,
          toInput: '',
          toStopId: null,
        },
        pickerState: { exactStopChoices: [], reachableDestinations: [] },
      },
      { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
      { 'imperia-porto-maurizio': ['sanremo-autostazione'] },
      [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
    );

    expect(nextState.formValues.fromStopId).toBe('imperia-porto-maurizio');
    expect(nextState.pickerState.reachableDestinations).toEqual([
      { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
    ]);
  });
});
