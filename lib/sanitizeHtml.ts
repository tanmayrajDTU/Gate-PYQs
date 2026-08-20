// HTML sanitizer for question bodies/options rendered via
// dangerouslySetInnerHTML. This content is sourced from a GateOverflow
// scrape into data/questions.json, so it isn't arbitrary public
// user-generated input, but it's still untrusted third-party HTML — if the
// scrape ever picks up a compromised/malicious page, or the pipeline has a
// bug, this is the only thing standing between that and script execution
// in the browser.
//
// Previously this was a hand-rolled regex-based stripper. Regex-based HTML
// sanitization is a well-known weak spot (nested/malformed tags,
// attribute-value quote-breaking, multi-pass mutation tricks can all slip
// past single-pass regex matching) — replaced with DOMPurify, a real HTML
// parser with a security track record, via isomorphic-dompurify so it also
// works during the static build (Next prerenders /browse and /practice at
// build time in Node, not just in the browser).
import DOMPurify from 'isomorphic-dompurify';

// Force rel="noopener noreferrer" on any link that opens in a new tab, so a
// malicious or compromised linked page can't use window.opener to tamper
// with this tab (reverse tabnabbing). Cheap to add now even though the
// current dataset has no target="_blank" links — protects future scrapes.
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const ALLOWED_TAGS = [
  'a', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup', 'br', 'p', 'div', 'span',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img',
  'code', 'pre', 'blockquote', 'hr',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'class', 'target', 'rel'];

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  // Deliberately not overriding ALLOWED_URI_REGEXP — DOMPurify's own
  // default is already vetted for this; a hand-rolled regex here would
  // just reintroduce the class of bug this whole swap exists to remove.
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
