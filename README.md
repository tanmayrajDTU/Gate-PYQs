# GATE PYQ Complete Preparation Engine

A new Next.js practice website built around the fixed Volume 1–3 GATE PYQ dataset supplied in `html files.zip`.

## Included in this build
- Premium academic responsive UI
- Full dashboard shell
- Volume / subject / topic / year / type filters
- Sequential or random practice
- Optional timer
- Immediate or end-of-test feedback
- MCQ / MSQ / NAT / descriptive question rendering
- Question palette, mark-for-review, bookmarks
- GateOverflow links when a full solution is not embedded
- Detailed results screen
- Subject browser and dataset statistics
- Supabase auth entry point (email/password with email verification)
- SQL schema for attempts, flags and practice sessions

## Dataset
The source archive is normalized into `data/questions.json` and `catalog.json`, imported directly at build time (see `lib/data.ts`). The current source contains **3,822 unique question records** after deduplication (2,610 MCQ / 241 MSQ / 508 NAT / 463 descriptive — verified against `data/stats.json` and re-derived independently from the raw dataset).

## Run
```bash
npm install
npm run dev
```

For Supabase persistence, create a Supabase project, run `public/sql/supabase.sql`, then create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

In Supabase Authentication > Providers, ensure Email is enabled and "Confirm email" is turned on so new accounts must verify via the emailed link before they can sign in.


## Iteration 5
See `ITERATION_5_QA.md`. Run `npm run qa:data` to validate the bundled question dataset.
