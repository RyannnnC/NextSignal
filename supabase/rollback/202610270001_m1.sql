-- Destructive LOCAL reset only. Export required data before using outside fixtures.
begin;
drop function public.claim_fixture_job();
drop table public.deletion_requests, public.audit_events, public.report_versions, public.action_items,
 public.finding_evidence_links, public.findings, public.evidence_records, public.provider_calls,
 public.run_events, public.jobs, public.research_runs, public.consent_events, public.profile_versions,
 public.projects, public.workspaces, public.provider_licenses cascade;
drop schema kyb_private cascade;
drop owned by kyb_app;
drop owned by kyb_worker;
drop role kyb_app;
drop role kyb_worker;
commit;
