create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  album_id text not null,
  quantities jsonb not null default '{}',
  settings jsonb not null default '{}',
  dismissed_help jsonb not null default '{}',
  onboarding_completed boolean default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, album_id)
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  album_id text not null,
  friend_name text,
  stickers_given jsonb not null default '[]',
  stickers_received jsonb not null default '[]',
  note text,
  applied_to_collection boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.spending_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  album_id text not null,
  amount_rsd numeric not null default 0,
  packs_count integer not null default 0,
  stickers_count integer not null default 0,
  category text,
  note text,
  date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_collections_updated_at on public.collections;
create trigger set_collections_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

drop trigger if exists set_trades_updated_at on public.trades;
create trigger set_trades_updated_at
before update on public.trades
for each row execute function public.set_updated_at();

drop trigger if exists set_spending_entries_updated_at on public.spending_entries;
create trigger set_spending_entries_updated_at
before update on public.spending_entries
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.trades enable row level security;
alter table public.spending_entries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
on public.profiles for delete
using (auth.uid() = id);

drop policy if exists "collections_select_own" on public.collections;
create policy "collections_select_own"
on public.collections for select
using (auth.uid() = user_id);

drop policy if exists "collections_insert_own" on public.collections;
create policy "collections_insert_own"
on public.collections for insert
with check (auth.uid() = user_id);

drop policy if exists "collections_update_own" on public.collections;
create policy "collections_update_own"
on public.collections for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "collections_delete_own" on public.collections;
create policy "collections_delete_own"
on public.collections for delete
using (auth.uid() = user_id);

drop policy if exists "trades_select_own" on public.trades;
create policy "trades_select_own"
on public.trades for select
using (auth.uid() = user_id);

drop policy if exists "trades_insert_own" on public.trades;
create policy "trades_insert_own"
on public.trades for insert
with check (auth.uid() = user_id);

drop policy if exists "trades_update_own" on public.trades;
create policy "trades_update_own"
on public.trades for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "trades_delete_own" on public.trades;
create policy "trades_delete_own"
on public.trades for delete
using (auth.uid() = user_id);

drop policy if exists "spending_entries_select_own" on public.spending_entries;
create policy "spending_entries_select_own"
on public.spending_entries for select
using (auth.uid() = user_id);

drop policy if exists "spending_entries_insert_own" on public.spending_entries;
create policy "spending_entries_insert_own"
on public.spending_entries for insert
with check (auth.uid() = user_id);

drop policy if exists "spending_entries_update_own" on public.spending_entries;
create policy "spending_entries_update_own"
on public.spending_entries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "spending_entries_delete_own" on public.spending_entries;
create policy "spending_entries_delete_own"
on public.spending_entries for delete
using (auth.uid() = user_id);
