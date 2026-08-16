
# Iteration 3 — Supabase persistence

Implemented:
- Auth-aware Supabase browser client usage.
- Persistent question attempts on submission.
- Persistent independent bookmark/revision flags.
- Practice session creation and resumable runtime snapshots.
- Session completion persistence.
- Persistent incorrect-question history page.
- Persistent bookmark queue page.
- Persistent revision queue page.
- Login/signup plus password reset flow.
- Authenticated user menu with logout.
- RLS schema tightened with indexes and idempotent policy creation.

Required environment variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase legacy anon/publishable client key)

No service-role key is required or should be exposed to the browser.

Live Supabase verification requires a real Supabase project URL and client key, plus execution of public/sql/supabase.sql in that project's SQL editor.
