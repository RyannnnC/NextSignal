-- Only the verified worker may check the continued existence of an Auth session.
create function nextsignal_private.active_auth_session(subject uuid, session uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select from auth.sessions where id=session and user_id=subject)
$$;
revoke all on function nextsignal_private.active_auth_session(uuid,uuid) from public,anon,authenticated,service_role,nextsignal_app;
grant execute on function nextsignal_private.active_auth_session(uuid,uuid) to nextsignal_worker;
revoke all on nextsignal_private.auth_local_migrations from public,anon,authenticated,service_role,nextsignal_app,nextsignal_worker;
