create extension if not exists citext;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now()
);

create table public.invites (
  email citext primary key,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.raw_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  source text not null check (source in ('voice','form')),
  reference_at timestamptz not null,
  pasted_json jsonb,
  created_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_input_id uuid references public.raw_inputs(id) on delete set null,
  kind text not null check (kind in ('meal','symptom','bowel','sleep','stress','exercise','medication','cycle','note')),
  occurred_at timestamptz not null,
  time_precision text not null default 'exact' check (time_precision in ('exact','approx','unknown')),
  source_text text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index entries_user_occurred_idx on public.entries (user_id, occurred_at);
create index entries_user_kind_occurred_idx on public.entries (user_id, kind, occurred_at);

create table public.entry_tags (
  entry_id uuid not null references public.entries(id) on delete cascade,
  tag text not null,
  primary key (entry_id, tag)
);

create table public.foods (
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ingredients text[] not null default '{}',
  last_used_at timestamptz not null default now(),
  primary key (user_id, name)
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name) values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();
