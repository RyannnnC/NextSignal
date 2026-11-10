-- Apply in the same transaction as the M1 baseline on a clean hosted dev target.
-- The application and queue keep their existing explicit SQL role grants.
revoke all privileges on table
  public.workspaces, public.projects, public.profile_versions, public.consent_events,
  public.research_runs, public.jobs, public.run_events, public.provider_calls,
  public.evidence_records, public.findings, public.finding_evidence_links,
  public.action_items, public.report_versions, public.audit_events,
  public.deletion_requests, public.provider_licenses
from public, anon, authenticated, service_role;

revoke all privileges on function public.claim_fixture_job()
from public, anon, authenticated, service_role;
