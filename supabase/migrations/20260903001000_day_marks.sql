-- 달력 점: 기간의 날짜마다 그날 기록이 있었는지(has_entry)·설사(bristol>=6)가 있었는지(has_target)를
-- 프로필 시간대 기준으로 돌려준다. 창 경계의 ±1일 여유는 시간대 변환 전에 거르기 때문에 필요하다 —
-- 서머타임 전환일처럼 자정이 밀리는 날에도 경계 기록이 빠지지 않는다. bristol 가드는 0920_ranking_guards 관례.

create or replace function public.day_marks(p_from date, p_to date)
returns table(day date, has_entry boolean, has_target boolean)
language sql stable security invoker as $$
with me as (
  select auth.uid() as uid,
         coalesce((select timezone from public.profiles where user_id = auth.uid()), 'Asia/Seoul') as tz
),
days as (select d::date as day from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d),
rows_ as (
  select (e.occurred_at at time zone me.tz)::date as day,
         (e.kind = 'bowel' and case when jsonb_typeof(e.data->'bristol') = 'number' then (e.data->>'bristol')::numeric::int else 0 end >= 6) as is_target
  from public.entries e, me
  where e.user_id = me.uid and e.deleted_at is null
    and e.occurred_at >= (p_from::timestamp at time zone me.tz) - interval '1 day'
    and e.occurred_at <  (p_to::timestamp + interval '1 day') at time zone me.tz + interval '1 day'
)
select d.day, exists (select 1 from rows_ r where r.day = d.day) as has_entry,
       exists (select 1 from rows_ r where r.day = d.day and r.is_target) as has_target
from days d order by d.day;
$$;

grant execute on function public.day_marks(date, date) to authenticated, service_role;
