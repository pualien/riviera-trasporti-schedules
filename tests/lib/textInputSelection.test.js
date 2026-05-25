import { describe, expect, it, vi } from 'vitest';
import { captureTextInputSelection, restoreTextInputSelection } from '../../src/lib/textInputSelection.js';

describe('textInputSelection', () => {
  it('restores a collapsed caret after a rerender', () => {
    const selection = captureTextInputSelection({
      selectionStart: 1,
      selectionEnd: 1,
      selectionDirection: 'forward',
    });
    const nextInput = {
      value: 'ab',
      focus: vi.fn(),
      setSelectionRange: vi.fn(),
    };

    restoreTextInputSelection(nextInput, selection);

    expect(nextInput.focus).toHaveBeenCalledOnce();
    expect(nextInput.setSelectionRange).toHaveBeenCalledWith(1, 1, 'forward');
  });

  it('focuses without restoring a range when selection is unavailable', () => {
    const nextInput = {
      focus: vi.fn(),
      setSelectionRange: vi.fn(),
    };

    restoreTextInputSelection(nextInput, null);

    expect(nextInput.focus).toHaveBeenCalledOnce();
    expect(nextInput.setSelectionRange).not.toHaveBeenCalled();
  });
});
