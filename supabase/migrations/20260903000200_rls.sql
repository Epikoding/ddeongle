alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.raw_inputs enable row level security;
alter table public.entries enable row level security;
alter table public.entry_tags enable row level security;
alter table public.foods enable row level security;

create policy profiles_own on public.profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy invites_read on public.invites for select to authenticated using (true);
create policy invites_insert on public.invites for insert to authenticated with check (invited_by = auth.uid());

create policy raw_inputs_own on public.raw_inputs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy entries_own on public.entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy entry_tags_own on public.entry_tags for all
  using (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.entries e where e.id = entry_id and e.user_id = auth.uid()));

create policy foods_own on public.foods for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
