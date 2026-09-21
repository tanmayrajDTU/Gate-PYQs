// ===========================================================================
// BROWSER CONSOLE SCRAPER — paste this into the browser DevTools console
// on any gateoverflow.in page AFTER completing reCAPTCHA authentication.
//
// HOW TO USE:
//   1. Open https://gateoverflow.in in your browser
//   2. Complete the reCAPTCHA / Cloudflare challenge
//   3. Open DevTools (F12) → Console tab
//   4. Paste this ENTIRE script and press Enter
//   5. Wait for it to finish (it will log progress for each URL)
//   6. A JSON file will auto-download when done — save it as:
//        scripts/scraped-data.json
//      (in the project root)
//   7. Then run:  node scripts/apply-scraped-fixes.mjs
// ===========================================================================

(async function scrapeGateOverflow() {
  const URLS = [
    { id: "question87129", number: "2.8.2", year: 1989, url: "https://gateoverflow.in/87129/gate-cse-1989-question-3-vi" },
    { id: "question441", number: "3.1.10", year: 2008, url: "https://gateoverflow.in/441/gate-cse-2008-question-29-30" },
    { id: "question80", number: "3.1.17", year: 2013, url: "https://gateoverflow.in/80/gate-cse-2013-question-47" },
    { id: "question786", number: "1.31.18", year: 2012, url: "https://gateoverflow.in/786/gate-cse-2012-question-29" },
    { id: "question578", number: "2.3.3", year: 1992, url: "https://gateoverflow.in/578/gate-cse-1992-question-3-i" },
    { id: "question595", number: "6.1.2", year: 1992, url: "https://gateoverflow.in/595/gate-cse-1992-question-16" },
    { id: "question333224", number: "6.18.18", year: 2020, url: "https://gateoverflow.in/333224/gate-cse-2020-question-7" },
    { id: "question3346", number: "6.7.42", year: 2008, url: "https://gateoverflow.in/3346/gate-it-2008-question-36" },
    { id: "question2515", number: "6.9.4", year: 1994, url: "https://gateoverflow.in/2515/gate-cse-1994-question-19" },
    { id: "question703", number: "1.25.1", year: 2001, url: "https://gateoverflow.in/703/gate-cse-2001-question-1-10-ugcnet-dec2012-iii-36" },
    { id: "question1339", number: "3.21.24", year: 2009, url: "https://gateoverflow.in/1339/gate-cse-2009-question-55" },
    { id: "question3721", number: "3.25.23", year: 2004, url: "https://gateoverflow.in/3721/gate-it-2004-question-77" },
    { id: "question413601", number: "3.6.49", year: 2024, url: "https://gateoverflow.in/413601/gate-data-science-and-artificial-intelligence-2024-sample-paper-question-26" },
    { id: "question2113", number: "5.15.6", year: 2011, url: "https://gateoverflow.in/2113/gate-cse-2011-question-11" },
    { id: "question1758", number: "2.24.18", year: 2012, url: "https://gateoverflow.in/1758/gate-cse-2012-question-36" },
    { id: "question2756", number: "3.5.2", year: 1996, url: "https://gateoverflow.in/2756/gate-cse-1996-question-2-14" },
    { id: "question40307", number: "8.8.18", year: 2014, url: "https://gateoverflow.in/40307/gate2014-ae-ga-7" },
    { id: "question83991", number: "1.2.2", year: 1990, url: "https://gateoverflow.in/83991/gate-cse-1990-question-2-ii" },
    { id: "question2739", number: "2.12.13", year: 1996, url: "https://gateoverflow.in/2739/gate-cse-1996-question-2-7" },
    { id: "question1513", number: "3.3.16", year: 1999, url: "https://gateoverflow.in/1513/gate-cse-1999-question-14" },
    { id: "question3915", number: "3.3.20", year: 2002, url: "https://gateoverflow.in/3915/gate-cse-2002-question-5b" },
    { id: "question594", number: "3.3.7", year: 1992, url: "https://gateoverflow.in/594/gate-cse-1992-question-15-a" },
    { id: "question2274", number: "4.12.10", year: 1997, url: "https://gateoverflow.in/2274/gate-cse-1997-question-14" },
    { id: "question745", number: "4.3.10", year: 2001, url: "https://gateoverflow.in/745/gate-cse-2001-question-4" },
    { id: "question94353", number: "4.4.1", year: 1988, url: "https://gateoverflow.in/94353/gate-cse-1988-question-2xviii" },
    { id: "question84039", number: "4.4.2", year: 1990, url: "https://gateoverflow.in/84039/gate-cse-1990-question-2-x" },
    { id: "question488084", number: "6.11.1", year: 2023, url: "https://gateoverflow.in/488084/gate-2023-stats-exam-q-13" },
    { id: "question488152", number: "7.11.2", year: 2017, url: "https://gateoverflow.in/488152/gate-cse-2017-set-1-question-37" },
    { id: "question587", number: "1.1.1", year: 1992, url: "https://gateoverflow.in/587/gate-cse-1992-question-8" },
    { id: "question94363", number: "1.43.1", year: 1988, url: "https://gateoverflow.in/94363/gate-cse-1988-question-6i" },
    { id: "question87080", number: "1.43.2", year: 1989, url: "https://gateoverflow.in/87080/gate-cse-1989-question-2-iii" },
    { id: "question2482", number: "2.12.9", year: 1994, url: "https://gateoverflow.in/2482/gate-cse-1994-question-3-5" },
    { id: "question43583", number: "2.13.3", year: 1992, url: "https://gateoverflow.in/43583/gate-cse-1992-question-11b" },
    { id: "question1514", number: "2.21.10", year: 1999, url: "https://gateoverflow.in/1514/gate-cse-1999-question-15" },
    { id: "question85981", number: "2.21.4", year: 1990, url: "https://gateoverflow.in/85981/gate-cse-1990-question-11a" },
    { id: "question536", number: "2.21.6", year: 1991, url: "https://gateoverflow.in/536/gate-cse-1991-question-09a" },
    { id: "question43603", number: "2.21.7", year: 1991, url: "https://gateoverflow.in/43603/gate-cse-1991-question-09b" },
    { id: "question83980", number: "2.24.4", year: 1990, url: "https://gateoverflow.in/83980/gate-cse-1990-question-2-v" },
    { id: "question2772", number: "2.27.3", year: 1996, url: "https://gateoverflow.in/2772/gate-cse-1996-question-20" },
    { id: "question84033", number: "2.7.2", year: 1990, url: "https://gateoverflow.in/84033/gate-cse-1990-question-2-ix" },
    { id: "question83993", number: "3.4.1", year: 1990, url: "https://gateoverflow.in/83993/gate-cse-1990-question-2-viii" },
    { id: "question864", number: "5.13.5", year: 2002, url: "https://gateoverflow.in/864/gate-cse-2002-question-11" },
    { id: "question2639", number: "5.5.1", year: 1995, url: "https://gateoverflow.in/2639/gate-cse-1995-question-3" },
    { id: "question2280", number: "6.11.2", year: 1997, url: "https://gateoverflow.in/2280/gate-cse-1997-question-20" },
    { id: "question2765", number: "6.15.1", year: 1996, url: "https://gateoverflow.in/2765/gate-cse-1996-question-13" },
    { id: "question867", number: "6.5.13", year: 2002, url: "https://gateoverflow.in/867/gate-cse-2002-question-14" },
    { id: "question874", number: "6.7.9", year: 2002, url: "https://gateoverflow.in/874/gate-cse-2002-question-21" },
    { id: "question87078", number: "1.1.3", year: 1989, url: "https://gateoverflow.in/87078/gate-cse-1989-question-2-ii" },
    { id: "question692", number: "3.2.8", year: 2000, url: "https://gateoverflow.in/692/gate-cse-2000-question-21" },
    { id: "question2493", number: "3.3.1", year: 1994, url: "https://gateoverflow.in/2493/gate-cse-1994-question-3-7" },
    { id: "question83977", number: "3.6.6", year: 1990, url: "https://gateoverflow.in/83977/gate-cse-1990-question-2-iv" },
    { id: "question2665", number: "3.6.9", year: 1995, url: "https://gateoverflow.in/2665/gate-cse-1995-question-26" },
    { id: "question94358", number: "4.21.2", year: 1988, url: "https://gateoverflow.in/94358/gate-cse-1988-question-3a-b" },
    { id: "question26437", number: "4.26.1", year: 1991, url: "https://gateoverflow.in/26437/gate-cse-1991-question-5-b" },
    { id: "question17407", number: "4.27.14", year: 1992, url: "https://gateoverflow.in/17407/gate1992-04-b" },
    { id: "question83859", number: "5.25.4", year: 1990, url: "https://gateoverflow.in/83859/gate-cse-1990-question-2-iii" },
    { id: "question2656", number: "5.25.9", year: 1995, url: "https://gateoverflow.in/2656/gate-cse-1995-question-19" },
    { id: "question87081", number: "5.33.1", year: 1989, url: "https://gateoverflow.in/87081/gate-cse-1989-question-2-iv" },
    { id: "question749", number: "5.5.1", year: 2001, url: "https://gateoverflow.in/749/gate-cse-2001-question-8" },
  ];

  const DELAY = 1500; // ms between fetches — be polite
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const results = [];
  let success = 0, failed = 0;

  console.log(`%c🚀 Starting GateOverflow scrape: ${URLS.length} questions`, 'font-size:14px;font-weight:bold;color:#4CAF50');

  for (let i = 0; i < URLS.length; i++) {
    const entry = URLS[i];
    console.log(`[${i + 1}/${URLS.length}] Fetching ${entry.number} (${entry.year})...`);

    try {
      const resp = await fetch(entry.url, { credentials: 'include' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();

      // Parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // --- Extract options ---
      // GateOverflow uses <li> inside <ol> with upper-alpha for MCQ options
      // Also look for the question's option list specifically
      let options = [];
      
      // Strategy 1: Look for ordered lists with upper-alpha style (most common)
      const olElements = doc.querySelectorAll('ol[style*="upper-alpha"], ol[type="A"]');
      for (const ol of olElements) {
        const lis = ol.querySelectorAll(':scope > li');
        if (lis.length >= 2) {
          const labels = 'ABCDEFGHIJ';
          options = [...lis].map((li, idx) => ({
            label: labels[idx] || String(idx + 1),
            html: li.innerHTML.trim()
          }));
          break;
        }
      }

      // Strategy 2: Look for any OL inside the question body
      if (options.length === 0) {
        const questionBody = doc.querySelector('.qa-q-view-content .qa-q-view-main');
        if (questionBody) {
          const allOls = questionBody.querySelectorAll('ol');
          for (const ol of allOls) {
            const lis = ol.querySelectorAll(':scope > li');
            if (lis.length >= 2 && lis.length <= 10) {
              const labels = 'ABCDEFGHIJ';
              options = [...lis].map((li, idx) => ({
                label: labels[idx] || String(idx + 1),
                html: li.innerHTML.trim()
              }));
              break;
            }
          }
        }
      }

      // Strategy 3: Look for (A), (B), (C), (D) pattern in text
      if (options.length === 0) {
        const qContent = doc.querySelector('.qa-q-view-content');
        if (qContent) {
          const text = qContent.innerHTML;
          const optionPattern = /\(([A-D])\)\s*(.*?)(?=\([A-D]\)|$)/gs;
          const matches = [...text.matchAll(optionPattern)];
          if (matches.length >= 2) {
            options = matches.map(m => ({
              label: m[1],
              html: m[2].trim()
            }));
          }
        }
      }

      // --- Extract answer ---
      let answer = null;
      
      // Look for the selected/correct answer indicator
      // GateOverflow shows answer in various ways
      const selectedAnswerEl = doc.querySelector('.qa-q-view-content .answer-key, .qa-q-view-content .selected-answer');
      if (selectedAnswerEl) {
        answer = selectedAnswerEl.textContent.trim();
      }

      // Look in the best answer / accepted answer
      if (!answer) {
        const bestAnswer = doc.querySelector('.qa-a-selected .qa-a-item-content');
        if (bestAnswer) {
          const answerText = bestAnswer.textContent.trim();
          // Try to extract just the letter answer
          const letterMatch = answerText.match(/(?:answer|option|correct)\s*(?:is|:)?\s*\(?([A-D](?:\s*[,;&]\s*[A-D])*)\)?/i);
          if (letterMatch) {
            answer = letterMatch[1].replace(/\s*[,;&]\s*/g, ';').toUpperCase();
          }
        }
      }

      // Also check for answer in metadata/tags
      if (!answer) {
        const metaTags = doc.querySelectorAll('.qa-q-view-tag-item');
        for (const tag of metaTags) {
          const text = tag.textContent.trim().toLowerCase();
          if (text.match(/^answer[:-]?\s*[a-d]$/i)) {
            answer = text.replace(/^answer[:-]?\s*/i, '').toUpperCase();
          }
        }
      }

      const result = {
        id: entry.id,
        number: entry.number,
        year: entry.year,
        url: entry.url,
        optionsFound: options.length,
        options: options,
        answer: answer,
        scraped: true,
        // Include raw question body for manual review if needed
        rawBodySnippet: doc.querySelector('.qa-q-view-content')?.textContent?.substring(0, 200) || null
      };

      results.push(result);
      success++;

      const status = options.length > 0 ? '✅ options' : '⚠️ no options';
      const answerStatus = answer ? `✅ answer: ${answer}` : '⚠️ no answer';
      console.log(`  ${status} (${options.length}) | ${answerStatus}`);

    } catch (err) {
      console.error(`  ❌ FAILED: ${err.message}`);
      results.push({
        id: entry.id,
        number: entry.number,
        year: entry.year,
        url: entry.url,
        optionsFound: 0,
        options: [],
        answer: null,
        scraped: false,
        error: err.message
      });
      failed++;
    }

    if (i < URLS.length - 1) await sleep(DELAY);
  }

  // Summary
  console.log(`\n%c📊 Scraping complete!`, 'font-size:14px;font-weight:bold;color:#2196F3');
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Options found: ${results.filter(r => r.optionsFound > 0).length}`);
  console.log(`  Answers found: ${results.filter(r => r.answer).length}`);

  // Auto-download as JSON
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scraped-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log(`\n%c💾 Downloaded scraped-data.json — save it to scripts/scraped-data.json`, 'font-size:13px;font-weight:bold;color:#FF9800');
  console.log(`Then run: node scripts/apply-scraped-fixes.mjs`);

  // Also store in window for manual inspection
  window.__scrapedData = results;
  console.log('Data also available at window.__scrapedData');
})();
