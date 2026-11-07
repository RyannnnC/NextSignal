-- M1 core only. Production/Supabase supplies auth.users and auth.uid().
-- Local PGlite creates an explicitly separate auth compatibility shim.
begin;
create schema if not exists kyb_private;
revoke all on schema kyb_private from public;
create role kyb_app nologin nosuperuser nobypassrls;
create role kyb_worker nologin nosuperuser nobypassrls;
grant usage on schema public, auth to kyb_app;
grant execute on function auth.uid() to kyb_app;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stage text not null default 'idea' check(stage in ('idea','launch','growth')),
  idea text not null check(length(idea) between 10 and 3000),
  scenario text not null check(scenario in ('normal','missing','contradictory','timeout','malformed','quota')),
  request_key uuid not null, request_hash text not null,
  created_at timestamptz not null default now(),
  unique(workspace_id,id), unique(workspace_id,request_key)
);
create table public.profile_versions (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, project_id uuid not null,
  version integer not null check(version > 0), content jsonb not null check(jsonb_typeof(content)='object'),
  status text not null check(status in ('awaiting_confirmation','confirmed')),
  request_key uuid not null, request_hash text not null,
  confirmed_at timestamptz, created_at timestamptz not null default now(),
  foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade,
  check((status='confirmed') = (confirmed_at is not null)),
  unique(workspace_id,project_id,id), unique(project_id,version), unique(workspace_id,project_id,request_key)
);
create table public.consent_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, project_id uuid not null,
  notice_version text not null, processing_consent boolean not null check(processing_consent), marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key(workspace_id,project_id) references public.projects(workspace_id,id) on delete cascade
);
create table public.research_runs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, project_id uuid not null, profile_id uuid not null,
  tier text not null default 'fixture_snapshot' check(tier='fixture_snapshot'),
  status text not null default 'queued' check(status in ('queued','planning','collecting','analysing','validating','completed','partial','failed','cancelled')),
  request_key uuid not null, request_hash text not null, error_code text,
  prompt_version text not null default 'fixture-template-v1', model_config jsonb not null default '{"provider":"none","version":"deterministic-v1","maxTokens":0}',
  plan jsonb not null default '{"provider":"fixture","maxCalls":2,"externalCalls":0}',
  max_calls integer not null check(max_calls between 0 and 2), calls_used integer not null default 0 check(calls_used>=0),
  created_at timestamptz not null default now(),
  foreign key(workspace_id,project_id,profile_id) references public.profile_versions(workspace_id,project_id,id) on delete cascade,
  unique(workspace_id,project_id,id), unique(workspace_id,id), unique(workspace_id,project_id,request_key), check(calls_used<=max_calls)
);
create table public.jobs (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, project_id uuid not null, run_id uuid not null,
  status text not null default 'queued' check(status in ('queued','running','done','dead','cancelled')),
  lease_token uuid, lease_until timestamptz, attempts integer not null default 0 check(attempts between 0 and 2),
  available_at timestamptz not null default now(), created_at timestamptz not null default now(),
  foreign key(workspace_id,project_id,run_id) references public.research_runs(workspace_id,project_id,id) on delete cascade,
  unique(run_id)
);
create index jobs_poll on public.jobs(status,available_at,lease_until);
create table public.run_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, project_id uuid not null, run_id uuid not null,
  from_status text, to_status text not null, code text, created_at timestamptz not null default now(),
  foreign key(workspace_id,project_id,run_id) references public.research_runs(workspace_id,project_id,id) on delete cascade
);
create table public.provider_calls (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, project_id uuid not null, run_id uuid not null,
  provider text not null check(provider='fixture'), attempt integer not null,
  status text not null check(status in ('reserved','completed','failed')),
  cost_minor bigint not null default 0 check(cost_minor=0), currency text not null default 'AUD' check(currency='AUD'),
  created_at timestamptz not null default now(),
  foreign key(workspace_id,project_id,run_id) references public.research_runs(workspace_id,project_id,id) on delete cascade,
  unique(run_id,attempt)
);
create table public.evidence_records (
  id uuid primary key, workspace_id uuid not null, project_id uuid not null, run_id uuid not null,
  payload jsonb not null check(payload->>'synthetic'='true' and payload->>'provider'='fixture'),
  foreign key(workspace_id,project_id,run_id) references public.research_runs(workspace_id,project_id,id) on delete cascade,
  unique(workspace_id,project_id,run_id,id)
);
create table public.findings (
  id uuid primary key, workspace_id uuid not null, project_id uuid not null, run_id uuid not null,
  payload jsonb not null,
  foreign key(workspace_id,project_id,run_id) references public.research_runs(workspace_id,project_id,id) on delete cascade,
  unique(workspace_id,project_id,run_id,id)
);
create table public.finding_evidence_links (
  workspace_id uuid not null, project_id uuid not null, run_id uuid not null, finding_id uuid not null, evidence_id uuid not null,
  relation text not null check(relation in ('supports','contradicts')),
  primary key(finding_id,evidence_id,relation),
  foreign key(workspace_id,project_id,run_id,finding_id) references public.findings(workspace_id,project_id,run_id,id) on delete cascade,
  foreign key(workspace_id,project_id,run_id,evidence_id) references public.evidence_records(workspace_id,project_id,run_id,id) on delete cascade
);
create table public.action_items (
  id uuid primary key, workspace_id uuid not null, project_id uuid not null, run_id uuid not null, finding_id uuid not null, payload jsonb not null,
  foreign key(workspace_id,project_id,run_id,finding_id) references public.findings(workspace_id,project_id,run_id,id) on delete cascade
);
create table public.report_versions (
  id uuid primary key, workspace_id uuid not null, project_id uuid not null, run_id uuid not null,
  payload jsonb not null check(payload->>'synthetic'='true'), created_at timestamptz not null default now(),
  foreign key(workspace_id,project_id,run_id) references public.research_runs(workspace_id,project_id,id) on delete cascade,
  unique(run_id)
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  action text not null, subject_id uuid, created_at timestamptz not null default now()
);
create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null, status text not null check(status='completed'), completed_at timestamptz not null default now()
);
create table public.provider_licenses (
  id text primary key, provider text not null unique, decision text not null check(decision in ('APPROVED_LOCAL','BLOCKED')),
  allowed_uses jsonb not null, approval_ref text, reviewed_at timestamptz
);
insert into public.provider_licenses values
 ('fixture-local-v1','fixture','APPROVED_LOCAL','{"localSyntheticOnly":true}', 'docs/adr/0001-m1-local-fixture.md',now()),
 ('abs-pending','abs','BLOCKED','{}',null,null),
 ('dataforseo-pending','dataforseo','BLOCKED','{}',null,null),
 ('answerthepublic-pending','answerthepublic','BLOCKED','{}',null,null);

alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
create policy workspace_owner on public.workspaces to kyb_app using(owner_id=auth.uid()) with check(owner_id=auth.uid());
grant select on public.workspaces to kyb_app;
do $$
declare tab text;
begin
  foreach tab in array array['projects','profile_versions','consent_events','research_runs','jobs','run_events','provider_calls','evidence_records','findings','finding_evidence_links','action_items','report_versions','audit_events','deletion_requests'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('alter table public.%I force row level security',tab);
    execute format('create policy tenant_owner on public.%I to kyb_app using (workspace_id in (select id from public.workspaces where owner_id=auth.uid())) with check (workspace_id in (select id from public.workspaces where owner_id=auth.uid()))',tab);
    execute format('grant select,insert,update,delete on public.%I to kyb_app',tab);
  end loop;
end $$;
revoke update,delete on public.audit_events from kyb_app;
revoke update,delete on public.consent_events from kyb_app;
revoke update,delete on public.run_events from kyb_app;
grant select on public.provider_licenses to kyb_app;

create function kyb_private.immutable_report() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'report versions are immutable'; end $$;
create trigger immutable_report before update on public.report_versions for each row execute function kyb_private.immutable_report();
create function kyb_private.immutable_profile() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'profile versions are immutable; create another version'; end $$;
create trigger immutable_profile before update on public.profile_versions for each row execute function kyb_private.immutable_profile();
create function kyb_private.require_confirmed_profile() returns trigger language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from public.profile_versions where id=new.profile_id and project_id=new.project_id and workspace_id=new.workspace_id and status='confirmed') then
    raise exception 'profile confirmation required';
  end if;
  return new;
end $$;
create trigger confirmed_profile before insert on public.research_runs for each row execute function kyb_private.require_confirmed_profile();

-- Only the worker can claim tasks. It cannot select customer tables directly.
create function public.claim_fixture_job() returns table(id uuid, workspace_id uuid, user_id uuid, run_id uuid, lease_token uuid, attempts integer)
language sql security definer set search_path='' as $$
  with candidate as (
    select j.id from public.jobs j join public.research_runs r on r.id=j.run_id
    where ((j.status='queued' and j.available_at<=now()) or (j.status='running' and j.lease_until<now()))
      and j.attempts<2 and r.status not in ('completed','partial','failed','cancelled')
    order by j.created_at for update of j skip locked limit 1
  ), claimed as (
    update public.jobs j set status='running',attempts=j.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '30 seconds'
    from candidate c where j.id=c.id returning j.*
  ) select c.id,c.workspace_id,w.owner_id,c.run_id,c.lease_token,c.attempts from claimed c join public.workspaces w on w.id=c.workspace_id;
$$;
revoke all on function public.claim_fixture_job() from public;
grant usage on schema public to kyb_worker;
grant execute on function public.claim_fixture_job() to kyb_worker;
revoke all on all functions in schema kyb_private from public;
commit;
