create or replace function public.day_marks(p_from date, p_to date)
returns table(day date, has_entry boolean, has_target boolean)
language sql stable security invoker as $$
with me as (
  select auth.uid() as uid,
         coalesce((select timezone from public.profiles where user_id = auth.uid()), 'Asia/Seoul') as tz
),
days as (select d::date as day from generate_series(p_from, p_to, interval '1 day') d),
rows_ as (
  select (e.occurred_at at time zone me.tz)::date as day,
         (e.kind = 'bowel' and jsonb_typeof(e.data->'bristol') = 'number' and (e.data->>'bristol')::numeric >= 6) as is_target
  from public.entries e, me
  where e.user_id = me.uid and e.deleted_at is null
    and e.occurred_at >= (p_from::timestamp at time zone me.tz) - interval '1 day'
    and e.occurred_at <  (p_to::timestamp + interval '1 day') at time zone me.tz + interval '1 day'
)
select d.day, exists (select 1 from rows_ r where r.day = d.day) as has_entry,
       exists (select 1 from rows_ r where r.day = d.day and r.is_target) as has_target
from days d order by d.day;
$$;
