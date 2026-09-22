import json

with open('scripts/isro_manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)

# Compact manifest for script
compact_manifest = []
for item in manifest:
    compact_manifest.append({
        'id': f"isro_{item['number'].replace('.', '_')}",
        'num': item['number'],
        'title': f"{item['number']} {item['title']}",
        'url': item['url'],
        'subj': item['subject'],
        'sId': item['subjectId'],
        'top': item['topic'],
        'tId': item['topicId'],
        'yr': item['year'],
        'ans': item['answer']
    })

manifest_json = json.dumps(compact_manifest)

script_content = f"""// ===========================================================================
// FAST CONCURRENT ISRO CSE QUESTION HARVESTER (1,042 QUESTIONS)
// ===========================================================================

(async function harvestIsro() {{
  console.log('%c🚀 Starting ISRO CSE Fast Concurrent Harvester (1,042 Questions)...', 'font-size:16px;color:#4CAF50;font-weight:bold');

  const MANIFEST = {manifest_json};
  const TOTAL = MANIFEST.length;
  const CONCURRENCY = 6; // 6 concurrent fetches
  const results = [];
  let completed = 0;
  let cursor = 0;

  async function fetchWorker(workerId) {{
    while (cursor < TOTAL) {{
      const idx = cursor++;
      const item = MANIFEST[idx];
      try {{
        const res = await fetch(item.url);
        if (!res.ok) throw new Error(`HTTP ${{res.status}}`);
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const contentEl = doc.querySelector('.qa-q-view-content [itemprop="text"]') || doc.querySelector('.qa-q-view-content');
        if (!contentEl) {{
          console.warn(`[${{idx + 1}}/${{TOTAL}}] Empty content: ${{item.title}}`);
          continue;
        }}

        const clone = contentEl.cloneNode(true);
        clone.querySelector('a[name]')?.remove();

        const options = [];
        const optOl = clone.querySelector('ol[style*="alpha"], ol[type="A"], ol');
        if (optOl) {{
          const lis = Array.from(optOl.querySelectorAll(':scope > li'));
          const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
          lis.forEach((li, optIdx) => {{
            options.push({{
              label: labels[optIdx] || String(optIdx + 1),
              html: li.innerHTML.trim()
            }});
          }});
          optOl.remove();
        }}

        const bodyHtml = clone.innerHTML.trim();
        const qType = options.length > 0 ? 'mcq' : 'nat';

        results.push({{
          id: item.id,
          number: item.num,
          title: item.title,
          volume: 0,
          subject: item.subj,
          subjectId: item.sId,
          topic: item.top,
          topicId: item.tId,
          topicNumber: item.num.split('.').slice(0, 2).join('.'),
          year: item.yr,
          exam: "ISRO CSE",
          type: qType,
          bodyHtml: bodyHtml,
          options: options,
          answer: item.ans,
          gateOverflowUrl: item.url,
          answerUrl: item.url + '#ans',
          tags: ["isro", "isro-cse", item.sId]
        }});
      }} catch (err) {{
        console.error(`[${{idx + 1}}/${{TOTAL}}] Error on ${{item.title}}: ${{err.message}}`);
      }} finally {{
        completed++;
        if (completed % 50 === 0 || completed === TOTAL) {{
          console.log(`Progress: ${{completed}}/${{TOTAL}} (${{results.length}} captured)...`);
        }}
      }}
    }}
  }}

  // Launch worker pool
  const workers = Array.from({{ length: CONCURRENCY }}, (_, i) => fetchWorker(i));
  await Promise.all(workers);

  console.log(`%c✨ Harvest Complete! Successfully captured ${{results.length}} / ${{TOTAL}} questions.`, 'font-size:16px;color:#4CAF50;font-weight:bold');

  // Trigger Download
  const blob = new Blob([JSON.stringify(results, null, 2)], {{ type: 'application/json' }});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'isro-questions.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log('%c💾 Downloaded isro-questions.json! Move to scripts/isro-questions.json', 'font-size:14px;color:#FF9800;font-weight:bold');
}})();
"""

with open('scripts/scrape-isro.js', 'w', encoding='utf-8') as f:
    f.write(script_content)

print(f"Generated scripts/scrape-isro.js ({len(script_content)} bytes) for {len(compact_manifest)} questions.")
