-- ==============================================================================
-- HOARDEX — Database Schema & Row Level Security (RLS)
-- Supabase PostgreSQL 15+
-- ==============================================================================

-- 1. TABLA: collections
-- Almacena las colecciones creadas por cada usuario.
create table if not exists public.collections (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  icon text not null,
  accent_color text not null,
  provider text not null default 'manual',
  statuses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. TABLA: items
-- Almacena los ítems individuales catalogados en cada colección.
create table if not exists public.items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id text not null references public.collections(id) on delete cascade,
  title text not null,
  subtitle text,
  release_year integer,
  cover_url text,
  status_id text not null,
  rating integer,
  notes text,
  meta jsonb not null default '{}'::jsonb,
  xp_awarded boolean not null default false,
  review_xp_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TABLA: gamification_state
-- Almacena el progreso consolidado de experiencia, rachas, logros y retos por usuario.
create table if not exists public.gamification_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  streak jsonb not null default '{"currentStreak": 0, "longestStreak": 0, "lastActivityDate": null, "isActiveToday": false}'::jsonb,
  unlocked_achievements jsonb not null default '[]'::jsonb,
  claimed_challenge_ids jsonb not null default '[]'::jsonb,
  rewarded_collection_ids jsonb not null default '[]'::jsonb,
  xp_history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

alter table public.collections enable row level security;
alter table public.items enable row level security;
alter table public.gamification_state enable row level security;

-- Políticas para collections
create policy "collections_select_policy" on public.collections
  for select using (auth.uid() = user_id);

create policy "collections_insert_policy" on public.collections
  for insert with check (auth.uid() = user_id);

create policy "collections_update_policy" on public.collections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "collections_delete_policy" on public.collections
  for delete using (auth.uid() = user_id);

-- Políticas para items
create policy "items_select_policy" on public.items
  for select using (auth.uid() = user_id);

create policy "items_insert_policy" on public.items
  for insert with check (auth.uid() = user_id);

create policy "items_update_policy" on public.items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "items_delete_policy" on public.items
  for delete using (auth.uid() = user_id);

-- Políticas para gamification_state
create policy "gamification_state_select_policy" on public.gamification_state
  for select using (auth.uid() = user_id);

create policy "gamification_state_insert_policy" on public.gamification_state
  for insert with check (auth.uid() = user_id);

create policy "gamification_state_update_policy" on public.gamification_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "gamification_state_delete_policy" on public.gamification_state
  for delete using (auth.uid() = user_id);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ==============================================================================

create index if not exists idx_collections_user_id on public.collections(user_id);
create index if not exists idx_items_user_id on public.items(user_id);
create index if not exists idx_items_collection_id on public.items(collection_id);
create index if not exists idx_items_updated_at on public.items(updated_at desc);
