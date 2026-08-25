-- Remove administrator access atomically without allowing an administrator to
-- remove their own access or leave the site with no administrators.
create or replace function public.remove_admin_safely(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
begin
  if caller_user_id is null or not exists (
    select 1
    from public.admins as caller_admin
    where caller_admin.user_id = caller_user_id
  ) then
    raise insufficient_privilege using message = 'Administrator access is required.';
  end if;

  if target_user_id = caller_user_id then
    return 'self_removal_blocked';
  end if;

  lock table public.admins in share row exclusive mode;

  if not exists (
    select 1
    from public.admins as target_admin
    where target_admin.user_id = target_user_id
  ) then
    return 'not_found';
  end if;

  if (select count(*) from public.admins) <= 1 then
    return 'last_admin_blocked';
  end if;

  delete from public.admins
  where user_id = target_user_id;

  return 'removed';
end;
$$;

revoke all on function public.remove_admin_safely(uuid) from public;
revoke all on function public.remove_admin_safely(uuid) from anon;
grant execute on function public.remove_admin_safely(uuid) to authenticated;
grant execute on function public.remove_admin_safely(uuid) to service_role;

comment on function public.remove_admin_safely(uuid) is
  'Atomically removes another administrator while preventing self-removal and last-admin lockout.';
