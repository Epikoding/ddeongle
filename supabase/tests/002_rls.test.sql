begin;
select plan(4);

insert into public.invites(email) values ('a@test.local'), ('b@test.local');
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
insert into public.entries (user_id, kind, occurred_at, data) values
  ('00000000-0000-0000-0000-00000000000a', 'note', now(), '{"text":"A의 기록"}'),
  ('00000000-0000-0000-0000-00000000000b', 'note', now(), '{"text":"B의 기록"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*) from public.entries), 1::bigint, 'A는 자기 기록 1건만 본다');
select is((select data->>'text' from public.entries), 'A의 기록', '보이는 것은 A의 기록');
select throws_ok(
  $$ insert into public.entries (user_id, kind, occurred_at, data) values ('00000000-0000-0000-0000-00000000000b', 'note', now(), '{}') $$,
  '42501', null, 'A는 B 명의로 insert 못 한다');
select is((select count(*) from public.profiles), 1::bigint, '프로필도 자기 것만');

select * from finish();
rollback;
