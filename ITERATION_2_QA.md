# Iteration 2 QA — Practice Engine

## Scope

Iteration 2 focused on compilation blockers and the core practice engine:

- repaired `app/practice/page.tsx` JSX/parser failure;
- implemented dependent practice filters and subject/topic URL preselection;
- corrected random selection to shuffle the full filtered pool before taking N questions;
- added explicit MCQ/MSQ/NAT/descriptive rendering behavior;
- added numerical NAT comparison with floating-point tolerance;
- added session timer and elapsed-time tracking;
- added keyboard navigation (`←`, `→`, `R`, `B`, `S`);
- added detailed in-session results metrics;
- removed the non-functional custom-timer selector.

## Static validation

- The previous JSX parser errors in `app/practice/page.tsx` are gone.
- A full TypeScript compile could not be completed because this execution environment cannot install the project's npm dependencies (`npm install --ignore-scripts` timed out). The remaining `tsc` diagnostics are dependency/type-environment errors, not the previous JSX parse errors.
- No production `next build` claim is made without dependencies installed.

## Functional checks performed by code inspection

### Practice selection
- Sequential mode: takes the first N questions from the filtered pool.
- Random mode: Fisher-Yates shuffles the complete filtered pool, then takes N.
- Subject/topic/year/type filters are applied before selection.
- `/practice?subject=<subjectId>` preselects the subject.
- Topic and year reset appropriately when parent filters change.

### Question types
- MCQ: single selection.
- MSQ: multiple selection.
- NAT: numerical input; no options rendered.
- Descriptive: no selectable answer is assumed.
- Option rendering is gated to MCQ/MSQ so a malformed option array cannot force an option UI onto NAT/descriptive questions.

### Feedback
- Immediate mode shows correctness when an evaluable answer exists.
- End-of-test mode defers correctness to the results screen.
- Descriptive questions are reported as recorded rather than falsely scored.
- GateOverflow link is shown when available.

### Results
- total questions;
- attempted;
- unanswered;
- correct;
- accuracy based on evaluable attempted questions;
- elapsed time;
- average time/question;
- evaluable-question count;
- per-question review state and source link.

## Known limitations carried into Iteration 3

- Supabase persistence is not yet wired into the practice engine.
- Bookmarks/revision are still session-local.
- Active session recovery after refresh/close is not implemented yet.
- Dashboard statistics are not yet connected to real attempt history.
- Full browser E2E testing requires successful dependency installation/build.
