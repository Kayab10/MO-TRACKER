-- MO Track — run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent.

create table if not exists public.app_state (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Personal-use app: the publishable (anon) key may read and write.
-- Access to the app itself is gated by the in-app admin/user login.
drop policy if exists "app_state read"  on public.app_state;
drop policy if exists "app_state write" on public.app_state;

create policy "app_state read"
  on public.app_state for select
  to anon, authenticated
  using (true);

create policy "app_state write"
  on public.app_state for all
  to anon, authenticated
  using (true)
  with check (true);

-- Real-time change feed (include the full row on delete)
alter table public.app_state replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end $$;
