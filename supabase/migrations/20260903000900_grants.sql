-- 명시 GRANT: Supabase 클라우드 기본이 auto_expose_new_tables=false로 바뀌어
-- 명시 GRANT 없이는 호스팅 배포 시 PostgREST가 "permission denied for table …"를 낸다.
-- 명시 GRANT는 옛/새 기본값 양쪽에서 옳다. RLS는 그대로 적용된다(GRANT는 RLS를 우회하지 않는다).
-- anon에는 표 권한을 주지 않는다 — 로그인 전엔 GoTrue만 쓴다.
-- 트리거 함수 handle_new_user/enforce_invite는 security definer라 grant 불필요.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table
  public.profiles, public.raw_inputs, public.entries, public.entry_tags, public.foods
  to authenticated, service_role;
grant select, insert on table public.invites to authenticated;
grant select, insert, update, delete on table public.invites to service_role;

grant execute on function public.save_entries(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.suspect_ranking(timestamptz, timestamptz, int, text) to authenticated, service_role;
grant execute on function public.suspect_detail(timestamptz, timestamptz, int, text, text, text) to authenticated, service_role;
