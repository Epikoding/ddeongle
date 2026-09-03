begin;
select plan(2);

select throws_ok(
  $$ insert into auth.users (id, email, instance_id, aud, role) values ('00000000-0000-0000-0000-00000000000c', 'nobody@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated') $$,
  'P0001', 'not_invited', '미초대 이메일은 가입 거부');

insert into public.invites(email) values ('OK@test.local');
select lives_ok(
  $$ insert into auth.users (id, email, instance_id, aud, role) values ('00000000-0000-0000-0000-00000000000d', 'ok@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated') $$,
  '초대된 이메일은 대소문자 무관하게 가입');

select * from finish();
rollback;
