import { describe, expect, it, vi } from 'vitest';
import { createPwaController } from '../../src/lib/pwaController.js';

function createEventTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
    dispatch(type, event = {}) {
      listeners.get(type)?.(event);
    },
  };
}

function createWindow({ online = true, standalone = false } = {}) {
  const target = createEventTarget();

  return {
    ...target,
    navigator: { onLine: online, standalone: false },
    matchMedia: () => ({ matches: standalone }),
    location: { reload: vi.fn() },
  };
}

describe('createPwaController', () => {
  it('captures beforeinstallprompt and prompts only after user action', async () => {
    const win = createWindow();
    const changes = [];
    const promptEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };
    const controller = createPwaController({
      windowObject: win,
      navigatorObject: {
        onLine: true,
        serviceWorker: { register: vi.fn() },
      },
      onStateChange: (state) => changes.push(state),
    });

    win.dispatch('beforeinstallprompt', promptEvent);

    expect(promptEvent.preventDefault).toHaveBeenCalled();
    expect(controller.getState().installAvailable).toBe(true);
    expect(changes.at(-1)).toMatchObject({ installAvailable: true });

    await expect(controller.promptInstall()).resolves.toBe('accepted');

    expect(promptEvent.prompt).toHaveBeenCalled();
    expect(controller.getState()).toMatchObject({
      installAvailable: false,
      isInstalled: true,
    });
  });

  it('tracks online and offline changes', () => {
    const win = createWindow({ online: true });
    const controller = createPwaController({
      windowObject: win,
      navigatorObject: {
        onLine: true,
        serviceWorker: { register: vi.fn() },
      },
    });

    win.navigator.onLine = false;
    win.dispatch('offline');
    expect(controller.getState().isOnline).toBe(false);

    win.navigator.onLine = true;
    win.dispatch('online');
    expect(controller.getState().isOnline).toBe(true);
  });

  it('registers the service worker and reports an existing waiting update', async () => {
    const waiting = { postMessage: vi.fn() };
    const register = vi.fn().mockResolvedValue({
      waiting,
      addEventListener: vi.fn(),
    });
    const controller = createPwaController({
      windowObject: createWindow(),
      navigatorObject: {
        onLine: true,
        serviceWorker: {
          register,
          addEventListener: vi.fn(),
        },
      },
    });

    await expect(controller.register()).resolves.toBe(true);

    expect(register).toHaveBeenCalledWith('./service-worker.js');
    expect(controller.getState().updateAvailable).toBe(true);
    await expect(controller.applyUpdate()).resolves.toBe(true);
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('reloads once after the user applies an available update', async () => {
    const swTarget = createEventTarget();
    const win = createWindow();
    const waiting = { postMessage: vi.fn() };
    const controller = createPwaController({
      windowObject: win,
      navigatorObject: {
        onLine: true,
        serviceWorker: {
          register: vi.fn().mockResolvedValue({ waiting, addEventListener: vi.fn() }),
          addEventListener: swTarget.addEventListener,
          removeEventListener: swTarget.removeEventListener,
        },
      },
    });

    await controller.register();
    await controller.applyUpdate();
    swTarget.dispatch('controllerchange');
    swTarget.dispatch('controllerchange');

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it('returns false when service workers are unsupported', async () => {
    const controller = createPwaController({
      windowObject: createWindow(),
      navigatorObject: { onLine: true },
    });

    await expect(controller.register()).resolves.toBe(false);
    expect(controller.getState().pwaSupported).toBe(false);
  });
});
