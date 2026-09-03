begin;
select plan(6);

insert into public.invites(email) values ('a@test.local');
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

-- 같은 client_id로 두 번 보내면(오프라인 재전송) 두 번째는 아무것도 삽입하지 않는다
select set_config('test.r1', array_to_string(public.save_entries(
  '{"text":"아까 12시에 김치찌개 먹었고 지금 배가 아파","source":"voice","reference_at":"2026-09-03T20:00:00+09:00","pasted_json":null,"client_id":"11111111-1111-1111-1111-111111111111"}'::jsonb,
  '[
    {"kind":"meal","occurred_at":"2026-09-03T12:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"점심","foods":[{"name":"김치찌개","ingredients":["김치","마늘"],"amount":null}],"eating_pattern":[]}},
    {"kind":"symptom","occurred_at":"2026-09-03T20:00:00+09:00","time_precision":"exact","source_text":null,"data":{"type":"복통","severity":3,"note":null}}
  ]'::jsonb), ','), true);

select set_config('test.r2', array_to_string(public.save_entries(
  '{"text":"아까 12시에 김치찌개 먹었고 지금 배가 아파","source":"voice","reference_at":"2026-09-03T20:00:00+09:00","pasted_json":null,"client_id":"11111111-1111-1111-1111-111111111111"}'::jsonb,
  '[
    {"kind":"meal","occurred_at":"2026-09-03T12:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"점심","foods":[{"name":"김치찌개","ingredients":["김치","마늘"],"amount":null}],"eating_pattern":[]}},
    {"kind":"symptom","occurred_at":"2026-09-03T20:00:00+09:00","time_precision":"exact","source_text":null,"data":{"type":"복통","severity":3,"note":null}}
  ]'::jsonb), ','), true);

select is((select count(*) from public.raw_inputs where client_id = '11111111-1111-1111-1111-111111111111'), 1::bigint, '같은 client_id 재전송은 raw_inputs 1건');
select is((select count(*) from public.entries), 2::bigint, '같은 client_id 재전송은 entries 2건');
select is(
  (select array_agg(x order by x) from unnest(string_to_array(current_setting('test.r2'), ',')) x),
  (select array_agg(x order by x) from unnest(string_to_array(current_setting('test.r1'), ',')) x),
  '두 번째 호출이 첫 번째와 같은 entries id를 돌려준다');

-- 부분 저장 뒤 남은 항목을 새 client_id로 다시 보내면 새로 들어간다
-- (확인 시트가 저장 성공 때마다 client_id를 돌리는 이유 — 같은 id로 보내면 조기 반환에 먹혀 사라진다)
select public.save_entries(
  '{"text":"아까 12시에 김치찌개 먹었고 지금 배가 아파","source":"voice","reference_at":"2026-09-03T20:00:00+09:00","pasted_json":null,"client_id":"22222222-2222-2222-2222-222222222222"}'::jsonb,
  '[{"kind":"note","occurred_at":"2026-09-03T18:00:00+09:00","time_precision":"exact","source_text":null,"data":{"text":"시각을 정한 뒤 저장한 항목"}}]'::jsonb);
select is(
  array[(select count(*) from public.raw_inputs where client_id is not null), (select count(*) from public.entries)],
  array[2::bigint, 3::bigint],
  '다른 client_id로 보내면 새 raw_inputs·entries가 들어간다');

-- client_id가 없으면 멱등이 아니다(예전 동작 유지)
select public.save_entries('{"text":"메모","source":"form","reference_at":"2026-09-03T21:00:00+09:00","pasted_json":null}'::jsonb,
  '[{"kind":"note","occurred_at":"2026-09-03T21:00:00+09:00","time_precision":"exact","source_text":null,"data":{"text":"ㄱ"}}]'::jsonb);
select public.save_entries('{"text":"메모","source":"form","reference_at":"2026-09-03T21:00:00+09:00","pasted_json":null}'::jsonb,
  '[{"kind":"note","occurred_at":"2026-09-03T21:00:00+09:00","time_precision":"exact","source_text":null,"data":{"text":"ㄱ"}}]'::jsonb);
select is((select count(*) from public.raw_inputs where client_id is null), 2::bigint, 'client_id 없는 호출 2회는 raw_inputs 2건');

-- 재료 없는 저장이 사전의 재료를 지우지 않는다
select public.save_entries(null, '[{"kind":"meal","occurred_at":"2026-09-03T22:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"저녁","foods":[{"name":"김치찌개","ingredients":[],"amount":null}],"eating_pattern":[]}}]'::jsonb);
select is((select ingredients from public.foods where name = '김치찌개'), array['김치','마늘'], '재료 없이 다시 저장해도 사전의 재료가 남는다');

select * from finish();
rollback;
