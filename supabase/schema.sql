-- Scholar Lens database setup for Supabase.
-- Rebuilt from what the app code expects. Before running it on your live project, compare it with your
-- existing tables (Table Editor) and try it on a free test project first.
-- It is safe to run more than once. NOTE: it REPLACES the bump_usage function and starts a new
-- usage_counts table, so today's old usage counts reset. Nothing else is deleted.

-- 1. Profiles: one row per user, holds the plan. Users can read their own row but cannot change it,
--    so nobody can upgrade themselves. Change a plan from the Supabase dashboard.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create profiles for users who signed up before this trigger existed.
insert into public.profiles (id, email) select id, email from auth.users on conflict do nothing;

-- 2. Daily usage counters (reset at midnight UTC). No direct access: only the two functions below.
create table if not exists public.usage_counts (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  day date not null default ((now() at time zone 'utc')::date),
  count int not null default 0,
  primary key (user_id, kind, day)
);
alter table public.usage_counts enable row level security;

-- Adds one use for today and returns the new total. The API calls this AFTER a successful answer.
create or replace function public.bump_usage(p_kind text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.usage_counts (user_id, kind, day, count)
  values (auth.uid(), p_kind, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, kind, day) do update set count = public.usage_counts.count + 1
  returning count into n;
  return n;
end $$;

-- Returns today's uses WITHOUT adding one. The middleware calls this BEFORE running a request.
create or replace function public.get_usage(p_kind text) returns int
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select count from public.usage_counts
      where user_id = auth.uid() and kind = p_kind and day = (now() at time zone 'utc')::date),
    0);
$$;

-- 3. Saved project outlooks.
create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project text not null,
  audience text,
  horizon text,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.saved_reports enable row level security;
drop policy if exists "own reports select" on public.saved_reports;
drop policy if exists "own reports insert" on public.saved_reports;
drop policy if exists "own reports delete" on public.saved_reports;
create policy "own reports select" on public.saved_reports for select using (auth.uid() = user_id);
create policy "own reports insert" on public.saved_reports for insert with check (auth.uid() = user_id);
create policy "own reports delete" on public.saved_reports for delete using (auth.uid() = user_id);

-- 4. Saved papers (deep dives).
create table if not exists public.saved_papers (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paper_id text not null,
  title text not null,
  year int,
  authors text[],
  venue text,
  url text,
  summary text,
  created_at timestamptz not null default now(),
  primary key (user_id, paper_id)
);
alter table public.saved_papers enable row level security;
drop policy if exists "own papers select" on public.saved_papers;
drop policy if exists "own papers insert" on public.saved_papers;
drop policy if exists "own papers update" on public.saved_papers;
drop policy if exists "own papers delete" on public.saved_papers;
create policy "own papers select" on public.saved_papers for select using (auth.uid() = user_id);
create policy "own papers insert" on public.saved_papers for insert with check (auth.uid() = user_id);
create policy "own papers update" on public.saved_papers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own papers delete" on public.saved_papers for delete using (auth.uid() = user_id);

-- 5. Share links. The owner manages them. Anyone with a link reads ONE report through the function below.
create table if not exists public.shared_reports (
  token text primary key,
  report_id uuid not null references public.saved_reports(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.shared_reports enable row level security;
drop policy if exists "own shares select" on public.shared_reports;
drop policy if exists "own shares insert" on public.shared_reports;
drop policy if exists "own shares delete" on public.shared_reports;
create policy "own shares select" on public.shared_reports for select using (auth.uid() = user_id);
create policy "own shares insert" on public.shared_reports for insert with check (
  auth.uid() = user_id
  and length(token) >= 32
  and exists (select 1 from public.saved_reports r where r.id = report_id and r.user_id = auth.uid())
);
create policy "own shares delete" on public.shared_reports for delete using (auth.uid() = user_id);

-- Returns only the report behind a valid token, and only the fields the public page shows.
create or replace function public.get_shared_report(p_token text) returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'project', r.project, 'audience', r.audience, 'horizon', r.horizon,
    'created_at', r.created_at, 'result', r.result)
  from public.shared_reports s join public.saved_reports r on r.id = s.report_id
  where s.token = p_token and length(p_token) >= 32;
$$;
grant execute on function public.get_shared_report(text) to anon, authenticated;

-- 6. Pro waitlist: signed-in users can add themselves, nobody can read the list from the app.
create table if not exists public.waitlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
drop policy if exists "join waitlist" on public.waitlist;
create policy "join waitlist" on public.waitlist for insert with check (auth.uid() = user_id);

-- 7. Newsletter subscribers: anyone can add an email, nobody can read the list from the app.
create table if not exists public.subscribers (
  email text primary key check (email = lower(email) and length(email) <= 254),
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;
drop policy if exists "subscribe" on public.subscribers;
create policy "subscribe" on public.subscribers for insert to anon, authenticated with check (true);


-- 9. Shared per-IP rate limit (used by the public API routes). Fixed one-hour windows.
create table if not exists public.ip_hits (
  key text not null,
  bucket timestamptz not null,
  count int not null default 0,
  primary key (key, bucket)
);
alter table public.ip_hits enable row level security;

create or replace function public.rate_hit(p_key text, p_max int, p_window_seconds int default 3600) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int; b timestamptz;
begin
  b := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.ip_hits (key, bucket, count) values (left(p_key, 200), b, 1)
  on conflict (key, bucket) do update set count = public.ip_hits.count + 1
  returning count into n;
  if random() < 0.02 then delete from public.ip_hits where bucket < now() - interval '1 day'; end if;
  return n <= p_max;
end $$;
grant execute on function public.rate_hit(text, int, int) to anon, authenticated;


-- 10. Self-service account deletion. Removes the signed-in user; their saved reports, papers, usage and
-- waitlist rows go with it (they all reference auth.users with on delete cascade).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
