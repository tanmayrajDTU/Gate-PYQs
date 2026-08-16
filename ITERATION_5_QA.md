# Iteration 5 — QA / Hardening Report

## Scope

Iteration 5 is a hardening pass. No new product category was added. The focus is route correctness, queue actions, practice-session safety, source-data invariants, and obvious compile-time defects.

## Changes

- Fixed missing `X` icon import in `AppShell`.
- Replaced the global `React.ReactNode` reference in `app/layout.tsx` with an explicit `ReactNode` type import.
- Queue actions now point to their actual practice modes:
  - `/practice?only=bookmarks`
  - `/practice?only=revision`
  - `/practice?only=incorrect`
- Practice builder now resolves those saved queues from the authenticated user's Supabase state when configured.
- Added loading/error state for saved-queue practice.
- Timer expiry now finishes the session through the same completion path instead of only flipping local state.
- Added a browser `beforeunload` guard while an active practice session is running.
- Added `npm run qa:data` static dataset validation.
- Rechecked the bundled dataset: 3,822 unique questions; 2,610 MCQ, 241 MSQ, 508 NAT, 463 descriptive.
- Enforced the invariant that NAT/descriptive questions have no option array and MCQ/MSQ questions have options.

## QA limitations

A complete `npm install` could not be completed in the execution environment because package retrieval timed out. Therefore a real `next build`, browser E2E run, and live Supabase/RLS test are **not claimed**.

The bundled data QA can be run locally with:

```bash
npm install
npm run qa:data
npm run build
```

## Remaining items

- Live Supabase authentication/RLS/persistence QA.
- Full interrupted-session resume flow across devices.
- Browser-level mobile/desktop E2E.
- Production build verification after dependencies are installed.


## Data normalization correction found during Iteration 5 QA

The invariant check identified four records where HTML extraction had produced an `options` array even though the normalized question type was NAT/descriptive:

- `question514` — descriptive
- `question118746` — NAT
- `question87074` — descriptive
- `question19701` — NAT

These are not answer-choice questions; their HTML contains table/list structures that were incorrectly interpreted as options. Their normalized `options` arrays have been cleared while retaining the original `bodyHtml`.

Final data QA now reports **0 invariant errors**.
