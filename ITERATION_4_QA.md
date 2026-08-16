# Iteration 4 QA

## Scope
Dashboard/results/statistics/queue UX and user-performance wiring, while keeping Supabase as the source of persisted user state. No Supabase credentials were required for this code iteration.

## Implemented
- Dashboard now derives attempted, correct, incorrect, accuracy, bookmarks and revision counts from authenticated attempt/flag data.
- Dashboard subject coverage derives attempted/total and accuracy per subject.
- Statistics now includes personal question-type and subject performance when attempt history is available.
- Dataset statistics remain separate from user performance statistics.
- Signed-out state is explicit rather than presenting fake zero progress.
- Existing detailed session-results screen remains in place.

## QA performed
- Inspected all modified source files for route/import consistency.
- Confirmed no Supabase secret/key is embedded in source.
- Confirmed dashboard and statistics fall back to an explicit signed-out state when no authenticated user is available.
- Attempted `npm install --ignore-scripts --no-audit --no-fund` for production/type-check QA; dependency installation timed out in the execution environment. Therefore a real `next build` was not claimed.

## Deferred
- Live Supabase auth/RLS/persistence verification: intentionally deferred until credentials/project are supplied.
- Browser E2E QA: requires installed dependencies/runtime.
