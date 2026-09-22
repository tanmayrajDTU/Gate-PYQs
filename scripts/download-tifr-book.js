// ===========================================================================
// DOWNLOAD TIFR CS HTML DIRECTLY FROM https://gateoverflow.in/book
//
// In your browser console on https://gateoverflow.in/book:
// Paste this script and press Enter.
// It will fetch the TIFR book HTML and auto-download it as `tifr_book.html`.
// ===========================================================================

(async function downloadTifrBook() {
  console.log('%cFetching TIFR CS book...', 'font-size:14px;color:#4CAF50;font-weight:bold');

  // Try candidate URLs for book_filter5 (TIFR)
  const candidateUrls = [
    '/book?book=book_filter5',
    '/book_filter5.html',
    '/book?name=book_filter5',
    'https://raw.githubusercontent.com/GATEOverflow/GO-PDFs/refs/heads/master/book_filter5.html'
  ];

  // Also check if bv-book-select onchange triggers a fetch or reveals an iframe
  const select = document.getElementById('bv-book-select') || document.querySelector('select[name="bv-book-select"]');
  if (select) {
    console.log('Selecting book_filter5 in dropdown...');
    select.value = 'book_filter5';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Let's inspect network / DOM after selecting
  await new Promise(r => setTimeout(r, 1500));

  // Check if content loaded into DOM
  const viewer = document.getElementById('bv-content') || document.querySelector('.book-content') || document.querySelector('#book-content');
  if (viewer && viewer.innerHTML.length > 500) {
    console.log(`%cFound content in DOM: ${viewer.innerHTML.length} characters!`, 'color:#2196F3;font-weight:bold');
    downloadFile(viewer.innerHTML, 'tifr_book.html');
    return;
  }

  // If not immediately in DOM, test candidate fetch URLs
  for (const url of candidateUrls) {
    try {
      console.log(`Trying URL: ${url}`);
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const text = await res.text();
        if (text.length > 500) {
          console.log(`%cSuccess with ${url}! (${(text.length/1024).toFixed(1)} KB)`, 'color:#4CAF50;font-weight:bold');
          downloadFile(text, 'tifr_book.html');
          return;
        }
      }
    } catch (e) {
      console.log(`Failed ${url}: ${e.message}`);
    }
  }

  // Fallback: Dump whatever scripts define bv-book-select
  console.log('Inspecting page scripts for book URLs...');
  const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerText).filter(t => t.includes('book_filter5') || t.includes('bv-book-select'));
  if (scripts.length > 0) {
    console.log('Script logic found:', scripts[0].slice(0, 1000));
  }
})();

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  console.log(`%c💾 Downloaded ${filename}! Save it to scripts/${filename}`, 'font-size:13px;color:#FF9800;font-weight:bold');
}
