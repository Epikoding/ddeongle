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

  if p_raw is not null then
    insert into public.raw_inputs (user_id, text, source, reference_at, pasted_json)
    values (v_uid, p_raw->>'text', p_raw->>'source', (p_raw->>'reference_at')::timestamptz, p_raw->'pasted_json')
    returning id into v_raw_id;
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries) loop
    insert into public.entries (user_id, raw_input_id, kind, occurred_at, time_precision, source_text, data)
    values (
      v_uid, v_raw_id, v_entry->>'kind', (v_entry->>'occurred_at')::timestamptz,
      coalesce(v_entry->>'time_precision', 'exact'), v_entry->>'source_text', coalesce(v_entry->'data', '{}'::jsonb)
    ) returning id into v_id;
    v_ids := v_ids || v_id;

    if v_entry->>'kind' = 'meal' then
      for v_food in select * from jsonb_array_elements(coalesce(v_entry->'data'->'foods', '[]'::jsonb)) loop
        v_ings := '{}';
        for v_ing in select btrim(x) from jsonb_array_elements_text(coalesce(v_food->'ingredients', '[]'::jsonb)) x loop
          if v_ing <> '' then
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
