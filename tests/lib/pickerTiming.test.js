import { describe, expect, it, vi } from 'vitest';
import {
  openPanelWithPointerSafeTiming,
  shouldOpenPanelFromFocusedInputClick,
} from '../../src/lib/pickerTiming.js';

describe('openPanelWithPointerSafeTiming', () => {
  it('opens immediately for keyboard-driven focus', () => {
    const open = vi.fn();
    const schedule = vi.fn();

    const result = openPanelWithPointerSafeTiming({
      openedByPointer: false,
      open,
      schedule,
    });

    expect(result).toBe('immediate');
    expect(open).toHaveBeenCalledOnce();
    expect(schedule).not.toHaveBeenCalled();
  });

  it('defers pointer-driven focus so the original click cannot hit newly rendered options', () => {
    const open = vi.fn();
    const schedule = vi.fn();

    const result = openPanelWithPointerSafeTiming({
      openedByPointer: true,
      open,
      schedule,
    });

    expect(result).toBe('deferred');
    expect(open).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledOnce();
    schedule.mock.calls[0][0]();
    expect(open).toHaveBeenCalledOnce();
  });

  it('opens from a click when the input is already focused and the panel is closed', () => {
    expect(shouldOpenPanelFromFocusedInputClick({
      inputIsFocused: true,
      panelIsOpen: false,
    })).toBe(true);
    expect(shouldOpenPanelFromFocusedInputClick({
      inputIsFocused: false,
      panelIsOpen: false,
    })).toBe(false);
    expect(shouldOpenPanelFromFocusedInputClick({
      inputIsFocused: true,
      panelIsOpen: true,
    })).toBe(false);
  });
});
