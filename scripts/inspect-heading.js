// ===========================================================================
// PRECISE QUESTION HEADING & CONTENT INSPECTOR
// ===========================================================================

(function inspectQuestionHeading() {
  // Find heading elements (h1, h2, h3, h4) that contain links
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, .title, [class*="title"], [class*="heading"]'));
  
  const headingWithLink = headings.find(h => h.querySelector('a'));
  const anchor = headingWithLink ? headingWithLink.querySelector('a') : null;

  console.log('Heading found:', headingWithLink ? headingWithLink.innerText : 'None');
  console.log('Heading link URL:', anchor ? anchor.href : 'None');
  console.log('Heading link text:', anchor ? anchor.innerText : 'None');

  // Find the parent container that houses this heading and the question text
  if (headingWithLink) {
    let container = headingWithLink.parentElement;
    console.log('Container tag:', container.tagName, 'class:', container.className, 'id:', container.id);
    console.log('Container snippet:');
    console.log(container.innerText.slice(0, 400));
  }
})();
