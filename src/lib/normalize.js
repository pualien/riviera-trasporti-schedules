export function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stopIdFromName(value) {
  return normalizeText(value).replace(/\s+/g, '-');
}

export function applyStopAliases(rawValue, aliases) {
  const normalized = normalizeText(rawValue);

  for (const [canonical, variants] of Object.entries(aliases)) {
    if (canonical === normalized || variants.includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

export function canonicalizeStopName(rawValue, aliases) {
  return applyStopAliases(rawValue, aliases);
}

export function createStopRecord(canonical, variants) {
  return {
    id: stopIdFromName(canonical),
    canonical,
    variants,
    matchTokens: [canonical, ...variants].map(normalizeText),
  };
}

export function matchProviderStopName(rawValue, aliases) {
  return applyStopAliases(rawValue, aliases);
}
