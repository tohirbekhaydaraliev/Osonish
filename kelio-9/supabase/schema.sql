-- ============================================
-- KELIO — Supabase ma'lumotlar bazasi sxemasi
-- Buni Supabase Dashboard -> SQL Editor -> New query orqali ishga tushiring
-- ============================================

-- Foydalanuvchi profili (Supabase Auth "auth.users" jadvaliga bog'langan)
create table if not exists public.profiles (
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

create policy "Foydalanuvchi o'z profilini ko'ra oladi"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Foydalanuvchi o'z profilini yangilay oladi"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Foydalanuvchi o'z profilini yarata oladi"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Vakansiyalar jadvali (qo'lda qo'shilgan + hh.ru'dan keshlangan)
create table if not exists public.jobs (
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

create policy "Har kim vakansiyalarni ko'ra oladi"
  on public.jobs for select
  using (true);

create policy "Tizimga kirgan foydalanuvchi vakansiya qo'sha oladi"
  on public.jobs for insert
  with check (auth.uid() is not null);

-- Suhbat tarixi (ixtiyoriy — keyinchalik profil tahlili uchun foydali)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;

create policy "Foydalanuvchi o'z suhbatini ko'ra oladi"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Foydalanuvchi o'z suhbatiga yoza oladi"
  on public.conversations for insert
  with check (auth.uid() = user_id);
