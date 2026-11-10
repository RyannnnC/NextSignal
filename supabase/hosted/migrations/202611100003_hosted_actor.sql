-- Hosted postgres does not own the managed auth schema and cannot delegate its usage.
-- Only the trusted backend SQL role may supply a transaction-local application identity.
create function kyb_private.current_actor() returns uuid
language sql stable set search_path = ''
as $$ select nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid $$;
revoke all privileges on function kyb_private.current_actor() from public, anon, authenticated, service_role;
grant usage on schema kyb_private to kyb_app;
grant execute on function kyb_private.current_actor() to kyb_app;

alter policy workspace_owner on public.workspaces
  using (owner_id = kyb_private.current_actor()) with check (owner_id = kyb_private.current_actor());

do $$
declare tab text;
begin
  foreach tab in array array['projects','profile_versions','consent_events','research_runs','jobs','run_events','provider_calls','evidence_records','findings','finding_evidence_links','action_items','report_versions','audit_events','deletion_requests'] loop
    execute format('alter policy tenant_owner on public.%I using (workspace_id in (select id from public.workspaces where owner_id = kyb_private.current_actor())) with check (workspace_id in (select id from public.workspaces where owner_id = kyb_private.current_actor()))', tab);
  end loop;
end $$;

alter policy conversation_owner on public.conversations
  using (workspace_id in (select id from public.workspaces where owner_id = kyb_private.current_actor()));
alter policy message_owner on public.messages
  using (workspace_id in (select id from public.workspaces where owner_id = kyb_private.current_actor()));
alter policy report_file_owner on public.report_files
  using (workspace_id in (select id from public.workspaces where owner_id = kyb_private.current_actor()));
