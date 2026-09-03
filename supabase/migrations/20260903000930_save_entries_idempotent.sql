-- 오프라인 재전송 멱등성 + foods 사전 보호.
-- 20260903000910_save_entries_guards.sql 본문 기준으로 세 가지만 바뀐다:
--   1. p_raw->>'client_id'가 이미 저장돼 있으면 아무것도 삽입하지 않고 그 회차의 entries id를 돌려준다
--      (큐에 보관된 항목을 다시 보내도 기록이 두 번 들어가지 않는다)
--   2. 새로 넣을 때 raw_inputs.client_id를 채운다
--   3. foods upsert가 빈 재료 배열로 사전을 덮어쓰지 않는다 (재료가 있을 때만 갱신)
-- 그 외 로직·시그니처·반환은 동일.

alter table public.raw_inputs add column client_id uuid;
create unique index raw_inputs_user_client_idx on public.raw_inputs (user_id, client_id) where client_id is not null;

create or replace function public.save_entries(p_raw jsonb, p_entries jsonb)
returns uuid[]
language plpgsql security invoker as $$
declare
  v_uid uuid := auth.uid();
  v_raw_id uuid;
  v_ids uuid[] := '{}';
  v_entry jsonb;
  v_id uuid;
  v_food jsonb;
  v_ing text;
  v_ings text[];
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'entries_not_array';
  end if;

  if p_raw is not null and coalesce(p_raw->>'client_id', '') <> '' then
    select id into v_raw_id from public.raw_inputs
      where user_id = v_uid and client_id = (p_raw->>'client_id')::uuid;
    if v_raw_id is not null then
      -- 이미 받은 회차다 — 아무것도 넣지 않고 그때 만든 entries를 돌려준다
      return coalesce((select array_agg(id order by created_at, id) from public.entries where raw_input_id = v_raw_id), '{}'::uuid[]);
    end if;
  end if;

  if p_raw is not null then
    insert into public.raw_inputs (user_id, text, source, reference_at, pasted_json, client_id)
    values (v_uid, p_raw->>'text', p_raw->>'source', (p_raw->>'reference_at')::timestamptz, p_raw->'pasted_json',
            nullif(p_raw->>'client_id', '')::uuid)
    returning id into v_raw_id;
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries) loop
    insert into public.entries (user_id, raw_input_id, kind, occurred_at, time_precision, source_text, data)
    values (
      v_uid, v_raw_id, v_entry->>'kind', (v_entry->>'occurred_at')::timestamptz,
      coalesce(v_entry->>'time_precision', 'exact'), v_entry->>'source_text',
      case when jsonb_typeof(v_entry->'data') = 'object' then v_entry->'data' else '{}'::jsonb end
    ) returning id into v_id;
    v_ids := v_ids || v_id;

    if v_entry->>'kind' = 'meal' then
      for v_food in select * from jsonb_array_elements(
        case when jsonb_typeof(v_entry->'data'->'foods') = 'array' then v_entry->'data'->'foods' else '[]'::jsonb end
      ) loop
        v_ings := '{}';
        for v_ing in select btrim(x) from jsonb_array_elements_text(
          case when jsonb_typeof(v_food->'ingredients') = 'array' then v_food->'ingredients' else '[]'::jsonb end
        ) x loop
          if v_ing <> '' and not (v_ing = any(v_ings)) then
            v_ings := array_append(v_ings, v_ing);
            insert into public.entry_tags (entry_id, tag) values (v_id, v_ing) on conflict do nothing;
          end if;
        end loop;
        if coalesce(v_food->>'name', '') <> '' then
          insert into public.foods (user_id, name, ingredients, last_used_at)
          values (v_uid, v_food->>'name', v_ings, now())
          on conflict (user_id, name) do update set
            ingredients = case when cardinality(excluded.ingredients) > 0 then excluded.ingredients else public.foods.ingredients end,
            last_used_at = now();
        end if;
      end loop;
    end if;
  end loop;

  return v_ids;
end $$;
