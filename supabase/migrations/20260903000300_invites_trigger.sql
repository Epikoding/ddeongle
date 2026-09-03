create or replace function public.enforce_invite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.invites where email = new.email::citext) then
    raise exception 'not_invited';
  end if;
  return new;
end $$;

create trigger enforce_invite before insert on auth.users
  for each row execute function public.enforce_invite();
