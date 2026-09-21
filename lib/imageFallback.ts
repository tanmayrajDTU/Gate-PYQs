// Question/option HTML currently hotlinks diagram images straight from
// gateoverflow.in (see scripts/download-question-images.mjs for the proper
// long-term fix — self-hosting them under public/question-images/).
//
// Until every question has been migrated to a local image, this is a
// safety net: if a hotlinked image fails to load (GateOverflow renames a
// blob, rate-limits us, goes down, etc.), we don't want a silent broken-image
// icon sitting in the middle of a question the person is trying to answer.
// Instead we hide the broken image and drop in a visible link to view the
// diagram on GateOverflow directly.
export function attachImageFallback(root: HTMLElement | null, gateOverflowUrl?: string | null) {
  if (!root) return;
  const imgs = root.querySelectorAll<HTMLImageElement>('img');
  imgs.forEach(img => {
    if (img.dataset.fallbackAttached === '1') return;
    img.dataset.fallbackAttached = '1';
    img.addEventListener(
      'error',
      () => {
        if (img.dataset.fallbackApplied === '1') return;
        img.dataset.fallbackApplied = '1';
        img.style.display = 'none';

        const el = document.createElement(gateOverflowUrl ? 'a' : 'span');
        el.className = 'img-fallback-notice';
        el.textContent = gateOverflowUrl
          ? 'Image unavailable here — view the diagram on GateOverflow ↗'
          : 'Image unavailable';
        if (gateOverflowUrl) {
          (el as HTMLAnchorElement).href = gateOverflowUrl;
          (el as HTMLAnchorElement).target = '_blank';
          (el as HTMLAnchorElement).rel = 'noreferrer';
        }
        img.insertAdjacentElement('afterend', el);
      },
      { once: true }
    );
  });
}
