// ===========================================================================
// TIFR BOOK CONTENT EXTRACTOR
// Run this in the DevTools Console on https://gateoverflow.in/book/book_filter5
// ===========================================================================

(async function extractTifrBook() {
  console.log('%c🚀 Starting TIFR Book Tree Extractor...', 'color:#4CAF50;font-weight:bold;font-size:14px');

  // Step 1: Click "Expand All" if available so all topics and questions are visible
  const expandBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'expand all');
  if (expandBtn) {
    console.log('Clicking "Expand All"...');
    expandBtn.click();
    await new Promise(r => setTimeout(r, 1500));
  }

  // Step 2: Extract all tree nodes / items
  const items = [];
  
  // Find all links or interactive items in the tree sidebar
  const allElements = document.querySelectorAll('*');
  const questionElements = Array.from(document.querySelectorAll('a, li, div, span')).filter(el => {
    const text = el.innerText ? el.innerText.trim() : '';
    return /TIFR.*Question/i.test(text) || /\d+\.\d+\.\d+\s+TIFR/i.test(text);
  });

  console.log(`Found ${questionElements.length} candidate question elements.`);

  // Collect unique question entries
  const seen = new Set();
  const questions = [];

  for (const el of questionElements) {
    const text = el.innerText.trim().split('\n')[0]; // first line
    if (!text || seen.has(text)) continue;
    seen.add(text);

    // Check if it has a link or dataset attribute
    const anchor = el.tagName === 'A' ? el : el.querySelector('a') || el.closest('a');
    const href = anchor ? anchor.href : null;
    const onclick = el.getAttribute('onclick') || (anchor ? anchor.getAttribute('onclick') : null);
    const dataId = el.getAttribute('data-id') || el.getAttribute('data-section') || el.getAttribute('data-q');

    questions.push({
      text: text,
      href: href,
      onclick: onclick,
      dataId: dataId
    });
  }

  console.log(`Extracted ${questions.length} distinct TIFR question references:`);
  console.table(questions.slice(0, 15));

  // Also extract the entire sidebar HTML for safe parsing
  const sidebar = document.querySelector('.book-sidebar, .sidebar, [class*="tree"], [class*="toc"]') || document.body;

  const result = {
    book: "TIFR CS",
    url: window.location.href,
    totalQuestionsFound: questions.length,
    questions: questions,
    sidebarSnippet: sidebar ? sidebar.innerHTML.slice(0, 5000) : ''
  };

  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tifr_questions_index.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log('%c💾 Downloaded tifr_questions_index.json — save to scripts/tifr_questions_index.json', 'color:#FF9800;font-weight:bold;font-size:13px');
})();
