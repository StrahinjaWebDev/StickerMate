-- Saved friend relations for signed-in users (trade_shares remains live trade data source).

create table if not exists public.saved_friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  album_id text not null default 'fifa-world-cup-2026',
  friend_share_id text not null,
  local_friend_id text not null,
  friend_display_name text not null,
  notes text,
  imported_at timestamptz not null default now(),
  last_fetched_at timestamptz,
  last_snapshot_at timestamptz,
  cached_missing_count integer,
  cached_duplicate_count integer,
  cached_possible_swaps_count integer,
  cached_snapshot jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, friend_share_id, album_id)
);

create index if not exists saved_friends_user_id_idx on public.saved_friends (user_id);
create index if not exists saved_friends_share_id_idx on public.saved_friends (friend_share_id);

drop trigger if exists set_saved_friends_updated_at on public.saved_friends;
create trigger set_saved_friends_updated_at
before update on public.saved_friends
for each row execute function public.set_updated_at();

alter table public.saved_friends enable row level security;

drop policy if exists "saved_friends_select_own" on public.saved_friends;
create policy "saved_friends_select_own"
on public.saved_friends for select
using (auth.uid() = user_id);

drop policy if exists "saved_friends_insert_own" on public.saved_friends;
create policy "saved_friends_insert_own"
on public.saved_friends for insert
with check (auth.uid() = user_id);

drop policy if exists "saved_friends_update_own" on public.saved_friends;
create policy "saved_friends_update_own"
on public.saved_friends for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "saved_friends_delete_own" on public.saved_friends;
create policy "saved_friends_delete_own"
on public.saved_friends for delete
using (auth.uid() = user_id);
