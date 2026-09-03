begin;
select plan(6);

insert into public.invites(email) values ('a@test.local');
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is(
  array_length(public.save_entries(
    '{"text":"아까 12시에 김치찌개랑 공깃밥","source":"voice","reference_at":"2026-09-03T19:45:00+09:00","pasted_json":{"entries":[]}}'::jsonb,
    '[
      {"kind":"meal","occurred_at":"2026-09-03T12:00:00+09:00","time_precision":"exact","source_text":"김치찌개랑 공깃밥",
       "data":{"meal_type":"점심","foods":[{"name":"김치찌개","ingredients":["김치"," 마늘 ","파"],"amount":null},{"name":"공깃밥","ingredients":["쌀"],"amount":null}],"eating_pattern":[]}},
      {"kind":"symptom","occurred_at":"2026-09-03T19:45:00+09:00","time_precision":"exact","source_text":"배가 좀 아파","data":{"type":"복통","severity":3,"note":null}}
    ]'::jsonb), 1), 2, '항목 2개 id 반환');

select is((select count(*) from public.raw_inputs), 1::bigint, 'raw_inputs 1건');
select is((select count(*) from public.entries), 2::bigint, 'entries 2건');
select is((select array_agg(tag order by tag) from public.entry_tags), array['김치','마늘','쌀','파'], '재료 태그 trim 후 4개');
select is((select ingredients from public.foods where name = '김치찌개'), array['김치','마늘','파'], 'foods 사전에 김치찌개');

select throws_ok(
  $$ select public.save_entries(null, '[{"kind":"banana","occurred_at":"2026-09-03T12:00:00+09:00","time_precision":"exact","source_text":null,"data":{}}]'::jsonb) $$,
  '23514', null, '잘못된 kind면 전체 롤백(check 위반)');

select * from finish();
rollback;
