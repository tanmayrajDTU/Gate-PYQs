// Number/date formatting used directly in rendered output must not depend
// on the runtime's default locale (Intl's `undefined` locale argument) —
// the Node server that pre-renders a static page and the visitor's browser
// can resolve different default locales, producing byte-different strings
// for the same value and triggering a hydration mismatch. Pinning an
// explicit locale everywhere this touches the DOM makes the output
// deterministic regardless of where it renders.
const LOCALE = 'en-IN';

export function formatNumber(n: number): string {
  return n.toLocaleString(LOCALE);
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
}
