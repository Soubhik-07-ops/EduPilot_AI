-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_url text not null,
  status text,
  submitted_at timestamptz not null default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  title text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', true)
on conflict (id) do nothing;

alter table public.submissions enable row level security;
alter table public.results enable row level security;

drop policy if exists "Allow read submissions" on public.submissions;
create policy "Allow read submissions"
on public.submissions
for select
using (true);

drop policy if exists "Allow insert submissions" on public.submissions;
create policy "Allow insert submissions"
on public.submissions
for insert
with check (true);

drop policy if exists "Allow read results" on public.results;
create policy "Allow read results"
on public.results
for select
using (true);

drop policy if exists "Allow insert results" on public.results;
create policy "Allow insert results"
on public.results
for insert
with check (true);

drop policy if exists "Allow public uploads to submissions bucket" on storage.objects;
create policy "Allow public uploads to submissions bucket"
on storage.objects
for insert
with check (bucket_id = 'submissions');

drop policy if exists "Allow public reads from submissions bucket" on storage.objects;
create policy "Allow public reads from submissions bucket"
on storage.objects
for select
using (bucket_id = 'submissions');
