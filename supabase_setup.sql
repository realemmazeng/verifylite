-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- 1. Storage bucket for uploaded documents (private)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Users can only upload into a folder named after their own user id
create policy "Users can upload to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only list/download their own files
create policy "Users can view own files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Table that stores AI-extracted results per document
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  extracted jsonb,
  flags jsonb,
  summary text,
  created_at timestamptz not null default now()
);

alter table documents enable row level security;

create policy "Users can view own documents"
on documents for select
using (auth.uid() = user_id);

create policy "Users can insert own documents"
on documents for insert
with check (auth.uid() = user_id);
