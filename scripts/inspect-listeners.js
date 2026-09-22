// ===========================================================================
// EVENT LISTENER SNIFFER
// Paste this into DevTools Console to see what happens when selecting a book.
// ===========================================================================

(function inspectListeners() {
  const select = document.querySelector('select[name="bv-book-select"]') || document.getElementById('bv-book-select') || document.querySelector('select');
  if (!select) {
    console.log('No select element found on page!');
    return;
  }

  console.log('Found select:', select);

  // If getEventListeners is supported in Chrome DevTools:
  if (typeof getEventListeners === 'function') {
    console.log('Change event listeners:', getEventListeners(select).change);
  }

  // Look for any scripts that mention "book_filter" anywhere
  const allScripts = Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerText);
  const relevantScripts = allScripts.filter(s => s.includes('book') || s.includes('viewer'));
  console.log('Relevant script sources/tags:', relevantScripts);
})();
