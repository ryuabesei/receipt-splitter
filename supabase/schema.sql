create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_name text not null default '精算アカウント',
  person_a text not null default '自分',
  person_b text not null default '相手',
  updated_at timestamptz not null default now()
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  data jsonb not null
);

alter table public.profiles enable row level security;
alter table public.settlements enable row level security;

create policy "Users can read their profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can create their profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can read their settlements"
  on public.settlements for select
  using (auth.uid() = user_id);

create policy "Users can create their settlements"
  on public.settlements for insert
  with check (auth.uid() = user_id);
