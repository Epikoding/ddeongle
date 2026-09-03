begin;
select plan(7);

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

create temp table r as
  select * from public.suspect_ranking('2026-09-01T00:00:00+09:00', '2026-09-03T23:59:59+09:00', 8, 'diarrhea');

select is((select exposed_n from r where grp='ingredient' and candidate='마늘'), 3, '마늘 노출 3');
select is((select exposed_hits from r where grp='ingredient' and candidate='마늘'), 2, '마늘 hit 2');
select is((select control_hits from r where grp='ingredient' and candidate='마늘'), 1, '마늘 비노출 hit 1');
select is((select ratio from r where grp='ingredient' and candidate='마늘'), 2.00, '마늘 ratio 2.00');
select is((select enough from r where grp='ingredient' and candidate='쌀'), false, '쌀은 자료 부족');
select is((select candidate from r limit 1), '마늘', '1위는 마늘');
select is((select ratio from r where grp='sleep'), 1.00, '나쁜 수면 ratio 1.00 (날 단위)');

select * from finish();
rollback;
