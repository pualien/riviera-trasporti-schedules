export function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
