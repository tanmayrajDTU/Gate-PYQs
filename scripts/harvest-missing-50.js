// ===========================================================================
// TARGETED HARVESTER FOR THE 50 MISSED TIFR QUESTIONS
// Runs only for the 50 questions that were skipped due to network/render delays.
//
// HOW TO USE:
//   1. On https://gateoverflow.in/book/book_filter5
//   2. Open DevTools Console
//   3. Paste and run this script
//   4. It will safely click, wait (with retry), and download `tifr-missing-50.json`
// ===========================================================================

(async function harvestMissingTifr() {
  const missingTitles = [
    "1.3.2 TIFR CSE 2012 | Part B | Question: 6",
    "1.5.1 TIFR CSE 2024 | Part A | Question: 3",
    "1.11.5 TIFR CSE 2016 | Part B | Question: 12",
    "1.15.8 TIFR CSE 2019 | Part B | Question: 2",
    "1.24.10 TIFR CSE 2021 | Part B | Question: 15",
    "5.2.2 TIFR CSE 2014 | Part B | Question: 17",
    "5.4.1 TIFR CSE 2015 | Part A | Question: 4",
    "7.3.1 TIFR CSE 2024 | Part B | Question: 14",
    "7.7.5 TIFR CSE 2016 | Part A | Question: 2",
    "9.8.2 TIFR CSE 2010 | Part A | Question: 18",
    "9.8.3 TIFR CSE 2011 | Part A | Question: 10",
    "9.8.4 TIFR CSE 2011 | Part B | Question: 23",
    "9.8.5 TIFR CSE 2012 | Part A | Question: 8",
    "9.8.6 TIFR CSE 2016 | Part A | Question: 8",
    "9.8.7 TIFR CSE 2016 | Part B | Question: 14",
    "9.8.8 TIFR CSE 2019 | Part A | Question: 1",
    "9.8.9 TIFR CSE 2021 | Part A | Question: 9",
    "9.8.10 TIFR CSE 2022 | Part A | Question: 11",
    "9.8.11 TIFR CSE 2022 | Part A | Question: 9",
    "9.8.12 TIFR CSE 2023 | Part A | Question: 10",
    "9.8.13 TIFR CSE 2023 | Part A | Question: 11",
    "9.8.14 TIFR CSE 2025 | Part A | Question: 15",
    "11.3.11 TIFR CSE 2023 | Part A | Question: 5",
    "12.14.8 TIFR CSE 2022 | Part A | Question: 7",
    "14.3.2 TIFR CSE 2018 | Part A | Question: 1",
    "14.4.1 TIFR CSE 2010 | Part A | Question: 2",
    "14.4.2 TIFR CSE 2013 | Part A | Question: 20",
    "14.4.3 TIFR CSE 2014 | Part A | Question: 10",
    "14.4.4 TIFR CSE 2020 | Part A | Question: 12",
    "14.4.5 TIFR CSE 2025 | Part A | Question: 10",
    "14.5.1 TIFR CSE 2011 | Part A | Question: 13",
    "14.5.2 TIFR CSE 2011 | Part A | Question: 5",
    "14.5.3 TIFR CSE 2013 | Part A | Question: 7",
    "14.6.1 TIFR CSE 2014 | Part A | Question: 12",
    "14.7.1 TIFR CSE 2012 | Part A | Question: 6",
    "14.8.1 TIFR CSE 2010 | Part A | Question: 20",
    "14.8.2 TIFR CSE 2011 | Part A | Question: 15",
    "14.8.3 TIFR CSE 2013 | Part A | Question: 12",
    "14.9.1 TIFR CSE 2014 | Part A | Question: 11",
    "14.9.2 TIFR CSE 2017 | Part A | Question: 1",
    "14.10.1 TIFR CSE 2010 | Part A | Question: 17",
    "14.10.2 TIFR CSE 2012 | Part A | Question: 4",
    "14.10.3 TIFR CSE 2012 | Part A | Question: 5",
    "14.10.4 TIFR CSE 2013 | Part A | Question: 5",
    "14.10.5 TIFR CSE 2015 | Part A | Question: 2",
    "14.10.6 TIFR CSE 2015 | Part A | Question: 9",
    "14.10.7 TIFR CSE 2016 | Part A | Question: 9",
    "16.4.1 TIFR CSE 2024 | Part A | Question: 1",
    "19.1.44 TIFR LIDS 2024 | Question: 2",
    "19.1.45 TIFR LIDS 2024 | Question: 1"
  ];

  console.log(`%c🎯 Target: Harvesting ${missingTitles.length} missing questions with smart polling...`, 'color:#4CAF50;font-weight:bold;font-size:15px');

  function cleanMathJax(element) {
    const scripts = Array.from(element.querySelectorAll('script[type^="math/tex"]'));
    for (const script of scripts) {
      const isDisplay = script.type.includes('mode=display') || script.innerText.includes('\\displaystyle');
      const tex = script.innerText.trim();
      const delimiter = isDisplay ? '$$' : '$';
      const textNode = document.createTextNode(`${delimiter}${tex}${delimiter}`);
      
      let prev = script.previousElementSibling;
      while (prev && (prev.classList.contains('MathJax') || prev.classList.contains('MathJax_Preview') || prev.classList.contains('MJX_Assistive_MathML'))) {
        const toRemove = prev;
        prev = prev.previousElementSibling;
        toRemove.remove();
      }
      script.replaceWith(textNode);
    }
    element.querySelectorAll('.MathJax_Preview, .MathJax, .MJX_Assistive_MathML').forEach(e => e.remove());
  }

  // Topic Map
  const topicMap = {};
  document.querySelectorAll('div.bv-toc-row a.bv-toc-label').forEach(a => {
    const numEl = a.querySelector('.bv-num');
    if (numEl) {
      const num = numEl.innerText.trim();
      if (num.split('.').length <= 2) {
        const clone = a.cloneNode(true);
        clone.querySelectorAll('.bv-num, .bv-count').forEach(e => e.remove());
        const name = clone.innerText.trim();
        if (name) topicMap[num] = name;
      }
    }
  });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const results = [];

  for (let idx = 0; idx < missingTitles.length; idx++) {
    const title = missingTitles[idx];
    const qNum = title.split(/\s+/)[0];

    // Find link in TOC
    const allLinks = Array.from(document.querySelectorAll('a.bv-toc-label'));
    const linkEl = allLinks.find(a => a.innerText.trim().startsWith(qNum));

    if (!linkEl) {
      console.warn(`[${idx + 1}/${missingTitles.length}] Could not find TOC link for: ${title}`);
      continue;
    }

    // Scroll into view & click
    linkEl.scrollIntoView({ block: 'nearest' });
    linkEl.click();

    // Smart poll: wait until div.question has rendered and its title contains qNum
    let qContainer = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      await sleep(150);
      const curr = document.querySelector('div.question');
      if (curr) {
        const head = curr.querySelector('.question-title')?.innerText || curr.innerText || '';
        if (head.includes(qNum)) {
          qContainer = curr;
          break;
        }
      }
    }

    if (!qContainer) {
      console.warn(`[${idx + 1}/${missingTitles.length}] Timed out waiting for pane render: ${title}`);
      continue;
    }

    const titleEl = qContainer.querySelector('.question-title');
    const contentEl = qContainer.querySelector('.question-content');
    const answersEl = qContainer.querySelector('.answers');

    const metaBtn = titleEl?.querySelector('button.bv-lists-btn, button.bv-note-btn, button.bv-status-btn') 
                 || qContainer.querySelector('button.bv-lists-btn, button.bv-note-btn');
    const postId = metaBtn?.dataset.postid || answersEl?.querySelector('.bv-practice-panel')?.dataset.postid;
    const goUrl = metaBtn?.dataset.siteurl || titleEl?.querySelector('a[href*="gateoverflow.in/"]')?.href || null;

    const practicePanel = answersEl?.querySelector('.bv-practice-panel');
    let answer = practicePanel?.dataset.answer?.trim() || null;
    let qType = practicePanel?.dataset.qtype?.toLowerCase() || null;

    if (!answer) {
      const answerVal = answersEl?.querySelector('.bv-answer-value');
      if (answerVal) {
        const txt = answerVal.innerText.replace('🔗', '').trim();
        if (txt) answer = txt.split(/\s+/)[0];
      }
    }

    const answerLink = answersEl?.querySelector('a.bv-answer-link');
    const answerUrl = answerLink?.href || (goUrl && answer ? `${goUrl}#ans` : null);

    const options = [];
    let bodyHtml = '';

    if (contentEl) {
      const clone = contentEl.cloneNode(true);
      const optOl = clone.querySelector('ol.shrink-inline-options2, ol[style*="alpha"], ol[type="A"], ol.options');
      if (optOl) {
        const lis = Array.from(optOl.querySelectorAll(':scope > li'));
        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
        lis.forEach((li, optIdx) => {
          cleanMathJax(li);
          options.push({
            label: labels[optIdx] || String(optIdx + 1),
            html: li.innerHTML.trim()
          });
        });
        optOl.remove();
      }

      cleanMathJax(clone);
      bodyHtml = clone.innerHTML.trim();
    }

    const numSegments = qNum.split('.');
    const chapterNum = numSegments[0];
    const topicNum = numSegments.slice(0, 2).join('.');

    const subject = topicMap[chapterNum] || "TIFR Computer Science";
    const topic = topicMap[topicNum] || "TIFR PYQ";
    const subjectId = 'tifr_' + subject.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const topicId = 'tifr_' + topic.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    const yearMatch = title.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? Number(yearMatch[1]) : null;

    if (!qType) {
      qType = options.length > 0 ? 'mcq' : 'nat';
    }

    results.push({
      id: postId ? `tifr_${postId}` : `tifr_${qNum.replace(/\./g, '_')}`,
      number: qNum,
      title: title,
      volume: 0,
      subject: subject,
      subjectId: subjectId,
      topic: topic,
      topicId: topicId,
      topicNumber: topicNum,
      year: year,
      exam: "TIFR CSE",
      type: qType,
      bodyHtml: bodyHtml,
      options: options,
      answer: answer,
      gateOverflowUrl: goUrl,
      answerUrl: answerUrl,
      tags: ["tifr", "tifr-cse", subjectId]
    });

    console.log(`[${idx + 1}/${missingTitles.length}] ✅ Harvested: ${title} | Ans: ${answer || 'none'}`);
  }

  console.log(`%c🎉 Harvested ${results.length} of ${missingTitles.length} missing questions!`, 'font-size:16px;color:#4CAF50;font-weight:bold');

  // Trigger download
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tifr-missing-50.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log('%c💾 Downloaded tifr-missing-50.json!', 'font-size:14px;color:#FF9800;font-weight:bold');
})();
