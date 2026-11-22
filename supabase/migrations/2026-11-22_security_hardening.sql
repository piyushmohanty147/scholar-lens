-- Scholar Lens security hardening. NOT RUN YET. Read the notes, then run it once in Supabase > SQL Editor.
-- Safe to run more than once. It does not delete any existing user data.
-- Constraints are added NOT VALID, so they apply to NEW rows only and cannot fail on rows you already have.

-- 1. Rate limit function: only accept the key shapes our server really uses, and sane limits.
create or replace function public.rate_hit(p_key text, p_max int, p_window_seconds int default 3600) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int; b timestamptz;
begin
  if p_key !~ '^(search|outlook|detail|trends|session):[0-9a-fA-F:.]{2,60}$' and p_key !~ '^(search|outlook|detail|trends|session):unknown$' then
    return false;
  end if;
  if p_max < 1 or p_max > 10000 or p_window_seconds < 60 or p_window_seconds > 86400 then return false; end if;
  b := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.ip_hits (key, bucket, count) values (left(p_key, 200), b, 1)
  on conflict (key, bucket) do update set count = public.ip_hits.count + 1
  returning count into n;
  -- IP-based counters are kept for at most about 6 hours.
  if random() < 0.05 then delete from public.ip_hits where bucket < now() - interval '6 hours'; end if;
  return n <= p_max;
end $$;
grant execute on function public.rate_hit(text, int, int) to anon, authenticated;

-- 2. Usage counter: only the three known kinds. Only signed-in users may call the usage functions.
create or replace function public.bump_usage(p_kind text) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_kind not in ('search', 'outlook', 'detail') then raise exception 'unknown kind'; end if;
  insert into public.usage_counts (user_id, kind, day, count)
  values (auth.uid(), p_kind, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, kind, day) do update set count = public.usage_counts.count + 1
  returning count into n;
  return n;
end $$;
revoke all on function public.bump_usage(text) from public, anon;
grant execute on function public.bump_usage(text) to authenticated;
revoke all on function public.get_usage(text) from public, anon;
grant execute on function public.get_usage(text) to authenticated;

-- 3. Saved reports and papers: size limits and web-links-only on NEW rows.
alter table public.saved_reports drop constraint if exists saved_reports_limits;
alter table public.saved_reports add constraint saved_reports_limits check (
  char_length(project) <= 2000
  and pg_column_size(result) <= 300000
  and result::text !~* '"\s*(javascript|vbscript)\s*:'
  and result::text !~* '"\s*data\s*:\s*(text|application)'
) not valid;
alter table public.saved_papers drop constraint if exists saved_papers_limits;
alter table public.saved_papers add constraint saved_papers_limits check (
  char_length(title) <= 1000
  and (url is null or url ~* '^https?://')
  and (summary is null or char_length(summary) <= 20000)
) not valid;

-- 4. Share links: random hex token, optional expiry (new links expire after 90 days), expired links stop working.
-- Existing share links keep working (no expiry); links created from now on expire after 90 days.
alter table public.shared_reports add column if not exists expires_at timestamptz;
alter table public.shared_reports alter column expires_at set default (now() + interval '90 days');
drop policy if exists "own shares insert" on public.shared_reports;
create policy "own shares insert" on public.shared_reports for insert with check (
  auth.uid() = user_id
  and token ~ '^[a-f0-9]{32,64}$'
  and exists (select 1 from public.saved_reports r where r.id = report_id and r.user_id = auth.uid())
);
create or replace function public.get_shared_report(p_token text) returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'project', r.project, 'audience', r.audience, 'horizon', r.horizon,
    'created_at', r.created_at, 'result', r.result)
  from public.shared_reports s join public.saved_reports r on r.id = s.report_id
  where s.token = p_token and length(p_token) >= 32
    and (s.expires_at is null or s.expires_at > now());
$$;
grant execute on function public.get_shared_report(text) to anon, authenticated;

-- 5. Newsletter: valid email shape, one-step unsubscribe, and erasure when the account is deleted.
alter table public.subscribers drop constraint if exists subscribers_email_shape;
alter table public.subscribers add constraint subscribers_email_shape check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') not valid;
create or replace function public.unsubscribe_email(p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.subscribers where email = lower(left(p_email, 254));
end $$;
revoke all on function public.unsubscribe_email(text) from public;
grant execute on function public.unsubscribe_email(text) to anon, authenticated;

-- 6. Account deletion also removes the person's newsletter row.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare mail text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select lower(email) into mail from auth.users where id = auth.uid();
  if mail is not null then delete from public.subscribers where email = mail; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
