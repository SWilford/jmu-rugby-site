drop function if exists public.remove_admin_safely(uuid);

-- The Edge Function verifies the caller with their JWT before invoking this
-- service-role-only function. Keeping authenticated users off the function
-- prevents direct browser calls to the privileged transaction.
create function public.remove_admin_safely(caller_user_id uuid, target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
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

revoke all on function public.remove_admin_safely(uuid, uuid) from public;
revoke all on function public.remove_admin_safely(uuid, uuid) from anon;
revoke all on function public.remove_admin_safely(uuid, uuid) from authenticated;
grant execute on function public.remove_admin_safely(uuid, uuid) to service_role;

comment on function public.remove_admin_safely(uuid, uuid) is
  'Service-role-only atomic administrator removal after Edge Function caller verification.';
