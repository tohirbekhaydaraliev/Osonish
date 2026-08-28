-- ============================================
-- KELIO — 2-migratsiya: rasm, telefon, ish beruvchi-ishchi chat
-- Buni Supabase SQL Editor -> New query orqali ishga tushiring
-- (schema.sql dan KEYIN, uni takrorlamasdan, faqat shu qo'shimchani)
-- ============================================

-- Jobs jadvaliga yangi ustunlar qo'shish
alter table public.jobs add column if not exists image_url text;
alter table public.jobs add column if not exists phone text;
alter table public.jobs add column if not exists description text;

-- ============================================
-- Rasm yuklash uchun Storage bucket
-- ============================================
insert into storage.buckets (id, name, public)
values ('job-images', 'job-images', true)
on conflict (id) do nothing;

create policy "job_images_public_read"
  on storage.objects for select
  using (bucket_id = 'job-images');

create policy "job_images_authenticated_upload"
  on storage.objects for insert
  with check (bucket_id = 'job-images' and auth.uid() is not null);

-- ============================================
-- Ishchi <-> Ish beruvchi chat (har bir vakansiya bo'yicha alohida suhbat)
-- ============================================
create table if not exists public.job_messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade not null,
  sender_id uuid references auth.users(id) not null,
  recipient_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamptz default now()
);

alter table public.job_messages enable row level security;

create policy "job_messages_select_participant"
  on public.job_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "job_messages_insert_own"
  on public.job_messages for insert
  with check (auth.uid() = sender_id);

-- Tezkor qidiruv uchun indeks
create index if not exists idx_job_messages_job_id on public.job_messages(job_id);
create index if not exists idx_job_messages_participants on public.job_messages(sender_id, recipient_id);
