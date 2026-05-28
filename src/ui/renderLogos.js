const TAB_LOGOS = Object.freeze({
  search: `
    <span class="button-logo button-logo--rt" aria-hidden="true">
      <img src="./assets/brand/apple-touch-icon.png" alt="" decoding="async" />
    </span>
  `,
  trains: `
    <span class="button-logo button-logo--trenitalia" aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false" aria-hidden="true">
        <path fill="#007a3d" d="M6 7h20a3 3 0 0 1 3 3v2H10a4 4 0 0 0-4 4V7Z" />
        <path fill="#e1261c" d="M6 18h13.5a6 6 0 0 1 5.1 2.9L27 25H6v-7Z" />
        <path fill="#f7f1ea" d="M10 13h16v3H10a2 2 0 0 0-2 2v4H5v-6a3 3 0 0 1 3-3h2Z" />
      </svg>
    </span>
  `,
  flixbus: `
    <span class="button-logo button-logo--flixbus" aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#73d700" />
        <path fill="#173300" d="M7 11.5c0-1.4 1.1-2.5 2.5-2.5h13c1.4 0 2.5 1.1 2.5 2.5V21H7v-9.5Z" />
        <path fill="#f7f1ea" d="M10 12h12v4H10v-4Z" />
        <circle cx="11" cy="23" r="2" fill="#173300" />
        <circle cx="21" cy="23" r="2" fill="#173300" />
      </svg>
    </span>
  `,
  blablacar: `
    <span class="button-logo button-logo--blablacar" aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false" aria-hidden="true">
        <circle cx="12" cy="14" r="6" fill="#00aff5" />
        <circle cx="20" cy="18" r="6" fill="#0bcf97" />
        <path fill="#f7f1ea" d="M11 11.5h3.1c1.6 0 2.7 1 2.7 2.4 0 .8-.4 1.5-1 1.9 1 .3 1.7 1.1 1.7 2.3 0 1.5-1.2 2.5-3 2.5H11v-9.1Zm2 3.6h1c.5 0 .8-.3.8-.8s-.3-.8-.8-.8h-1v1.6Zm0 3.4h1.3c.6 0 1-.3 1-.9s-.4-.9-1-.9H13v1.8Z" />
      </svg>
    </span>
  `,
});

const SHARE_LOGOS = Object.freeze({
  link: `
    <span class="share-option-logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M9.8 14.2a3 3 0 0 0 4.3 0l3.2-3.2a3 3 0 1 0-4.2-4.2l-.9.9" />
        <path d="M14.2 9.8a3 3 0 0 0-4.3 0L6.7 13a3 3 0 1 0 4.2 4.2l.9-.9" />
      </svg>
    </span>
  `,
  whatsapp: `
    <span class="share-option-logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 4.2a7.3 7.3 0 0 0-6.2 11.2L5 19l3.7-.9A7.3 7.3 0 1 0 12 4.2Z" />
        <path fill="#f7f1ea" d="M9.6 8.4c-.2-.4-.4-.4-.7-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.3.9 2.5 1 2.6.1.2 1.8 2.9 4.5 3.8 2.2.8 2.7.5 3.2.5.5-.1 1.5-.7 1.7-1.3.2-.6.2-1.1.1-1.2l-.6-.3-1.8-.9c-.3-.1-.5-.2-.7.2l-.7.8c-.1.2-.3.3-.6.1-.3-.1-1.1-.4-2-1.2-.8-.7-1.3-1.6-1.5-1.9-.2-.2 0-.4.1-.5l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.8-1.9Z" />
      </svg>
    </span>
  `,
  telegram: `
    <span class="share-option-logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M20 5.2 17.4 18c-.2.9-.8 1.1-1.5.7l-4.1-3-2 1.9c-.2.2-.4.4-.9.4l.3-4.2L16.8 7c.3-.3-.1-.4-.5-.2L7 12.6l-4-1.2c-.9-.3-.9-.9.2-1.3l15.4-6c.7-.2 1.3.2 1.1 1.1Z" />
      </svg>
    </span>
  `,
  facebook: `
    <span class="share-option-logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M14.4 8.1H16V5.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2v2.4H7V15h2.6v7h3.2v-7h2.6l.4-3.1h-3V9.8c0-.9.2-1.7 1.6-1.7Z" />
      </svg>
    </span>
  `,
  x: `
    <span class="share-option-logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M14 10.7 21.3 2h-1.7l-6.3 7.5L8.2 2H2.4l7.7 11.2L2.4 22h1.7l6.8-7.7 5.4 7.7H22l-8-11.3Zm-2.4 2.7-.8-1.1L4.7 3.3h2.7l5 7.3.8 1.1 6.4 9.2h-2.7l-5.3-7.5Z" />
      </svg>
    </span>
  `,
});

export function renderTabLogo(tab) {
  return TAB_LOGOS[tab] ?? '';
}

export function renderProviderLogo(provider) {
  return TAB_LOGOS[provider] ?? '';
}

export function renderShareLogo(channel) {
  return SHARE_LOGOS[channel] ?? '';
}
