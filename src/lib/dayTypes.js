export function serviceRunsOnSelectedDay(serviceDayType, selectedDayType) {
  if (serviceDayType === selectedDayType) {
    return true;
  }

  return serviceDayType === 'giornaliero';
}
