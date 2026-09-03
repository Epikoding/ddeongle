begin;
select plan(6);
insert into public.invites(email) values ('a@test.local');
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 설사는 09-03 00:30 KST = 09-02 15:30 UTC — 서울 날짜와 UTC 날짜가 갈리는 시각이라
-- 시간대 버킷팅이 실제로 프로필 시간대를 쓰는지 판별한다.
select public.save_entries(null, '[
  {"kind":"note","occurred_at":"2026-09-01T10:00:00+09:00","time_precision":"exact","source_text":null,"data":{"text":"기록만"}},
  {"kind":"bowel","occurred_at":"2026-09-03T00:30:00+09:00","time_precision":"exact","source_text":null,"data":{"bristol":7,"urgency":false,"nocturnal":false,"blood":null,"note":null}}
]'::jsonb);

-- 비수치 bristol 한 건 (007의 시드를 본뜸)
select public.save_entries(null, '[
  {"kind":"bowel","occurred_at":"2026-09-01T20:00:00+09:00","time_precision":"exact","source_text":null,"data":{"bristol":"많음","urgency":"yes","nocturnal":false,"blood":null,"note":null}}
]'::jsonb);

select lives_ok(
  $$ select count(*) from public.day_marks('2026-09-01', '2026-09-03') $$,
  '비수치 bristol이 있어도 달력 점이 죽지 않는다');

create temp table m as select * from public.day_marks('2026-09-01', '2026-09-03');
select is((select count(*) from m), 3::bigint, '기간 3일 전부 반환');
select is((select has_entry from m where day = '2026-09-01'), true, '09-01 기록 있음');
select is((select has_target from m where day = '2026-09-03'), true, '09-03 00:30 KST 설사 → 서울 날짜로 09-03 (UTC로 세면 09-02로 샌다)');
select is((select has_entry from m where day = '2026-09-02'), false, '09-02는 비어 있다 — UTC로 세면 여기가 참이 되므로 시간대 버킷팅을 판별한다');
select is((select has_target from m where day = '2026-09-01'), false, '비수치 bristol은 표적으로 안 센다');
select * from finish();
rollback;
