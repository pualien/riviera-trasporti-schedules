export const SHARE_UTM_MEDIUM = 'route_share';
export const SHARE_UTM_CAMPAIGN = 'azzuriva_route_share';

export const SHARE_CHANNELS = Object.freeze([
  { id: 'link', labelKey: 'results.share.copyLink', utmSource: 'share_link' },
  { id: 'whatsapp', labelKey: 'results.share.whatsapp', utmSource: 'share_whatsapp' },
  { id: 'telegram', labelKey: 'results.share.telegram', utmSource: 'share_telegram' },
  { id: 'facebook', labelKey: 'results.share.facebook', utmSource: 'share_facebook' },
  { id: 'x', labelKey: 'results.share.x', utmSource: 'share_x' },
]);

function channelConfig(channel) {
  return SHARE_CHANNELS.find((entry) => entry.id === channel) ?? SHARE_CHANNELS[0];
}

export function buildRouteShareUrl(baseUrl, channel = 'link') {
  const url = new URL(baseUrl);
  const config = channelConfig(channel);

  url.searchParams.set('utm_source', config.utmSource);
  url.searchParams.set('utm_medium', SHARE_UTM_MEDIUM);
  url.searchParams.set('utm_campaign', SHARE_UTM_CAMPAIGN);

  return url.toString();
}

export function buildSocialShareHref({ channel = 'link', shareUrl, text = '' } = {}) {
  if (channel === 'whatsapp') {
    return `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`.trim())}`;
  }

  if (channel === 'telegram') {
    return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
  }

  if (channel === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  }

  if (channel === 'x') {
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
  }

  return shareUrl;
}
