begin;
select plan(4);
insert into public.invites(email) values ('a@test.local');
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select public.save_entries(null, '[
  {"kind":"note","occurred_at":"2026-09-01T10:00:00+09:00","time_precision":"exact","source_text":null,"data":{"text":"기록만"}},
  {"kind":"bowel","occurred_at":"2026-09-02T23:30:00+09:00","time_precision":"exact","source_text":null,"data":{"bristol":7,"urgency":false,"nocturnal":false,"blood":null,"note":null}}
]'::jsonb);

create temp table m as select * from public.day_marks('2026-09-01', '2026-09-03');
select is((select count(*) from m), 3::bigint, '기간 3일 전부 반환');
select is((select has_entry from m where day = '2026-09-01'), true, '09-01 기록 있음');
select is((select has_target from m where day = '2026-09-02'), true, '09-02 23:30 KST 설사 → 서울 날짜로 09-02');
select is((select has_entry from m where day = '2026-09-03'), false, '09-03 없음');
select * from finish();
rollback;
