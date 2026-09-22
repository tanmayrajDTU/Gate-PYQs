// ===========================================================================
// HARVEST FINAL 23 TIFR QUESTIONS TO REACH 100% (603 / 603)
// ===========================================================================

(async function harvestFinal23() {
  const missingTitles = [
    "1.3.3 TIFR CSE 2014 | Part B | Question: 8",
    "1.6.1 TIFR CSE 2024 | Part B | Question: 13",
    "1.11.6 TIFR CSE 2017 | Part A | Question: 12",
    "1.15.9 TIFR CSE 2021 | Part B | Question: 10",
    "1.24.11 TIFR CSE 2022 | Part B | Question: 11",
    "5.2.3 TIFR CSE 2017 | Part B | Question: 8",
    "5.5.1 TIFR CSE 2010 | Part A | Question: 9",
    "7.4.1 TIFR CSE 2010 | Part B | Question: 36",
    "7.7.6 TIFR CSE 2016 | Part B | Question: 11",
    "10.2.1 TIFR CSE 2023 | Part A | Question: 6",
    "10.3.1 TIFR CSE 2014 | Part A | Question: 15",
    "10.4.1 TIFR CSE 2011 | Part A | Question: 11",
    "10.4.2 TIFR CSE 2015 | Part A | Question: 10",
    "11.3.12 TIFR CSE 2024 | Part A | Question: 10",
    "13.1.1 TIFR CSE 2010 | Part A | Question: 1",
    "14.3.3 TIFR CSE 2020 | Part A | Question: 13",
    "14.10.8 TIFR CSE 2017 | Part A | Question: 13",
    "14.10.9 TIFR CSE 2017 | Part A | Question: 8",
    "14.11.1 TIFR CSE 2011 | Part A | Question: 20",
    "14.11.2 TIFR CSE 2018 | Part B | Question: 1",
    "14.11.3 TIFR CSE 2019 | Part A | Question: 2",
    "16.5.1 TIFR CSE 2025 | Part A | Question: 13",
    "19.1.46 TIFR LIDS 2025 | Question: 15"
  ];

  console.log(`%c🎯 Final Stretch: Harvesting the last ${missingTitles.length} questions...`, 'color:#4CAF50;font-weight:bold;font-size:15px');

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

    const allLinks = Array.from(document.querySelectorAll('a.bv-toc-label'));
    const linkEl = allLinks.find(a => a.innerText.trim().startsWith(qNum));

    if (!linkEl) {
      console.warn(`[${idx + 1}/${missingTitles.length}] Could not find TOC link for: ${title}`);
      continue;
    }

    linkEl.scrollIntoView({ block: 'nearest' });
    linkEl.click();

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
      console.warn(`[${idx + 1}/${missingTitles.length}] Timed out waiting for render: ${title}`);
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

  console.log(`%c🎉 Harvested all ${results.length} questions!`, 'font-size:16px;color:#4CAF50;font-weight:bold');

  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tifr-final-23.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log('%c💾 Downloaded tifr-final-23.json!', 'font-size:14px;color:#FF9800;font-weight:bold');
})();
