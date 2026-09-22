// ===========================================================================
// COMPLETE LINK EXTRACTOR FOR https://gateoverflow.in/book
// Extracts ALL links and select dropdown options on the page.
// ===========================================================================

(function extractAllPageLinks() {
  console.log('%cExtracting all links & dropdowns on https://gateoverflow.in/book...', 'color:#4CAF50;font-weight:bold');

  // 1. All Anchor Links
  const allLinks = Array.from(document.querySelectorAll('a'))
    .map(a => ({
      text: a.innerText.trim(),
      href: a.href,
      download: a.getAttribute('download') || null
    }))
    .filter(l => l.href && !l.href.startsWith('javascript:'));

  // 2. All Select / Option values (e.g. Book Viewer dropdowns, Filter dropdowns)
  const allSelects = Array.from(document.querySelectorAll('select')).map(sel => ({
    name: sel.name || sel.id || 'select',
    options: Array.from(sel.options).map(opt => ({
      text: opt.text.trim(),
      value: opt.value
    }))
  }));

  // 3. Any iframe or embed elements
  const embeds = Array.from(document.querySelectorAll('iframe, embed')).map(el => ({
    tag: el.tagName,
    src: el.getAttribute('src')
  }));

  // 4. Main text content summary
  const bodyText = document.body.innerText.slice(0, 1500);

  const payload = {
    url: window.location.href,
    title: document.title,
    links: allLinks,
    selects: allSelects,
    embeds: embeds,
    bodySnippet: bodyText
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'go-book-links.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log(`%cDone! Found ${allLinks.length} links and ${allSelects.length} select menus. Downloaded go-book-links.json`, 'color:#2196F3;font-weight:bold');
})();
