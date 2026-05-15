export const ADSENSE_CLIENT_ID = 'ca-pub-4752698416622962';
export const ADSENSE_SCRIPT_SELECTOR = '[data-adsense-auto-ads="true"]';

export function hasValidAdSenseClientId(clientId = ADSENSE_CLIENT_ID) {
  return /^ca-pub-\d{16}$/.test(String(clientId).trim());
}

export function buildAdSenseScriptUrl(clientId = ADSENSE_CLIENT_ID) {
  const normalizedClientId = String(clientId).trim();

  if (!hasValidAdSenseClientId(normalizedClientId)) {
    return null;
  }

  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(normalizedClientId)}`;
}

export function installAutoAdsScript(
  doc = globalThis.document,
  win = globalThis,
  clientId = ADSENSE_CLIENT_ID,
) {
  const scriptUrl = buildAdSenseScriptUrl(clientId);

  if (!doc?.head || !scriptUrl || doc.querySelector(ADSENSE_SCRIPT_SELECTOR)) {
    return false;
  }

  const script = doc.createElement('script');
  script.async = true;
  script.src = scriptUrl;
  script.crossOrigin = 'anonymous';
  script.dataset.adsenseAutoAds = 'true';
  doc.head.append(script);
  win.__AZZURIVA_ADSENSE_CLIENT__ = String(clientId).trim();
  return true;
}
