function isStandalone(windowObject, navigatorObject) {
  return Boolean(
    windowObject?.matchMedia?.('(display-mode: standalone)')?.matches
    || navigatorObject?.standalone,
  );
}

function initialState(windowObject, navigatorObject) {
  return {
    pwaSupported: Boolean(navigatorObject?.serviceWorker?.register),
    installAvailable: false,
    isInstalled: isStandalone(windowObject, navigatorObject),
    isOnline: navigatorObject?.onLine !== false,
    updateAvailable: false,
  };
}

export function createPwaController({
  windowObject = globalThis.window,
  navigatorObject = globalThis.navigator,
  serviceWorkerUrl = './service-worker.js',
  onStateChange = () => {},
  logger = console,
} = {}) {
  let state = initialState(windowObject, navigatorObject);
  let deferredInstallPrompt = null;
  let registration = null;
  let reloadingForUpdate = false;
  let updateActivationRequested = false;

  function emit(patch) {
    state = { ...state, ...patch };
    onStateChange({ ...state });
  }

  function getState() {
    return { ...state };
  }

  function handleBeforeInstallPrompt(event) {
    event.preventDefault?.();
    deferredInstallPrompt = event;
    emit({ installAvailable: true });
  }

  function handleAppInstalled() {
    deferredInstallPrompt = null;
    emit({
      installAvailable: false,
      isInstalled: true,
    });
  }

  function handleOnline() {
    emit({ isOnline: true });
  }

  function handleOffline() {
    emit({ isOnline: false });
  }

  function handleControllerChange() {
    if (!updateActivationRequested || reloadingForUpdate) {
      return;
    }

    reloadingForUpdate = true;
    windowObject?.location?.reload?.();
  }

  function watchRegistration(nextRegistration) {
    registration = nextRegistration;

    if (registration?.waiting) {
      emit({ updateAvailable: true });
    }

    registration?.addEventListener?.('updatefound', () => {
      const worker = registration.installing;

      worker?.addEventListener?.('statechange', () => {
        if (worker.state === 'installed' && navigatorObject.serviceWorker?.controller) {
          emit({ updateAvailable: true });
        }
      });
    });
  }

  async function register() {
    if (!navigatorObject?.serviceWorker?.register) {
      emit({ pwaSupported: false });
      return false;
    }

    try {
      const nextRegistration = await navigatorObject.serviceWorker.register(serviceWorkerUrl);
      watchRegistration(nextRegistration);
      navigatorObject.serviceWorker.addEventListener?.('controllerchange', handleControllerChange);
      return true;
    } catch (error) {
      logger.error?.('Service worker registration failed', error);
      return false;
    }
  }

  async function promptInstall() {
    if (!deferredInstallPrompt) {
      emit({ installAvailable: false });
      return 'unavailable';
    }

    const promptEvent = deferredInstallPrompt;
    deferredInstallPrompt = null;

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      const accepted = choice?.outcome === 'accepted';

      emit({
        installAvailable: false,
        isInstalled: accepted || state.isInstalled,
      });

      return choice?.outcome ?? 'dismissed';
    } catch (error) {
      logger.error?.('Install prompt failed', error);
      emit({ installAvailable: false });
      return 'dismissed';
    }
  }

  async function applyUpdate() {
    if (!registration?.waiting) {
      emit({ updateAvailable: false });
      return false;
    }

    updateActivationRequested = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
  }

  function destroy() {
    windowObject?.removeEventListener?.('beforeinstallprompt', handleBeforeInstallPrompt);
    windowObject?.removeEventListener?.('appinstalled', handleAppInstalled);
    windowObject?.removeEventListener?.('online', handleOnline);
    windowObject?.removeEventListener?.('offline', handleOffline);
    navigatorObject?.serviceWorker?.removeEventListener?.('controllerchange', handleControllerChange);
  }

  windowObject?.addEventListener?.('beforeinstallprompt', handleBeforeInstallPrompt);
  windowObject?.addEventListener?.('appinstalled', handleAppInstalled);
  windowObject?.addEventListener?.('online', handleOnline);
  windowObject?.addEventListener?.('offline', handleOffline);

  return {
    getState,
    register,
    promptInstall,
    applyUpdate,
    destroy,
  };
}
