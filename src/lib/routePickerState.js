import { getLocalityStops, getReachableStops } from './localities.js';

export function selectLocality(state, locality, stops) {
  return {
    ...state,
    formValues: {
      ...state.formValues,
      fromInput: locality.label,
      fromLocalityId: locality.id,
      fromStopId: null,
      toInput: '',
      toStopId: null,
    },
    pickerState: {
      ...state.pickerState,
      exactStopChoices: getLocalityStops(locality.id, [locality], stops),
      reachableDestinations: [],
    },
  };
}

export function selectOriginStop(state, stop, reachability, stops) {
  return {
    ...state,
    formValues: {
      ...state.formValues,
      fromInput: stop.canonical,
      fromStopId: stop.id,
      toInput: '',
      toStopId: null,
    },
    pickerState: {
      ...state.pickerState,
      reachableDestinations: getReachableStops(stop.id, reachability, stops),
    },
  };
}
