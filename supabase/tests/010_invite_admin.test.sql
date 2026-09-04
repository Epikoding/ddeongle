begin;
select plan(3);

-- A는 관리자, B는 일반 사용자. 둘 다 초대돼 있어야 auth.users에 들어간다(enforce_invite 트리거).
insert into public.invites(email) values ('admin@test.local'), ('member@test.local');
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'member@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
-- 관리자 지정은 seed가 아니라 여기서 직접 한다 — 로컬 seed는 초대 한 줄만 유지한다.
update public.profiles set is_admin = true where user_id = '00000000-0000-0000-0000-0000000000a1';

set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok(
  $$ insert into public.invites(email, invited_by) values ('byadmin@test.local', '00000000-0000-0000-0000-0000000000a1') $$,
  '관리자는 초대를 추가한다');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.invites(email, invited_by) values ('bymember@test.local', '00000000-0000-0000-0000-0000000000b1') $$,
  '42501', null, '관리자가 아니면 초대를 추가하지 못한다');
-- 추가는 막아도 읽기는 그대로 — 설정 화면이 목록을 계속 보여줘야 한다.
select is(
  (select count(*) from public.invites where email in ('admin@test.local', 'byadmin@test.local')), 2::bigint,
  '관리자가 아니어도 초대 목록은 읽는다');

select * from finish();
rollback;
