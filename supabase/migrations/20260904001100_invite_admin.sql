-- 초대 추가는 관리자만. 읽기(invites_read)는 그대로 둔다 — 설정 화면이 목록은 계속 보여준다.
alter table public.profiles add column if not exists is_admin boolean not null default false;

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert to authenticated
  with check (invited_by = auth.uid() and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin));
