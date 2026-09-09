-- MO Track — run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Creates the single shared-state table, opens read/write to the app's publishable key,
-- and enables real-time so every logged-in device updates live.

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

-- Real-time change feed
alter publication supabase_realtime add table public.app_state;
