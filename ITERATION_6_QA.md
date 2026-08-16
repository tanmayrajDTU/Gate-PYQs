# Iteration 6 — Independent QA Audit & Fixes

## Scope

This iteration did not trust any prior ITERATION_*_QA.md claim. The dataset
was recomputed from scratch with an independent script, and every relevant
subsystem (randomization, MCQ/MSQ/NAT scoring, feedback-mode separation,
bookmarks/revision, incorrect-history, dashboard, auth, Supabase/RLS,
XSS handling) was re-read from source, not assumed correct.

## Independently verified (no changes needed)

- Dataset totals match `data/stats.json`: 3,822 total — 2,610 MCQ / 241 MSQ /
  508 NAT / 463 descriptive. 0 duplicate IDs, 0 type/options invariant
  violations.
- Random mode correctly shuffles the *entire* filtered pool before slicing
  to N (not filter → take-N → shuffle).
- MCQ/MSQ/NAT scoring (`evaluateAnswer` in `PracticeClient.tsx`) uses
  set comparison for MCQ/MSQ and numeric-tolerance comparison for NAT, not
  string equality.
- Immediate vs. end-of-test feedback modes genuinely differ — correctness is
  never revealed in `QuestionRenderer` itself, only in the immediate-feedback
  block gated on `feedback === 'immediate'`.
- Bookmark and Revision flags are stored and toggled independently.
- Supabase client only ever uses the public anon key; no `service_role` key
  anywhere in the codebase. RLS policies in `public/sql/supabase.sql` are
  correctly scoped to `auth.uid() = user_id` on all four tables.
- Dashboard and results numbers are computed from real session/attempt state,
  not hardcoded.

## Issues found and fixed this iteration

1. **Unsanitized HTML injection (XSS risk).** `QuestionRenderer.tsx` rendered
   `bodyHtml` and option `html` via `dangerouslySetInnerHTML` with no
   sanitization anywhere in the codebase. Added `lib/sanitizeHtml.ts`, a
   dependency-free allowlist sanitizer (strips `<script>`/`<iframe>`/`<form>`/
   event handlers/`javascript:` URLs), and wired it into both render sites.
   This is a stopgap — swap in a vetted library (e.g. `isomorphic-dompurify`)
   once package installation is available in the target environment.
2. **Duplicated filter-status notice** in `app/practice/page.tsx` — the same
   `<div className="notice">` was rendered twice due to a copy-paste error.
3. **Stale dataset count in README** — claimed 3,815 questions; corrected to
   the verified 3,822 with the full type breakdown.
4. **Dashboard stat-basis mismatch** — `correct`/`incorrect`/accuracy (both
   overall and per-subject) were computed from raw attempt rows while
   `attempted` was a unique-question count, so retried questions could make
   correct+incorrect exceed attempted. Both now derive from each question's
   *latest* attempt result, on the same unique-question basis as `attempted`.
5. **234 questions missing structured `year`.** All were General Aptitude /
   Passage Reading items shared across GATE branches (e.g. "GATE2010 MN:
   GA-6") where the year was present in the title text but never parsed into
   the `year` field, silently excluding them from the year filter. Backfilled
   232 of 234 by parsing the year out of the title (two patterns tried); the
   remaining 2 ("GATE CS Practice" items) genuinely have no exam year and are
   correctly left null. Applied identically to `data/questions.json` and
   `public/data/questions.json` — both files remain byte-identical.

## Not verifiable in this environment

`npm install` fails with `403 Forbidden` against the npm registry in this
sandbox (no network egress), so `npm run lint`, `npm run typecheck`, and
`npm run build` could not be executed here, and no live browser/E2E or
live-Supabase testing was possible. These must be run in an environment with
registry access before release. Nothing in this iteration's code review
surfaced an obvious lint/type error, but that is not a substitute for
actually running the commands.

## Remaining items for a future iteration

- Run `npm install && npm run lint && npm run typecheck && npm run build` in
  an environment with registry access, and fix anything that surfaces.
- Live Supabase project: configure real credentials, test auth (incl. Google
  OAuth, which is wired up but unconfigured/untested), attempt/bookmark/
  revision persistence, and RLS isolation across two accounts.
- Browser-level E2E across desktop/tablet/mobile viewports.
- Swap the stopgap sanitizer for a vetted HTML-sanitization library.
