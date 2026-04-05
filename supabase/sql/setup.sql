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

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

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

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  question_text text,
  specialty text,
  subtopic text,
  exam_board text,
  error_type text check (error_type in ('wrong', 'guess', 'doubt')),
  marked_answer text,
  correct_answer text,
  user_comment text,
  source_type text not null default 'text' check (source_type in ('text', 'image', 'pdf')),
  attachment_path text,
  attachment_name text,
  attachment_mime_type text,
  attachment_size_bytes bigint,
  status text not null default 'draft' check (status in ('draft', 'analyzed')),
  is_favorite boolean not null default false,
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  theme text,
  theoretical_summary text,
  correct_option_explanation text,
  wrong_options_explanations jsonb,
  similar_question jsonb,
  submitted_answer text,
  submitted_answer_is_correct boolean,
  ai_analysis jsonb,
  ai_model text,
  last_analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.errors enable row level security;

create policy "Users can view own errors" on public.errors for select using (auth.uid() = user_id);
create policy "Users can insert own errors" on public.errors for insert with check (auth.uid() = user_id);
create policy "Users can update own errors" on public.errors for update using (auth.uid() = user_id);
create policy "Users can delete own errors" on public.errors for delete using (auth.uid() = user_id);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  error_id uuid not null references public.errors(id) on delete cascade,
  front text not null,
  back text not null,
  next_review timestamptz not null default now(),
  interval_days integer not null default 1,
  ease_factor numeric not null default 2.5,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.flashcards enable row level security;

create policy "Users can view own flashcards" on public.flashcards for select using (auth.uid() = user_id);
create policy "Users can insert own flashcards" on public.flashcards for insert with check (auth.uid() = user_id);
create policy "Users can update own flashcards" on public.flashcards for update using (auth.uid() = user_id);
create policy "Users can delete own flashcards" on public.flashcards for delete using (auth.uid() = user_id);

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

create policy "Users can view own attempts" on public.question_attempts for select using (auth.uid() = user_id);
create policy "Users can insert own attempts" on public.question_attempts for insert with check (auth.uid() = user_id);
create policy "Users can update own attempts" on public.question_attempts for update using (auth.uid() = user_id);
create policy "Users can delete own attempts" on public.question_attempts for delete using (auth.uid() = user_id);

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

create trigger update_errors_updated_at
before update on public.errors
for each row execute function public.update_updated_at_column();

create index if not exists errors_user_created_idx on public.errors (user_id, created_at desc);
create index if not exists errors_user_favorite_idx on public.errors (user_id, is_favorite);
create index if not exists errors_user_status_idx on public.errors (user_id, status);
create index if not exists flashcards_user_review_idx on public.flashcards (user_id, next_review);
create index if not exists question_attempts_user_created_idx on public.question_attempts (user_id, created_at desc);
create index if not exists question_attempts_error_idx on public.question_attempts (error_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('question-files', 'question-files', false)
on conflict (id) do nothing;

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
