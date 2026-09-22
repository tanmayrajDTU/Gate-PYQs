// ===========================================================================
// DIAGNOSTIC SNIFFER FOR https://gateoverflow.in/book
// Paste this into the DevTools Console and press Enter.
// ===========================================================================

(function sniffBookViewer() {
  console.log('%cInspecting Book Viewer implementation...', 'color:#4CAF50;font-weight:bold');

  // Check what functions or objects are globally registered on the page
  const globalKeys = Object.keys(window).filter(k => 
    k.toLowerCase().includes('book') || 
    k.toLowerCase().includes('filter') || 
    k.toLowerCase().includes('viewer') ||
    k.toLowerCase().includes('pdf')
  );
  console.log('Global window properties:', globalKeys);

  // Inspect the select element and its event listeners
  const select = document.querySelector('select[name="bv-book-select"]') || document.getElementById('bv-book-select');
  console.log('Select element found:', !!select);
  if (select) {
    console.log('onchange attribute:', select.getAttribute('onchange'));
  }

  // Look for inline scripts containing "bv-book-select"
  const scripts = Array.from(document.querySelectorAll('script'))
    .map(s => s.innerText)
    .filter(t => t.includes('bv-book-select') || t.includes('book_filter'));

  console.log('Inline scripts matching:', scripts.length);
  if (scripts.length > 0) {
    console.log('Script code snippet:');
    console.log(scripts[0].slice(0, 1500));
  }

  // Print whatever the browser sees when you click or change
  return {
    globalKeys,
    scriptSnippet: scripts[0] ? scripts[0].slice(0, 1500) : 'None'
  };
})();
