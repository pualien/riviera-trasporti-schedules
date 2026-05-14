export const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
export const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function scriptLoadError(error) {
  return error instanceof Error
    ? error
    : new Error('Leaflet script failed to load');
}

export async function ensureLeaflet({
  documentRef = document,
  windowRef = window,
} = {}) {
  if (windowRef.L) {
    return windowRef.L;
  }

  if (!documentRef.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
    const link = documentRef.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_URL;
    documentRef.head.append(link);
  }

  await new Promise((resolve, reject) => {
    const existingScript = documentRef.querySelector(`script[src="${LEAFLET_JS_URL}"]`);

    if (existingScript) {
      if (existingScript.dataset?.loadState === 'error') {
        existingScript.remove();
      } else {
        existingScript.addEventListener('load', () => {
          existingScript.dataset.loadState = 'loaded';
          resolve();
        }, { once: true });
        existingScript.addEventListener('error', (error) => {
          existingScript.dataset.loadState = 'error';
          reject(scriptLoadError(error));
        }, { once: true });
        if (windowRef.L) {
          existingScript.dataset.loadState = 'loaded';
          resolve();
        }
        return;
      }
    }

    const script = documentRef.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.dataset.loadState = 'loading';
    script.onload = () => {
      script.dataset.loadState = 'loaded';
      resolve();
    };
    script.onerror = (error) => {
      script.dataset.loadState = 'error';
      reject(scriptLoadError(error));
    };
    documentRef.body.append(script);
  });

  return windowRef.L;
}
