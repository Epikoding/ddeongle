begin;
select plan(8);

insert into public.invites(email) values ('a@test.local'), ('b@test.local');
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

-- 1. 미인증(uid 없음)은 not_authenticated
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok($$ select public.save_entries(null, '[]'::jsonb) $$, 'P0001', 'not_authenticated', '미인증 호출 거부');

-- A로 전환
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 2. p_entries가 배열이 아니면 거부
select throws_ok($$ select public.save_entries(null, '{"kind":"note"}'::jsonb) $$, 'P0001', 'entries_not_array', 'entries 배열 아님 거부');

-- 3. data:null / foods:null / ingredients:null 이 에러 없이 저장되고 data는 {}
select is(array_length(public.save_entries(null, '[
  {"kind":"note","occurred_at":"2026-09-03T12:00:00+09:00","time_precision":"exact","source_text":null,"data":null},
  {"kind":"meal","occurred_at":"2026-09-03T12:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":null,"foods":null,"eating_pattern":[]}},
  {"kind":"meal","occurred_at":"2026-09-03T13:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":null,"foods":[{"name":"물","ingredients":null,"amount":null}],"eating_pattern":[]}}
]'::jsonb), 1), 3, 'null 값 3종 저장 성공');
select is((select data from public.entries where kind = 'note'), '{}'::jsonb, 'data:null은 {}로 저장');

-- 4. foods upsert UPDATE 분기: 같은 이름 두 번 → ingredients 갱신, 중복 재료 제거
select public.save_entries(null, '[{"kind":"meal","occurred_at":"2026-09-03T18:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"저녁","foods":[{"name":"김치찌개","ingredients":["김치","마늘"],"amount":null}],"eating_pattern":[]}}]'::jsonb);
select public.save_entries(null, '[{"kind":"meal","occurred_at":"2026-09-03T19:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"저녁","foods":[{"name":"김치찌개","ingredients":["김치","두부","두부"],"amount":null}],"eating_pattern":[]}}]'::jsonb);
select is((select ingredients from public.foods where name = '김치찌개'), array['김치','두부'], 'foods upsert가 UPDATE 분기로 갱신되고 중복 제거');
select is((select count(*) from public.foods where name = '김치찌개'), 1::bigint, 'foods 행은 1개');

-- 5. B로 전환하면 A의 것이 안 보인다(격리)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select count(*) from public.entries), 0::bigint, 'B는 A의 entries를 못 본다');
select is((select count(*) from public.foods), 0::bigint, 'B는 A의 foods를 못 본다');

select * from finish();
rollback;
