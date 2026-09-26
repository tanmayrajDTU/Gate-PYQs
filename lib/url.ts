/**
 * Validates that a GateOverflow URL points to a specific question post rather than
 * a generic landing page or category homepage (e.g. "https://gateoverflow.in/isro").
 */
export function isValidGateOverflowUrl(url?: string | null): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed === 'https://gateoverflow.in/isro' || trimmed === 'https://gateoverflow.in/isro/') return false;
  return /^https?:\/\/(?:www\.)?gateoverflow\.in\/\d+/i.test(trimmed);
}
