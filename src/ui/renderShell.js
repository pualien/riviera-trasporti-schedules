import {
  BRAND_LOCKUP_ALT,
  BRAND_LOCKUP_SRC,
  BRAND_SITE_LABEL,
  BRAND_SITE_URL,
  BRAND_SUBTITLE,
} from '../lib/brand.js';

export function renderShell(content) {
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <img
            class="brand-lockup-image"
            src="${BRAND_LOCKUP_SRC}"
            alt="${BRAND_LOCKUP_ALT}"
          />
          <p class="brand-subtitle">${BRAND_SUBTITLE}</p>
        </div>
        <a class="topbar-link" href="${BRAND_SITE_URL}" target="_blank" rel="noreferrer">
          ${BRAND_SITE_LABEL}
        </a>
      </header>
      ${content}
    </div>
  `;
}
