-- GATE PYQ Practice Engine: user-state schema
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.question_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  session_id uuid,
  answer jsonb,
  result text not null check (result in ('correct','incorrect','unanswered','recorded')),
  attempted_at timestamptz not null default now()
);

create index if not exists question_attempts_user_question_idx on public.question_attempts(user_id, question_id);
create index if not exists question_attempts_user_time_idx on public.question_attempts(user_id, attempted_at desc);

create table if not exists public.question_flags (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  bookmarked boolean not null default false,
  revision boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(user_id,question_id)
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  config jsonb not null,
  question_ids jsonb not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists practice_sessions_user_time_idx on public.practice_sessions(user_id, started_at desc);

alter table public.profiles enable row level security;
alter table public.question_attempts enable row level security;
alter table public.question_flags enable row level security;
alter table public.practice_sessions enable row level security;

drop policy if exists "profiles own" on public.profiles;
drop policy if exists "attempts own" on public.question_attempts;
drop policy if exists "flags own" on public.question_flags;
drop policy if exists "sessions own" on public.practice_sessions;

create policy "profiles own" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "attempts own" on public.question_attempts for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "flags own" on public.question_flags for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "sessions own" on public.practice_sessions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id) values(new.id) on conflict do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
