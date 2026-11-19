-- The backend binds only a server-verified Auth UUID before provisioning.
-- Existing workspace_owner WITH CHECK enforces owner_id=current_actor().
grant insert on public.workspaces to kyb_app;
