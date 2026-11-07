-- Local development bootstrap only. NOT a production Supabase authentication implementation.
create schema if not exists auth;
create table if not exists auth.users(id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create schema if not exists local_fixture;
revoke all on schema local_fixture from public;
create table if not exists local_fixture.schema_migrations (
  version text primary key, checksum text not null, applied_at timestamptz not null default now()
);
create table if not exists local_fixture.runtime_migrations (
  version text primary key, checksum text not null, applied_at timestamptz not null default now()
);
create table if not exists local_fixture.sessions (
  token_hash text primary key,
  user_id uuid not null references auth.users(id),
  account text not null check(account in ('alice','bob')),
  expires_at timestamptz not null
);
create table if not exists local_fixture.import_history (
  source_hash text primary key,
  receipt jsonb not null,
  completed_at timestamptz not null default now()
);
create table if not exists local_fixture.runtime_state (
  id boolean primary key default true check(id),
  ready boolean not null default false,
  source text not null check(source in ('fresh','pglite'))
);
