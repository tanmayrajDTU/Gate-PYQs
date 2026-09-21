// ===========================================================================
// BROWSER CONSOLE SCRAPER FOR 18 QUESTIONS WITH MISSING BODY
// Paste this into the DevTools Console on any gateoverflow.in tab
// after completing reCAPTCHA authentication.
// ===========================================================================

(async function scrapeMissingBodies() {
  const URLS = [
    { id: "question866", number: "1.1.3", url: "https://gateoverflow.in/866/gate-cse-2002-question-13" },
    { id: "question1522", number: "4.12.19", url: "https://gateoverflow.in/1522/gate-cse-1999-question-3" },
    { id: "question1722", number: "5.4.2", url: "https://gateoverflow.in/1722/gate-cse-1998-question-8" },
    { id: "question755", number: "3.5.4", url: "https://gateoverflow.in/755/gate-cse-2001-question-14" },
    { id: "question2640", number: "1.23.8", url: "https://gateoverflow.in/2640/gate-cse-1995-question-4" },
    { id: "question2644", number: "2.12.11", url: "https://gateoverflow.in/2644/gate-cse-1995-question-9" },
    { id: "question1728", number: "2.12.15", url: "https://gateoverflow.in/1728/gate-cse-1998-question-14" },
    { id: "question875", number: "2.20.4", url: "https://gateoverflow.in/875/gate-cse-2002-question-22" },
    { id: "question1737", number: "2.22.6", url: "https://gateoverflow.in/1737/gate-cse-1998-question-22" },
    { id: "question1735", number: "3.1.3", url: "https://gateoverflow.in/1735/gate-cse-1998-question-21" },
    { id: "question1511", number: "3.4.3", url: "https://gateoverflow.in/1511/gate-cse-1999-question-12" },
    { id: "question1505", number: "6.20.8", url: "https://gateoverflow.in/1505/gate-cse-1999-question-6" },
    { id: "question678", number: "6.3.8", url: "https://gateoverflow.in/678/gate-cse-2000-question-7" },
    { id: "question2508", number: "1.21.2", url: "https://gateoverflow.in/2508/gate-cse-1994-question-12" },
    { id: "question870", number: "3.2.10", url: "https://gateoverflow.in/870/gate-cse-2002-question-17" },
    { id: "question860", number: "4.12.2", url: "https://gateoverflow.in/860/gate-cse-2002-question-7" },
    { id: "question2500", number: "4.4.7", url: "https://gateoverflow.in/2500/gate-cse-1994-question-4" },
    { id: "question2523", number: "5.25.8", url: "https://gateoverflow.in/2523/gate-cse-1994-question-27" }
  ];

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const results = [];

  console.log(`%c🚀 Fetching bodies for ${URLS.length} questions...`, 'font-size:14px;color:#4CAF50;font-weight:bold');

  for (let i = 0; i < URLS.length; i++) {
    const item = URLS[i];
    console.log(`[${i + 1}/${URLS.length}] Fetching ${item.number}...`);
    try {
      const resp = await fetch(item.url, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const contentEl = doc.querySelector('.qa-q-view-content .qa-q-view-main') || doc.querySelector('.qa-q-view-content');
      
      const bodyHtml = contentEl ? contentEl.innerHTML.trim() : '';
      results.push({
        id: item.id,
        number: item.number,
        bodyHtml: bodyHtml
      });
      console.log(`  ✓ Got body (${bodyHtml.length} chars)`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
      results.push({ id: item.id, number: item.number, bodyHtml: '' });
    }
    if (i < URLS.length - 1) await sleep(1200);
  }

  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'missing-bodies.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('%c💾 Downloaded missing-bodies.json — save to scripts/missing-bodies.json, then run node scripts/apply-missing-bodies.mjs', 'font-size:13px;font-weight:bold;color:#FF9800');
})();
