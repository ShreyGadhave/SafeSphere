-- SafeSphere · 0006 · let the service role (ML API, Edge Functions) change roles/guardian status
-- 0003's guard only exempted callers without a user id; be explicit about the service role too.

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'role can only be changed by an admin';
  end if;
  if new.guardian_status is distinct from old.guardian_status
     and not (old.guardian_status in ('none', 'revoked') and new.guardian_status = 'pending')
     and not (new.guardian_status = 'none') then
    raise exception 'guardian verification is done by an admin';
  end if;
  return new;
end;
$$;
