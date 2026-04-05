create extension if not exists "pgcrypto";

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  exam_goal text,
  priority_specialties text[] default '{}'::text[],
  weekly_goal integer default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do update
  set full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.errors
  add column if not exists title text,
  add column if not exists source_type text not null default 'text',
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime_type text,
  add column if not exists attachment_size_bytes bigint,
  add column if not exists status text not null default 'draft',
  add column if not exists is_favorite boolean not null default false,
  add column if not exists difficulty text,
  add column if not exists theme text,
  add column if not exists theoretical_summary text,
  add column if not exists correct_option_explanation text,
  add column if not exists wrong_options_explanations jsonb,
  add column if not exists similar_question jsonb,
  add column if not exists submitted_answer text,
  add column if not exists submitted_answer_is_correct boolean,
  add column if not exists last_analyzed_at timestamptz,
  add column if not exists ai_model text;

alter table public.errors
  drop constraint if exists errors_source_type_check,
  add constraint errors_source_type_check check (source_type in ('text', 'image', 'pdf'));

alter table public.errors
  drop constraint if exists errors_status_check,
  add constraint errors_status_check check (status in ('draft', 'analyzed'));

alter table public.errors
  drop constraint if exists errors_difficulty_check,
  add constraint errors_difficulty_check check (difficulty is null or difficulty in ('easy', 'medium', 'hard'));

create index if not exists errors_user_created_idx on public.errors (user_id, created_at desc);
create index if not exists errors_user_favorite_idx on public.errors (user_id, is_favorite);
create index if not exists errors_user_status_idx on public.errors (user_id, status);

alter table public.flashcards
  add column if not exists last_reviewed_at timestamptz;

create index if not exists flashcards_user_review_idx on public.flashcards (user_id, next_review);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  error_id uuid not null references public.errors(id) on delete cascade,
  selected_answer text,
  answer_text text,
  is_correct boolean,
  confidence integer check (confidence between 1 and 5),
  feedback jsonb,
  created_at timestamptz not null default now()
);

alter table public.question_attempts enable row level security;

drop policy if exists "Users can view own attempts" on public.question_attempts;
drop policy if exists "Users can insert own attempts" on public.question_attempts;
drop policy if exists "Users can update own attempts" on public.question_attempts;
drop policy if exists "Users can delete own attempts" on public.question_attempts;

create policy "Users can view own attempts" on public.question_attempts for select using (auth.uid() = user_id);
create policy "Users can insert own attempts" on public.question_attempts for insert with check (auth.uid() = user_id);
create policy "Users can update own attempts" on public.question_attempts for update using (auth.uid() = user_id);
create policy "Users can delete own attempts" on public.question_attempts for delete using (auth.uid() = user_id);

create index if not exists question_attempts_user_created_idx on public.question_attempts (user_id, created_at desc);
create index if not exists question_attempts_error_idx on public.question_attempts (error_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('question-files', 'question-files', false)
on conflict (id) do nothing;

drop policy if exists "Users can upload own question files" on storage.objects;
drop policy if exists "Users can view own question files" on storage.objects;
drop policy if exists "Users can delete own question files" on storage.objects;
drop policy if exists "Users can update own question files" on storage.objects;

create policy "Users can upload own question files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'question-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view own question files"
on storage.objects for select
to authenticated
using (bucket_id = 'question-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own question files"
on storage.objects for update
to authenticated
using (bucket_id = 'question-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own question files"
on storage.objects for delete
to authenticated
using (bucket_id = 'question-files' and (storage.foldername(name))[1] = auth.uid()::text);
