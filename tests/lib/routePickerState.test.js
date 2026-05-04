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
      {},
      [],
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

  it('unlocks locality-wide destinations as soon as a broad area is selected', () => {
    const nextState = selectLocality(
      {
        formValues: {
          fromInput: '',
          fromLocalityId: null,
          fromStopId: null,
          toInput: '',
          toStopId: null,
        },
        pickerState: { exactStopChoices: [], reachableDestinations: [] },
      },
      { id: 'porto-maurizio', label: 'Porto Maurizio', stopIds: ['imperia-porto-maurizio'] },
      [
        { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
        { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
      ],
      { 'imperia-porto-maurizio': ['sanremo-autostazione'] },
      [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
    );

    expect(nextState.formValues.fromInput).toBe('Porto Maurizio');
    expect(nextState.pickerState.reachableDestinations).toEqual([
      { id: 'sanremo-autostazione', canonical: 'sanremo autostazione' },
    ]);
  });

  it('replaces the broad area label with the exact stop name when refinement is chosen', () => {
    const nextState = selectOriginStop(
      {
        formValues: {
          fromInput: 'Porto Maurizio',
          fromLocalityId: 'porto-maurizio',
          fromStopId: null,
          toInput: 'sanremo autostazione',
          toStopId: 'sanremo-autostazione',
        },
        pickerState: {
          exactStopChoices: [{ id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' }],
          reachableDestinations: [{ id: 'sanremo-autostazione', canonical: 'sanremo autostazione' }],
        },
      },
      { id: 'imperia-porto-maurizio', canonical: 'imperia porto maurizio' },
      { 'imperia-porto-maurizio': ['taggia-stazione'] },
      [{ id: 'taggia-stazione', canonical: 'taggia stazione' }],
    );

    expect(nextState.formValues.fromInput).toBe('imperia porto maurizio');
    expect(nextState.formValues.toInput).toBe('');
    expect(nextState.formValues.toStopId).toBeNull();
    expect(nextState.pickerState.reachableDestinations).toEqual([
      { id: 'taggia-stazione', canonical: 'taggia stazione' },
    ]);
  });
});
