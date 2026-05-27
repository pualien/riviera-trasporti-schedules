export function openPanelWithPointerSafeTiming({
  openedByPointer = false,
  open,
  schedule = (callback) => setTimeout(callback, 0),
} = {}) {
  if (!openedByPointer) {
    open();
    return 'immediate';
  }

  schedule(open);
  return 'deferred';
}

export function shouldOpenPanelFromFocusedInputClick({
  inputIsFocused = false,
  panelIsOpen = false,
} = {}) {
  return inputIsFocused && !panelIsOpen;
}
