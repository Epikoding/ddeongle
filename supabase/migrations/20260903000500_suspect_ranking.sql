create or replace function public.suspect_ranking(
  p_from timestamptz, p_to timestamptz, p_window_hours int, p_target text
) returns table(
  candidate text, grp text, exposed_n int, exposed_hits int, control_n int, control_hits int, ratio numeric, enough boolean
) language sql stable security invoker as $$
with me as (
  select auth.uid() as uid,
         coalesce((select timezone from public.profiles where user_id = auth.uid()), 'Asia/Seoul') as tz
),
targets as (
  select e.occurred_at
  from public.entries e, me
  where e.user_id = me.uid and e.deleted_at is null
    and e.occurred_at between p_from and p_to
    and case p_target
      when 'diarrhea' then e.kind = 'bowel' and coalesce((e.data->>'bristol')::int, 0) >= 6
      when 'urgency'  then e.kind = 'bowel' and coalesce((e.data->>'urgency')::boolean, false)
      when 'pain'     then e.kind = 'symptom' and e.data->>'type' = '복통'
      when 'bloating' then e.kind = 'symptom' and e.data->>'type' = '팽만'
      else false end
),
meals as (
  select e.id, e.occurred_at, e.data,
    exists (select 1 from targets t
            where t.occurred_at > e.occurred_at
              and t.occurred_at <= e.occurred_at + make_interval(hours => p_window_hours)) as hit
  from public.entries e, me
  where e.user_id = me.uid and e.kind = 'meal' and e.deleted_at is null
    and e.occurred_at between p_from and p_to
),
meal_totals as (select count(*) as n, count(*) filter (where hit) as hits from meals),
meal_cands as (
  select 'ingredient'::text as grp, t.tag as cand, m.id as meal_id, m.hit from meals m join public.entry_tags t on t.entry_id = m.id
  union all
  select 'food', f->>'name', m.id, m.hit from meals m, jsonb_array_elements(coalesce(m.data->'foods','[]'::jsonb)) f where coalesce(f->>'name','') <> ''
  union all
  select 'pattern', p, m.id, m.hit from meals m, jsonb_array_elements_text(coalesce(m.data->'eating_pattern','[]'::jsonb)) p
),
meal_stats as (
  select mc.grp, mc.cand,
    count(distinct mc.meal_id) as exposed_n,
    count(distinct mc.meal_id) filter (where mc.hit) as exposed_hits,
    (select n from meal_totals) - count(distinct mc.meal_id) as control_n,
    (select hits from meal_totals) - count(distinct mc.meal_id) filter (where mc.hit) as control_hits
  from meal_cands mc group by mc.grp, mc.cand
),
days as (
  select d::date as day,
    exists (select 1 from targets t, me where (t.occurred_at at time zone me.tz)::date = d::date) as hit
  from me, generate_series((p_from at time zone me.tz)::date, (p_to at time zone me.tz)::date, interval '1 day') d
),
day_totals as (select count(*) as n, count(*) filter (where hit) as hits from days),
day_cands as (
  select 'sleep'::text as grp, '나쁜 수면'::text as cand, (e.occurred_at at time zone me.tz)::date as day
  from public.entries e, me where e.user_id = me.uid and e.deleted_at is null and e.kind = 'sleep'
    and e.occurred_at between p_from and p_to and coalesce((e.data->>'quality')::int, 10) <= 4
  union all
  select 'stress', '높은 스트레스', (e.occurred_at at time zone me.tz)::date
  from public.entries e, me where e.user_id = me.uid and e.deleted_at is null and e.kind = 'stress'
    and e.occurred_at between p_from and p_to and coalesce((e.data->>'level')::int, 0) >= 6
  union all
  select 'exercise', '고강도 운동', (e.occurred_at at time zone me.tz)::date
  from public.entries e, me where e.user_id = me.uid and e.deleted_at is null and e.kind = 'exercise'
    and e.occurred_at between p_from and p_to and e.data->>'intensity' = '높음'
  union all
  select 'medication', e.data->>'name', (e.occurred_at at time zone me.tz)::date
  from public.entries e, me where e.user_id = me.uid and e.deleted_at is null and e.kind = 'medication'
    and e.occurred_at between p_from and p_to and coalesce(e.data->>'name','') <> ''
),
day_stats as (
  select dc.grp, dc.cand,
    count(distinct dc.day) as exposed_n,
    count(distinct dc.day) filter (where d.hit) as exposed_hits,
    (select n from day_totals) - count(distinct dc.day) as control_n,
    (select hits from day_totals) - count(distinct dc.day) filter (where d.hit) as control_hits
  from day_cands dc join days d on d.day = dc.day group by dc.grp, dc.cand
),
all_stats as (select * from meal_stats union all select * from day_stats)
select cand as candidate, grp,
  exposed_n::int, exposed_hits::int, control_n::int, control_hits::int,
  case when exposed_n > 0 and control_n > 0 and control_hits > 0
       then round((exposed_hits::numeric / exposed_n) / (control_hits::numeric / control_n), 2)
       else null end as ratio,
  (exposed_n >= 3) as enough
from all_stats
order by (exposed_n >= 3) desc, ratio desc nulls last, exposed_n desc, cand;
$$;

create or replace function public.suspect_detail(
  p_from timestamptz, p_to timestamptz, p_window_hours int, p_target text, p_grp text, p_candidate text
) returns table(exposure_id uuid, exposure_at timestamptz, hit boolean, target_id uuid, target_at timestamptz)
language sql stable security invoker as $$
with me as (
  select auth.uid() as uid,
         coalesce((select timezone from public.profiles where user_id = auth.uid()), 'Asia/Seoul') as tz
),
targets as (
  select e.id, e.occurred_at
  from public.entries e, me
  where e.user_id = me.uid and e.deleted_at is null and e.occurred_at between p_from and p_to
    and case p_target
      when 'diarrhea' then e.kind = 'bowel' and coalesce((e.data->>'bristol')::int, 0) >= 6
      when 'urgency'  then e.kind = 'bowel' and coalesce((e.data->>'urgency')::boolean, false)
      when 'pain'     then e.kind = 'symptom' and e.data->>'type' = '복통'
      when 'bloating' then e.kind = 'symptom' and e.data->>'type' = '팽만'
      else false end
),
exposures as (
  select e.id, e.occurred_at
  from public.entries e, me
  where e.user_id = me.uid and e.deleted_at is null and e.occurred_at between p_from and p_to
    and case p_grp
      when 'ingredient' then e.kind = 'meal' and exists (select 1 from public.entry_tags t where t.entry_id = e.id and t.tag = p_candidate)
      when 'food'       then e.kind = 'meal' and exists (select 1 from jsonb_array_elements(coalesce(e.data->'foods','[]'::jsonb)) f where f->>'name' = p_candidate)
      when 'pattern'    then e.kind = 'meal' and e.data->'eating_pattern' ? p_candidate
      when 'sleep'      then e.kind = 'sleep' and coalesce((e.data->>'quality')::int, 10) <= 4
      when 'stress'     then e.kind = 'stress' and coalesce((e.data->>'level')::int, 0) >= 6
      when 'exercise'   then e.kind = 'exercise' and e.data->>'intensity' = '높음'
      when 'medication' then e.kind = 'medication' and e.data->>'name' = p_candidate
      else false end
)
select x.id as exposure_id, x.occurred_at as exposure_at,
  (t.id is not null) as hit, t.id as target_id, t.occurred_at as target_at
from exposures x
left join lateral (
  select t.id, t.occurred_at from targets t, me
  where case when p_grp in ('ingredient','food','pattern')
        then t.occurred_at > x.occurred_at and t.occurred_at <= x.occurred_at + make_interval(hours => p_window_hours)
        else (t.occurred_at at time zone me.tz)::date = (x.occurred_at at time zone me.tz)::date end
  order by t.occurred_at limit 1
) t on true
order by x.occurred_at desc;
$$;
