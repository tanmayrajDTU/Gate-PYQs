// ===========================================================================
// CLICK INSPECTOR FOR TIFR QUESTIONS
// Run this in DevTools Console on https://gateoverflow.in/book/book_filter5
// ===========================================================================

(function inspectQuestionElement() {
  // Find the first TIFR question element
  const all = Array.from(document.querySelectorAll('*'));
  const target = all.find(el => el.innerText && el.innerText.trim().startsWith('1.1.1 TIFR CSE 2025'));

  if (!target) {
    console.log('Target question element not found!');
    return;
  }

  console.log('Found element:', target);
  console.log('Tag:', target.tagName);
  console.log('Class:', target.className);
  console.log('Attributes:');
  for (const attr of target.attributes) {
    console.log(`  ${attr.name} = "${attr.value}"`);
  }

  // Check parent elements
  let p = target.parentElement;
  for (let i = 0; i < 4 && p; i++) {
    console.log(`Parent ${i}: <${p.tagName} class="${p.className}" id="${p.id}">`);
    for (const attr of p.attributes) {
      if (attr.name.startsWith('data-') || attr.name === 'id') {
        console.log(`    ${attr.name} = "${attr.value}"`);
      }
    }
    p = p.parentElement;
  }

  // Simulate a click on the element and observe what loads on the right pane!
  console.log('%cClicking the question to see what loads on the right pane...', 'color:#4CAF50;font-weight:bold');
  target.click();

  setTimeout(() => {
    // Check main display container on the right
    const rightPane = document.querySelector('.main-content, .content, #content, #bv-main, .book-content, .qa-main') || document.body;
    console.log('Right pane text preview after click:');
    console.log(rightPane.innerText.slice(0, 500));
  }, 1000);
})();
