-- Bu skript avvalgi jadvallarni butunlay o'chirib, qaytadan toza holda yaratadi.
-- Faqat "already exists" xatosidan xalos bo'lish uchun ishlatiladi.

drop table if exists public.conversations cascade;
drop table if exists public.jobs cascade;
drop table if exists public.profiles cascade;

-- ============================================
-- KELIO — Supabase ma'lumotlar bazasi sxemasi (toza qayta yaratish)
-- ============================================

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  career_tags jsonb default '[]'::jsonb,
  salary_min int,
  salary_max int,
  location_lat float8,
  location_lng float8,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text,
  salary_min int default 0,
  salary_max int default 0,
  mode text default 'Noma''lum',
  tag text default 'Umumiy',
  lat float8 not null,
  lng float8 not null,
  match_score int default 80,
  source text default 'manual',
  external_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.jobs enable row level security;

create policy "jobs_select_all"
  on public.jobs for select
  using (true);

create policy "jobs_insert_authenticated"
  on public.jobs for insert
  with check (auth.uid() is not null);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;

create policy "conversations_select_own"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "conversations_insert_own"
  on public.conversations for insert
  with check (auth.uid() = user_id);
