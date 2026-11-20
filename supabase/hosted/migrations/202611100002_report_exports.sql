alter table public.report_versions add unique (workspace_id, project_id, id);

create table public.report_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  report_id uuid not null,
  object_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf', 'text/csv')),
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, project_id, report_id) references public.report_versions(workspace_id, project_id, id) on delete restrict,
  check (object_path = workspace_id::text || '/' || project_id::text || '/' || report_id::text || '/' || id::text ||
    case mime_type when 'application/pdf' then '.pdf' else '.csv' end)
);
create index report_files_report on public.report_files(workspace_id, project_id, report_id);

alter table public.report_files enable row level security;
alter table public.report_files force row level security;
create policy report_file_owner on public.report_files for select to nextsignal_app
  using (workspace_id in (select id from public.workspaces where owner_id = auth.uid()));
revoke all privileges on public.report_files from public, anon, authenticated, service_role;
grant select on public.report_files to nextsignal_app;
