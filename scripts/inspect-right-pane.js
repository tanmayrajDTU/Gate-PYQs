// ===========================================================================
// RIGHT PANE & CLICK INSPECTOR
// Paste this into the DevTools Console on https://gateoverflow.in/book/book_filter5
// AFTER clicking any question so that the right pane is visible.
// ===========================================================================

(function inspectRightPane() {
  console.log('%cInspecting Right Pane and selected question...', 'color:#4CAF50;font-weight:bold;font-size:14px');

  // 1. Find all elements on the page that contain "GateOverflow" link or question content
  const allLinks = Array.from(document.querySelectorAll('a')).filter(a => 
    a.href && (a.href.includes('gateoverflow.in/') || a.innerText.includes('Question') || a.innerText.includes('GATE Overflow'))
  );

  console.log(`Found ${allLinks.length} relevant links on the page.`);
  console.log('Sample links:');
  allLinks.slice(0, 5).forEach(l => console.log('  ', l.innerText, '->', l.href));

  // 2. Identify the container on the right side
  // Let's find the container that contains the question text or options
  const potentialContainers = Array.from(document.querySelectorAll('div, section, article, main')).filter(el => {
    const text = el.innerText || '';
    return text.includes('Question') && (text.includes('(A)') || text.includes('(B)') || text.includes('Option') || text.includes('Answer'));
  });

  console.log(`Found ${potentialContainers.length} potential content containers.`);
  const mainViewer = potentialContainers[potentialContainers.length - 1] || document.body;

  console.log('Main viewer tag:', mainViewer.tagName, 'class:', mainViewer.className, 'id:', mainViewer.id);
  console.log('HTML preview (first 500 chars):');
  console.log(mainViewer.innerHTML.slice(0, 500));

  // Check if there is an iframe
  const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
  if (iframes.length > 0) {
    console.log('Iframes found:', iframes);
  }

  return {
    sampleLinks: allLinks.slice(0, 5).map(l => ({ text: l.innerText, href: l.href })),
    viewerClass: mainViewer.className,
    viewerId: mainViewer.id
  };
})();
