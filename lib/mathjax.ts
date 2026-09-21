declare global {
  interface Window {
    MathJax?: {
      startup?: { promise?: Promise<void> };
      typesetPromise?: (elements?: Element[]) => Promise<void>;
    };
  }
}

let readyPromise: Promise<void> | null = null;

function waitForMathJax(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (readyPromise) return readyPromise;
  readyPromise = new Promise(resolve => {
    const check = () => {
      const mj = window.MathJax;
      if (mj?.startup?.promise) {
        mj.startup.promise.then(() => resolve());
      } else if (mj?.typesetPromise) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
  return readyPromise;
}

export async function typesetMath(elements?: Element[]): Promise<void> {
  await waitForMathJax();
  try {
    await window.MathJax?.typesetPromise?.(elements);
  } catch {
    // MathJax throws if called again before a prior typeset finishes; safe to ignore.
  }
}
