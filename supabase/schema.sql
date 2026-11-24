-- ==============================================================================
-- HOARDEX — Database Schema & Row Level Security (RLS)
-- Supabase PostgreSQL 15+
-- ==============================================================================

-- 1. TABLA: profiles
-- Almacena la identidad pública, @username y biografía de cada usuario registrado.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) >= 1 and char_length(display_name) <= 50),
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. TABLA: collections
-- Almacena las colecciones creadas por cada usuario con bandera de visibilidad.
create table if not exists public.collections (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  icon text not null,
  accent_color text not null,
  provider text not null default 'manual',
  statuses jsonb not null default '[]'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TABLA: items
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

-- 4. TABLA: gamification_state
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
-- TRIGGER & FUNCIÓN: handle_new_user()
-- Crea automáticamente el perfil inicial al registrarse un usuario vía email u OAuth.
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  full_name text;
  avatar text;
  suffix int;
begin
  -- Extraer nombre y avatar desde raw_user_meta_data
  full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    null
  );

  -- Sanitizar base para @username: solo minúsculas [a-z0-9_], truncar a 14 chars
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  if char_length(base_username) < 3 then
    base_username := rpad(base_username, 3, '_');
  end if;
  base_username := substring(base_username from 1 for 14);

  final_username := base_username;

  -- Resolver colisiones deterministas si el username ya existe
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := floor(random() * 9000 + 1000)::int;
    final_username := substring(base_username from 1 for 14) || '_' || suffix;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url, is_public, created_at, updated_at)
  values (new.id, final_username, full_name, avatar, true, now(), now())
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Disparador tras inserción de usuario en auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.items enable row level security;
alter table public.gamification_state enable row level security;

-- 1. Políticas para profiles
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy" on public.profiles
  for select using (is_public = true or auth.uid() = id);

drop policy if exists "profiles_insert_policy" on public.profiles;
create policy "profiles_insert_policy" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_policy" on public.profiles;
create policy "profiles_update_policy" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_policy" on public.profiles;
create policy "profiles_delete_policy" on public.profiles
  for delete using (auth.uid() = id);

-- 2. Políticas para collections
drop policy if exists "collections_select_policy" on public.collections;
create policy "collections_select_policy" on public.collections
  for select using (
    auth.uid() = user_id or (
      is_public = true and exists (
        select 1 from public.profiles
        where profiles.id = collections.user_id and profiles.is_public = true
      )
    )
  );

drop policy if exists "collections_insert_policy" on public.collections;
create policy "collections_insert_policy" on public.collections
  for insert with check (auth.uid() = user_id);

drop policy if exists "collections_update_policy" on public.collections;
create policy "collections_update_policy" on public.collections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "collections_delete_policy" on public.collections;
create policy "collections_delete_policy" on public.collections
  for delete using (auth.uid() = user_id);

-- 3. Políticas para items
drop policy if exists "items_select_policy" on public.items;
create policy "items_select_policy" on public.items
  for select using (
    auth.uid() = user_id or exists (
      select 1 from public.collections
      where collections.id = items.collection_id
        and collections.is_public = true
        and exists (
          select 1 from public.profiles
          where profiles.id = collections.user_id and profiles.is_public = true
        )
    )
  );

drop policy if exists "items_insert_policy" on public.items;
create policy "items_insert_policy" on public.items
  for insert with check (auth.uid() = user_id);

drop policy if exists "items_update_policy" on public.items;
create policy "items_update_policy" on public.items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "items_delete_policy" on public.items;
create policy "items_delete_policy" on public.items
  for delete using (auth.uid() = user_id);

-- 4. Políticas para gamification_state
drop policy if exists "gamification_state_select_policy" on public.gamification_state;
create policy "gamification_state_select_policy" on public.gamification_state
  for select using (
    auth.uid() = user_id or exists (
      select 1 from public.profiles
      where profiles.id = gamification_state.user_id and profiles.is_public = true
    )
  );

drop policy if exists "gamification_state_insert_policy" on public.gamification_state;
create policy "gamification_state_insert_policy" on public.gamification_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "gamification_state_update_policy" on public.gamification_state;
create policy "gamification_state_update_policy" on public.gamification_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gamification_state_delete_policy" on public.gamification_state;
create policy "gamification_state_delete_policy" on public.gamification_state
  for delete using (auth.uid() = user_id);

-- ==============================================================================
-- ÍNDICES DE RENDIMIENTO
-- ==============================================================================

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_collections_user_id on public.collections(user_id);
create index if not exists idx_collections_is_public on public.collections(is_public);
create index if not exists idx_items_user_id on public.items(user_id);
create index if not exists idx_items_collection_id on public.items(collection_id);
create index if not exists idx_items_updated_at on public.items(updated_at desc);
