alter table public.projects add column product_type text not null default 'idea_validation'
  check (product_type in ('idea_validation', 'business_growth'));

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, project_id) references public.projects(workspace_id, id) on delete cascade
);
create index conversations_project_cursor on public.conversations(workspace_id, project_id, created_at, id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  conversation_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) between 1 and 16000),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, conversation_id) references public.conversations(workspace_id, id) on delete cascade
);
create index messages_conversation_cursor on public.messages(workspace_id, conversation_id, created_at, id);

alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
create policy conversation_owner on public.conversations for select to nextsignal_app
  using (workspace_id in (select id from public.workspaces where owner_id = auth.uid()));
create policy message_owner on public.messages for select to nextsignal_app
  using (workspace_id in (select id from public.workspaces where owner_id = auth.uid()));
revoke all privileges on public.conversations, public.messages from public, anon, authenticated, service_role;
grant select on public.conversations, public.messages to nextsignal_app;
