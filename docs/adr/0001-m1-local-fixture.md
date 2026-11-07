# ADR 0001: M1 local fixture vertical slice

- Date: 2026-10-27
- Status: Accepted architecture and M1 scope by owner in chat; implementation details documented here
- Owner: Project owner

## Context

The owner approved a TypeScript monorepo, an idea-first fixture slice, initial PostgreSQL schema, private reports and no paid APIs or deployment. The workstation has Node.js but no Docker or psql on PATH. Production provider rights, hosting, authentication configuration and retention periods remain open.

## Decision

Use npm workspaces, Next.js as web/BFF, strict TypeScript and Zod. Keep contracts, domain, application and adapters separate. M1 runs a dedicated loopback-only local worker host owning one file-backed PGlite instance. PGlite runs PostgreSQL SQL, roles, constraints and RLS; it is not a mock of permissions. The local host exposes only bounded application operations, not arbitrary SQL. A shared local capability authenticates the BFF to that host. The worker runs durable job leases outside HTTP requests.

Local Alice/Bob accounts are explicit development identities. Sessions use random tokens stored hashed in a private local schema, with HttpOnly SameSite cookies at the BFF. There is no production login implementation. Both the worker and BFF reject production mode. Bind to 127.0.0.1 only. Do not expose the development port through a tunnel. Other local processes/users with access to the fixture files can impersonate test users; use synthetic test ideas only.

The initial migration expects Supabase-compatible auth.users/auth.uid. The local adapter supplies a separate compatibility shim. Runtime owner requests SET LOCAL ROLE kyb_app and bind identity inside a transaction. The queue role can execute a narrowly scoped claim function but cannot read customer tables. The local host is a trusted development process; a production worker still requires a separately reviewed scoped credential/RPC model.

## Alternatives

- Native Supabase/PostgreSQL plus Docker: preferred next verification environment, not available on this workstation today.
- In-memory maps: rejected because they do not exercise PostgreSQL constraints, persistence or RLS.
- Full production hosting/auth setup: deferred; outside approved M1 local scope.
- Separate network DB service: unnecessary for the fixture; native production adapters remain behind the Database port.

## Security, privacy and cost

No provider, LLM, fetcher, payment, public sharing, object export or email capability exists. Zero external research spend. Fixture call caps, bounded retries and account limits are executable. Raw idea text is not logged. Project deletion cascades through consent, jobs, evidence and report payloads; non-content audit/deletion IDs remain. No backups or external analytics are created by the application. Deletion is logical database deletion, not forensic erasure of local disks.

## Limitations and rollback

PGlite serialises transactions and does not prove native PostgreSQL multi-process contention or Supabase JWT/storage integration. The local service combines the fixture database host, application endpoints and job loop for development only. Do not treat it as a production deployment design. Native PostgreSQL/Supabase integration, auth, network isolation, backups and retention are release blockers.

Stop local processes to roll back. The initial migration has an explicit destructive local rollback file and a reapplication test. Remove only the reviewed .local/db directory to discard fixture data; no automatic destructive reset script is provided. Future persistent upgrades must use new migrations rather than editing applied migration history.
