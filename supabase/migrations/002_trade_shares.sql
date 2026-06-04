-- Public trade profiles for live friend QR comparison (no private account data).
-- Requires set_updated_at(); included here so this migration can run standalone.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.trade_shares (
  share_id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  album_id text not null default 'fifa-world-cup-2026',
  display_name text not null,
  missing jsonb not null default '[]',
  duplicates jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create index if not exists trade_shares_user_id_idx on public.trade_shares (user_id);

drop trigger if exists set_trade_shares_updated_at on public.trade_shares;
create trigger set_trade_shares_updated_at
before update on public.trade_shares
for each row execute function public.set_updated_at();

alter table public.trade_shares enable row level security;

drop policy if exists "trade_shares_select_public" on public.trade_shares;
create policy "trade_shares_select_public"
on public.trade_shares for select
using (true);

drop policy if exists "trade_shares_insert_own" on public.trade_shares;
create policy "trade_shares_insert_own"
on public.trade_shares for insert
with check (auth.uid() = user_id);

drop policy if exists "trade_shares_update_own" on public.trade_shares;
create policy "trade_shares_update_own"
on public.trade_shares for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "trade_shares_delete_own" on public.trade_shares;
create policy "trade_shares_delete_own"
on public.trade_shares for delete
using (auth.uid() = user_id);
