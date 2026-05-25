function clampSelectionPoint(value, point) {
  const inputLength = String(value ?? '').length;
  return Math.max(0, Math.min(point, inputLength));
}

export function captureTextInputSelection(input) {
  if (!input) {
    return null;
  }

  if (typeof input.selectionStart !== 'number' || typeof input.selectionEnd !== 'number') {
    return null;
  }

  return {
    start: input.selectionStart,
    end: input.selectionEnd,
    direction: input.selectionDirection ?? 'none',
  };
}

export function restoreTextInputSelection(input, selection) {
  if (!input) {
    return false;
  }

  input.focus();

  if (!selection || typeof input.setSelectionRange !== 'function') {
    return true;
  }

  const start = clampSelectionPoint(input.value, selection.start);
  const end = clampSelectionPoint(input.value, selection.end);
  input.setSelectionRange(start, end, selection.direction ?? 'none');
  return true;
}
