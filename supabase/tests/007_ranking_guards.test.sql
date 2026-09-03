begin;
select plan(5);

insert into public.invites(email) values ('a@test.local');
insert into auth.users (id, email, instance_id, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select public.save_entries(null, '[
  {"kind":"meal","occurred_at":"2026-09-01T12:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"점심","foods":[{"name":"김치찌개","ingredients":["마늘","김치"],"amount":null}],"eating_pattern":[]}},
  {"kind":"meal","occurred_at":"2026-09-01T19:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"저녁","foods":[{"name":"마늘빵","ingredients":["마늘"],"amount":null}],"eating_pattern":[]}},
  {"kind":"meal","occurred_at":"2026-09-02T12:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"점심","foods":[{"name":"마늘볶음밥","ingredients":["마늘"],"amount":null}],"eating_pattern":[]}},
  {"kind":"meal","occurred_at":"2026-09-02T19:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"저녁","foods":[{"name":"우유","ingredients":["우유"],"amount":null}],"eating_pattern":[]}},
  {"kind":"meal","occurred_at":"2026-09-03T12:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"점심","foods":[{"name":"흰밥","ingredients":["쌀"],"amount":null}],"eating_pattern":[]}},
  {"kind":"meal","occurred_at":"2026-09-03T19:00:00+09:00","time_precision":"exact","source_text":null,"data":{"meal_type":"저녁","foods":[{"name":"흰밥","ingredients":["쌀"],"amount":null}],"eating_pattern":[]}},
  {"kind":"bowel","occurred_at":"2026-09-01T14:00:00+09:00","time_precision":"exact","source_text":null,"data":{"bristol":7,"urgency":true,"nocturnal":false,"blood":null,"note":null}},
  {"kind":"bowel","occurred_at":"2026-09-02T13:00:00+09:00","time_precision":"exact","source_text":null,"data":{"bristol":7,"urgency":false,"nocturnal":false,"blood":null,"note":null}},
  {"kind":"bowel","occurred_at":"2026-09-03T14:00:00+09:00","time_precision":"exact","source_text":null,"data":{"bristol":6,"urgency":false,"nocturnal":false,"blood":null,"note":null}},
  {"kind":"sleep","occurred_at":"2026-09-01T07:00:00+09:00","time_precision":"approx","source_text":null,"data":{"quality":3,"hours":null,"note":null}},
  {"kind":"sleep","occurred_at":"2026-09-03T07:00:00+09:00","time_precision":"approx","source_text":null,"data":{"quality":3,"hours":null,"note":null}}
]'::jsonb);

-- 비수치 bristol / 비불리언 urgency 한 건 추가
select public.save_entries(null, '[
  {"kind":"bowel","occurred_at":"2026-09-02T10:00:00+09:00","time_precision":"exact","source_text":null,"data":{"bristol":"많음","urgency":"yes","nocturnal":false,"blood":null,"note":null}}
]'::jsonb);

select lives_ok(
  $$ select count(*) from public.suspect_ranking('2026-09-01T00:00:00+09:00', '2026-09-03T23:59:59+09:00', 8, 'diarrhea') $$,
  '비수치 bristol이 있어도 순위표가 죽지 않는다');

select is((select exposed_hits from public.suspect_ranking('2026-09-01T00:00:00+09:00', '2026-09-03T23:59:59+09:00', 8, 'diarrhea')
           where grp='ingredient' and candidate='마늘'), 2, '비수치 행은 표적으로 안 센다');

select is((select count(*) from public.suspect_detail('2026-09-01T00:00:00+09:00', '2026-09-03T23:59:59+09:00', 8, 'diarrhea', 'ingredient', '마늘')),
          3::bigint, 'detail 마늘 노출 3건');

select is((select count(*) filter (where hit) from public.suspect_detail('2026-09-01T00:00:00+09:00', '2026-09-03T23:59:59+09:00', 8, 'diarrhea', 'ingredient', '마늘')),
          2::bigint, 'detail 마늘 hit 2건');

select is((select target_at from public.suspect_detail('2026-09-01T00:00:00+09:00', '2026-09-03T23:59:59+09:00', 8, 'diarrhea', 'ingredient', '마늘')
           where exposure_at = '2026-09-01T12:00:00+09:00'::timestamptz),
          '2026-09-01T14:00:00+09:00'::timestamptz, 'detail이 창 안 첫 표적을 가리킨다');

select * from finish();
rollback;
