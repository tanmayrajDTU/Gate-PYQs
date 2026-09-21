// scripts/download-question-images.mjs
//
// One-time (idempotent) fix for hotlinked question images.
//
// Right now every diagram/image in data/questions.json is an <img src="...">
// pointing straight at gateoverflow.in. That means every one of those
// images is a single point of failure outside your control: if GateOverflow
// renames their blob URL scheme, rate-limits hotlinking, or the question
// gets deleted upstream, the image silently disappears from your app with
// no warning.
//
// This script downloads every such image ONCE, saves it under
// public/question-images/, and rewrites data/questions.json (and the
// public/data/questions.json mirror) to reference the local copy instead.
// From then on your app no longer depends on gateoverflow.in staying up.
//
// WHY THIS RUNS LOCALLY, NOT IN THE CHAT SANDBOX:
// The sandbox this project was edited in only allows network egress to a
// fixed allowlist (npm, pypi, github, etc.) — gateoverflow.in isn't on it,
// so the download step has to happen on your own machine, where your
// network isn't restricted.
//
// USAGE:
//   node scripts/download-question-images.mjs            # dry run: reports what it would do
//   node scripts/download-question-images.mjs --apply     # actually downloads + rewrites JSON
//
// Safe to re-run: images already downloaded (present on disk AND already
// pointed at locally in the JSON) are skipped, so interrupting and
// re-running just resumes.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const DATA_PATHS = [
  path.join(ROOT, 'data', 'questions.json'),
  path.join(ROOT, 'public', 'data', 'questions.json'),
];
const IMAGE_DIR = path.join(ROOT, 'public', 'question-images');
const LOCAL_PREFIX = '/question-images/';

// Be polite to GateOverflow — small delay between requests instead of
// hammering them with 475 simultaneous connections.
const DELAY_MS = 250;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function extFromContentType(ct) {
  if (!ct) return 'png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('svg')) return 'svg';
  return 'png';
}

function extractImageSrcs(html) {
  const out = [];
  const re = /<img[^>]+src="([^"]+)"/g;
  let m;
  while ((m = re.exec(html || ''))) out.push(m[1]);
  return out;
}

function keyForUrl(url) {
  // GateOverflow blob URLs carry a qa_blobid — use it as the stable local
  // filename so the same image referenced from multiple questions/options
  // only gets downloaded once. Fall back to a hash of the full URL for
  // anything that doesn't match that pattern.
  const m = url.match(/qa_blobid=(\d+)/);
  if (m) return `blob-${m[1]}`;
  let h = 0;
  for (const c of url) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `img-${h.toString(16)}`;
}

async function main() {
  if (!existsSync(IMAGE_DIR)) mkdirSync(IMAGE_DIR, { recursive: true });

  const primary = JSON.parse(readFileSync(DATA_PATHS[0], 'utf-8'));

  // Collect every distinct external image URL across bodyHtml + all option html.
  const urlToKey = new Map();
  for (const q of primary) {
    const htmls = [q.bodyHtml, ...(q.options || []).map(o => o.html)];
    for (const html of htmls) {
      for (const src of extractImageSrcs(html)) {
        if (src.startsWith(LOCAL_PREFIX)) continue; // already migrated
        if (!urlToKey.has(src)) urlToKey.set(src, keyForUrl(src));
      }
    }
  }

  console.log(`Found ${urlToKey.size} distinct external image URL(s) to process.`);
  console.log(APPLY ? 'Running in APPLY mode.' : 'Running in DRY-RUN mode (pass --apply to actually download + rewrite).');

  // key -> local filename (with extension), filled in as we go
  const keyToFilename = new Map();
  const failures = [];
  let downloaded = 0, skipped = 0;

  for (const [url, key] of urlToKey) {
    // If we've already saved this key before (any extension), reuse it.
    const existing = ['jpg', 'png', 'gif', 'webp', 'svg']
      .map(ext => `${key}.${ext}`)
      .find(fname => existsSync(path.join(IMAGE_DIR, fname)));
    if (existing) {
      keyToFilename.set(key, existing);
      skipped++;
      continue;
    }

    if (!APPLY) {
      keyToFilename.set(key, `${key}.png`); // placeholder for dry-run reporting
      continue;
    }

    try {
      const decoded = url.replace(/&amp;/g, '&');
      const res = await fetch(decoded, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GATE-practice-image-mirror/1.0)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = extFromContentType(res.headers.get('content-type'));
      const filename = `${key}.${ext}`;
      writeFileSync(path.join(IMAGE_DIR, filename), buf);
      keyToFilename.set(key, filename);
      downloaded++;
      console.log(`  ✓ ${filename}  (${(buf.length / 1024).toFixed(1)} KB)  <- ${decoded.slice(0, 90)}`);
    } catch (err) {
      failures.push({ url, key, error: String(err) });
      console.warn(`  ✗ FAILED  ${key}  <- ${url.slice(0, 90)}  (${err})`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDownloaded: ${downloaded}, already had: ${skipped}, failed: ${failures.length}`);

  if (!APPLY) {
    console.log('\nDry run complete — no files written, no JSON rewritten. Re-run with --apply.');
    return;
  }

  // Rewrite both copies of questions.json, replacing every external src
  // with its local counterpart. URLs that failed to download are left as
  // the original external link (attachImageFallback in the app will still
  // catch them gracefully if the source later goes down).
  for (const dataPath of DATA_PATHS) {
    const arr = JSON.parse(readFileSync(dataPath, 'utf-8'));
    let replaced = 0;
    for (const q of arr) {
      const rewrite = html => {
        if (!html) return html;
        return html.replace(/<img([^>]+)src="([^"]+)"/g, (full, pre, src) => {
          if (src.startsWith(LOCAL_PREFIX)) return full;
          const key = urlToKey.get(src);
          const filename = key && keyToFilename.get(key);
          if (!filename) return full; // failed download, leave as-is
          replaced++;
          return `<img${pre}src="${LOCAL_PREFIX}${filename}"`;
        });
      };
      q.bodyHtml = rewrite(q.bodyHtml);
      if (q.options) q.options = q.options.map(o => ({ ...o, html: rewrite(o.html) }));
    }
    writeFileSync(dataPath, JSON.stringify(arr, null, 2), 'utf-8');
    console.log(`Rewrote ${replaced} <img> tag(s) in ${path.relative(ROOT, dataPath)}`);
  }

  if (failures.length) {
    const failPath = path.join(ROOT, 'image-download-failures.json');
    writeFileSync(failPath, JSON.stringify(failures, null, 2));
    console.log(`\n${failures.length} image(s) could not be downloaded — see ${path.relative(ROOT, failPath)} for the list. Those questions still hotlink GateOverflow and rely on the in-app fallback if that source ever breaks.`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
