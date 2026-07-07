export function serviceRunsOnSelectedDay(serviceDayType, selectedDayType) {
  if (serviceDayType === selectedDayType) {
    return true;
  }

  if (selectedDayType === 'scolastico' && serviceDayType === 'feriale') {
    return true;
  }

  return serviceDayType === 'giornaliero';
}
