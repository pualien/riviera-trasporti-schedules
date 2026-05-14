export async function registerServiceWorker(navigatorObject = globalThis.navigator) {
  if (!navigatorObject?.serviceWorker) {
    return false;
  }

  try {
    await navigatorObject.serviceWorker.register('./service-worker.js');
    return true;
  } catch (error) {
    console.error('Service worker registration failed', error);
    return false;
  }
}
