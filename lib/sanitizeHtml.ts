// Lightweight allowlist-based HTML sanitizer.
//
// This project cannot currently install packages (no registry access in this
// environment), so this is a hand-rolled sanitizer rather than a battle-tested
// library like DOMPurify. It strips the primary XSS vectors relevant to our
// dataset (script/style/iframe/object/embed/form tags, all `on*` event
// handlers, and javascript:/vbscript:/data:text-html URLs) and only allows a
// small set of formatting/table/link/image attributes through.
//
// TODO: once package installation works again, replace this with
// `isomorphic-dompurify` (or equivalent) for stronger, spec-correct coverage.
// Treat this as a stopgap, not a long-term substitute.

const DANGEROUS_TAGS = [
  'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base',
  'form', 'input', 'button', 'svg', 'math', 'textarea', 'select', 'option',
  'audio', 'video', 'source', 'track', 'applet', 'frame', 'frameset', 'noscript',
];

const ALLOWED_ATTRS = new Set(['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'class', 'target', 'rel']);

const UNSAFE_URL = /^\s*(javascript:|vbscript:|data:text\/html)/i;

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  let out = html;

  // Remove dangerous tags and everything inside them.
  for (const tag of DANGEROUS_TAGS) {
    out = out.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
    out = out.replace(new RegExp(`<${tag}[^>]*/?>`, 'gi'), '');
  }

  // Strip disallowed attributes (including all on* event handlers) from remaining tags.
  out = out.replace(/<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*)?)>/g, (_match, tagName: string, attrsStr: string) => {
    let cleaned = '';
    const attrRegex = /([a-zA-Z-:]+)\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(attrsStr))) {
      const attrName = m[1].toLowerCase();
      const attrValue = m[3] ?? m[4] ?? m[2] ?? '';
      if (attrName.startsWith('on')) continue;
      if (!ALLOWED_ATTRS.has(attrName)) continue;
      if ((attrName === 'href' || attrName === 'src') && UNSAFE_URL.test(attrValue)) continue;
      cleaned += ` ${attrName}="${attrValue.replace(/"/g, '&quot;')}"`;
    }
    return `<${tagName}${cleaned}>`;
  });

  return out;
}
