-- Fluency First production schema (Supabase/Postgres)
-- Apply only to a NEW dedicated project for this application.
create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade,username text not null unique,display_name text not null,role text not null check (role in ('teacher','student')),created_at timestamptz not null default now());
create table public.classes (id uuid primary key default gen_random_uuid(),name text not null,level text,teacher_id uuid not null references public.profiles(id),created_at timestamptz not null default now());
create table public.class_members (class_id uuid not null references public.classes(id) on delete cascade,student_id uuid not null references public.profiles(id) on delete cascade,joined_at timestamptz not null default now(),primary key (class_id,student_id));
create table public.lessons (id text primary key,course_id text not null,week_no int not null,lesson_no int not null,title text not null,outcome text,content jsonb not null default '{}'::jsonb);
create table public.attempts (id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id) on delete cascade,lesson_id text not null references public.lessons(id),skill text not null check (skill in ('vocabulary','grammar','listening','writing')),score int not null check (score between 0 and 100),tags text[] not null default '{}',created_at timestamptz not null default now());
create table public.lesson_completion (student_id uuid not null references public.profiles(id) on delete cascade,lesson_id text not null references public.lessons(id),step text not null check (step in ('vocabulary','listening','grammar','writing','review')),completed_at timestamptz not null default now(),primary key (student_id,lesson_id,step));
create table public.writing_submissions (id uuid primary key default gen_random_uuid(),student_id uuid not null references public.profiles(id) on delete cascade,lesson_id text not null references public.lessons(id),body text not null,word_count int not null default 0,teacher_feedback text,submitted_at timestamptz not null default now(),reviewed_at timestamptz);
alter table public.profiles enable row level security; alter table public.classes enable row level security; alter table public.class_members enable row level security; alter table public.lessons enable row level security; alter table public.attempts enable row level security; alter table public.lesson_completion enable row level security; alter table public.writing_submissions enable row level security;
create or replace function public.is_teacher_of(student uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists (select 1 from public.classes c join public.class_members cm on cm.class_id=c.id where c.teacher_id=auth.uid() and cm.student_id=student); $$;
create policy "read own profile" on public.profiles for select using (id=auth.uid() or public.is_teacher_of(id));
create policy "read attempts" on public.attempts for select using (student_id=auth.uid() or public.is_teacher_of(student_id));
create policy "create own attempts" on public.attempts for insert with check (student_id=auth.uid());
create policy "read completion" on public.lesson_completion for select using (student_id=auth.uid() or public.is_teacher_of(student_id));
create policy "create own completion" on public.lesson_completion for insert with check (student_id=auth.uid());
create policy "read writing" on public.writing_submissions for select using (student_id=auth.uid() or public.is_teacher_of(student_id));
create policy "create own writing" on public.writing_submissions for insert with check (student_id=auth.uid());
create policy "read lessons" on public.lessons for select to authenticated using (true);
create policy "teacher own classes" on public.classes for select using (teacher_id=auth.uid());
create policy "student enrolled classes" on public.classes for select using (exists(select 1 from public.class_members cm where cm.class_id=id and cm.student_id=auth.uid()));
create policy "read membership" on public.class_members for select using (student_id=auth.uid() or exists(select 1 from public.classes c where c.id=class_id and c.teacher_id=auth.uid()));
-- Teacher account creation and password resets belong in a trusted server/Edge Function, not public browser code.
