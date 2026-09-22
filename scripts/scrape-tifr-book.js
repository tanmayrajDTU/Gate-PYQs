// ===========================================================================
// COMPLETE TIFR CS BOOK SCRAPER
// Extracts all 603 questions, options, answers, and GateOverflow URLs from
// the Book Viewer at https://gateoverflow.in/book/book_filter5
//
// Automatically maps:
//   - Full question body HTML with MathJax converted to standard LaTeX ($...$, $$...$$)
//   - MCQ options with LaTeX preserved
//   - Official Answers and direct answer discussion URLs
//   - TOC Chapter and Topic names from the Book outline
// ===========================================================================

(async function scrapeTifrBook() {
  console.log('%c🚀 Starting TIFR CS Question Harvester...', 'font-size:16px;color:#4CAF50;font-weight:bold');

  // Helper: Convert MathJax DOM back to standard LaTeX math delimiters ($ and $$)
  function cleanMathJax(element) {
    const scripts = Array.from(element.querySelectorAll('script[type^="math/tex"]'));
    for (const script of scripts) {
      const isDisplay = script.type.includes('mode=display') || script.innerText.includes('\\displaystyle');
      const tex = script.innerText.trim();
      const delimiter = isDisplay ? '$$' : '$';
      const textNode = document.createTextNode(`${delimiter}${tex}${delimiter}`);
      
      // Remove preceding MathJax preview/rendering elements
      let prev = script.previousElementSibling;
      while (prev && (prev.classList.contains('MathJax') || prev.classList.contains('MathJax_Preview') || prev.classList.contains('MJX_Assistive_MathML'))) {
        const toRemove = prev;
        prev = prev.previousElementSibling;
        toRemove.remove();
      }
      script.replaceWith(textNode);
    }
    // Clean any leftover MathJax artifacts
    element.querySelectorAll('.MathJax_Preview, .MathJax, .MJX_Assistive_MathML').forEach(e => e.remove());
  }

  // Step 1: Expand all sections in tree if not already expanded
  const expandBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'expand all');
  if (expandBtn) {
    console.log('Expanding all sections in tree...');
    expandBtn.click();
    await new Promise(r => setTimeout(r, 1200));
  }

  // Step 2: Build Topic and Chapter Map from TOC
  const topicMap = {};
  document.querySelectorAll('div.bv-toc-row a.bv-toc-label').forEach(a => {
    const numEl = a.querySelector('.bv-num');
    if (numEl) {
      const num = numEl.innerText.trim();
      // Category rows like "1" (Chapter/Subject) or "1.2" (Topic)
      if (num.split('.').length <= 2) {
        const clone = a.cloneNode(true);
        clone.querySelectorAll('.bv-num, .bv-count').forEach(e => e.remove());
        const name = clone.innerText.trim();
        if (name) topicMap[num] = name;
      }
    }
  });
  console.log('Detected TOC Chapters/Topics:', topicMap);

  // Step 3: Find all question leaf links in TOC
  const questionLinks = Array.from(document.querySelectorAll('a.bv-toc-label')).filter(a => 
    /^\d+\.\d+\.\d+/i.test(a.innerText.trim())
  );

  console.log(`%cFound ${questionLinks.length} question items in tree. Harvesting now...`, 'color:#2196F3;font-weight:bold');

  const results = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < questionLinks.length; i++) {
    const linkEl = questionLinks[i];
    const fullTocTitle = linkEl.innerText.trim();

    // Click link to load question in right pane
    linkEl.click();
    await sleep(240); // wait for right pane to populate

    const qContainer = document.querySelector('div.question');
    if (!qContainer) {
      console.warn(`[${i+1}/${questionLinks.length}] Missing div.question for: ${fullTocTitle}`);
      continue;
    }

    const titleEl = qContainer.querySelector('.question-title');
    const contentEl = qContainer.querySelector('.question-content');
    const answersEl = qContainer.querySelector('.answers');

    // 1. Post ID & GateOverflow URL
    const metaBtn = titleEl?.querySelector('button.bv-lists-btn, button.bv-note-btn, button.bv-status-btn') 
                 || qContainer.querySelector('button.bv-lists-btn, button.bv-note-btn');
    const postId = metaBtn?.dataset.postid || answersEl?.querySelector('.bv-practice-panel')?.dataset.postid;
    const goUrl = metaBtn?.dataset.siteurl || titleEl?.querySelector('a[href*="gateoverflow.in/"]')?.href || null;

    // 2. Answer & Question Type
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

    // 3. Direct Answer Link
    const answerLink = answersEl?.querySelector('a.bv-answer-link');
    const answerUrl = answerLink?.href || (goUrl && answer ? `${goUrl}#ans` : null);

    // 4. Options and Clean Body
    const options = [];
    let bodyHtml = '';

    if (contentEl) {
      const clone = contentEl.cloneNode(true);
      const optOl = clone.querySelector('ol.shrink-inline-options2, ol[style*="alpha"], ol[type="A"], ol.options');
      if (optOl) {
        const lis = Array.from(optOl.querySelectorAll(':scope > li'));
        const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
        lis.forEach((li, idx) => {
          cleanMathJax(li);
          options.push({
            label: labels[idx] || String(idx + 1),
            html: li.innerHTML.trim()
          });
        });
        optOl.remove(); // Remove options list from body
      }

      cleanMathJax(clone);
      bodyHtml = clone.innerHTML.trim();
    } else {
      const clone = qContainer.cloneNode(true);
      clone.querySelectorAll('.question-title, .answers, button, h1, h2, h3, h4').forEach(e => e.remove());
      cleanMathJax(clone);
      bodyHtml = clone.innerHTML.trim();
    }

    // 5. Hierarchy: Number, Topic, Subject, Year
    const parts = fullTocTitle.split(/\s+/);
    const qNumber = parts[0] || `TIFR-${i+1}`;
    const numSegments = qNumber.split('.');
    const chapterNum = numSegments[0]; // e.g. "1"
    const topicNum = numSegments.slice(0, 2).join('.'); // e.g. "1.2"

    const subject = topicMap[chapterNum] || "TIFR Computer Science";
    const topic = topicMap[topicNum] || "TIFR PYQ";
    const subjectId = 'tifr_' + subject.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const topicId = 'tifr_' + topic.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    const yearMatch = fullTocTitle.match(/\b(19\d\d|20\d\d)\b/);
    const year = yearMatch ? Number(yearMatch[1]) : null;

    if (!qType) {
      qType = options.length > 0 ? 'mcq' : 'nat';
    }

    const item = {
      id: postId ? `tifr_${postId}` : `tifr_${i+1}`,
      number: qNumber,
      title: fullTocTitle,
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
    };

    results.push(item);

    if ((i + 1) % 25 === 0 || i === questionLinks.length - 1) {
      console.log(`[${i + 1}/${questionLinks.length}] Harvested: ${fullTocTitle} | Subject: ${subject} | Ans: ${answer || 'none'} | Options: ${options.length}`);
    }
  }

  console.log(`%c✨ Scraping Complete! Total questions extracted: ${results.length}`, 'font-size:16px;color:#4CAF50;font-weight:bold');

  // Trigger JSON Download
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tifr-questions.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log('%c💾 Downloaded tifr-questions.json! Move this file into scripts/tifr-questions.json in your project.', 'font-size:14px;color:#FF9800;font-weight:bold');
})();
