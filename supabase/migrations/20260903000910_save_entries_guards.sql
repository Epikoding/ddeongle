-- save_entries null 방어: 20260903000400_save_entries.sql 본문 기준으로 다시 정의한다.
-- 바뀐 것만:
--   1. p_entries가 배열이 아니면 entries_not_array로 거부
--   2. data가 object가 아니면(JSON null 포함) {} 로 저장 — coalesce는 JSON null을 못 잡는다
--   3. data->foods가 array가 아니면 [] 로 순회 (JSON null이면 jsonb_array_elements가 터진다)
--   4. food->ingredients도 같은 방식
--   5. 재료 중복 제거 — 같은 재료가 두 번 들어와도 v_ings에 한 번만
-- 그 외 로직·시그니처·반환은 동일.

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

  if p_raw is not null then
    insert into public.raw_inputs (user_id, text, source, reference_at, pasted_json)
    values (v_uid, p_raw->>'text', p_raw->>'source', (p_raw->>'reference_at')::timestamptz, p_raw->'pasted_json')
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
          on conflict (user_id, name) do update set ingredients = excluded.ingredients, last_used_at = now();
        end if;
      end loop;
    end if;
  end loop;

  return v_ids;
end $$;
