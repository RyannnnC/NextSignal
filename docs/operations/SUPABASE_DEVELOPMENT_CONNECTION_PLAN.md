# Supabase development connection plan

2026-11-07, Australia/Sydney. Scope is the existing M1 database path and access controls. The development project was reported created by the owner. Its region, contents, grants and migration history have yet to be inspected.

## Repository audit

| Area | Current implementation |
| --- | --- |
| Authentication | The Next BFF forwards the local Alice/Bob login to the loopback worker host. The browser holds an HttpOnly cookie and PostgreSQL stores the session digest and expiry. The worker binds a trusted user ID to a transaction. Local auth.users and auth.uid() come from a compatibility shim. |
| Database | Docker PostgreSQL 17 with a named local volume, using pg and SQL migrations. PGlite is for tests and legacy import. The source tree has no Supabase SDK, CLI configuration or linked-project metadata at supabase/.temp/project-ref. The existing env template configures the local fixture only. |
| Reports | Private, immutable JSON snapshots in report_versions. They bind to a historical profile through the run and payload. The report page uses the existing authorized project API. |
| Conversations and files | No chat model, conversation endpoints, upload path or report file store exists in the current implementation. |
| Runtime | The BFF and worker explicitly gate local fixture execution. The Compose files run development and native test databases. The VPS runtime needs its own entry points and release verification. |

See [the production plan](../PRODUCTION_INFRASTRUCTURE_PLAN.md) for the broader topology, backup and capacity proposal.

## Minimum schema and RLS

Reuse the existing 16 M1 application tables. The ownership chain is auth.users → workspaces → projects. The existing profile_versions, research_runs, jobs, run_events, provider_calls, evidence_records, findings, finding_evidence_links, action_items, report_versions, consent_events, audit_events, deletion_requests and provider_licenses support current behavior. The managed project supplies auth.users. Use fresh synthetic test data in that project after confirming the baseline. Keep the local auth shim, Alice/Bob IDs and local sessions on the local path.

| Surface | Policy and grant design |
| --- | --- |
| Workspaces and projects | The server derives the user from a verified identity and resolves workspace ownership. The restricted SQL role uses transaction-local claims. RLS checks workspace owner on reads and existing rows for writes, with WITH CHECK on inserted and updated rows. |
| Reports and related rows | Inherit the same workspace boundary. Keep tenant-aware composite FKs and report immutability. Reuse project deletion rules and server-side report generation. No direct browser table grants. |
| Conversations and messages, deferred | Store workspace_id and project_id on conversations and enforce the composite FK. Messages link through the conversation's tenant key. Owner RLS applies to both tables. User writes use the application service and cannot claim an assistant role. Use a stable created_at plus id cursor. |
| Worker | Use a separate login and narrowly granted claim capability. Inspect the SECURITY DEFINER owner and fixed search path. Confirm browser roles cannot call the claim function through SQL privileges or RPC. Keep lease validation on worker writes. |
| Hosted defaults | Inspect explicit and default grants, role memberships, RLS state and Data API exposure before creating business data. Restrict anon and authenticated access to M1 tables and functions, including provider_licenses and claim_fixture_job. Prefer disabling the Data API for the server-SQL slice if no feature needs it. |

The current SQL adapter sets request.jwt.claim.sub. Validate the managed auth.uid() behavior and claim scope on the actual connection path before adapting the code. Use direct TLS or a validated session pooler connection. No database owner or BYPASSRLS role in app runtime. [API security](https://supabase.com/docs/guides/api/securing-your-api) · [Database connections](https://supabase.com/docs/guides/database/connecting-to-postgres)

## Environment and file scope

The [placeholder template](../../config/supabase-dev.env.example) is for migration tooling. Copy it to the ignored .env.supabase-dev.local and set the project reference, migration URL and CA file there. Use separate restricted web and queue connection strings only when the application integration is approved. Auth SDK configuration, publishable keys and OAuth callbacks belong to a later identity slice. Do not place database credentials or service credentials in NEXT_PUBLIC variables.

| Step | Exact files |
| --- | --- |
| Prepared in this step | config/supabase-dev.env.example and this plan |
| Shared baseline to reuse | supabase/migrations/202610270001_m1.sql and supabase/migrations/202610270002_lease_exhaustion.sql |
| Planned hosted-only hardening | supabase/hosted/migrations/202611070001_dev_access_controls.sql and supabase/hosted/rollback/202611070001_dev_access_controls.md |
| Planned connection tooling | scripts/supabase-dev.ts for read-only preflight and a separate explicit apply mode, package.json for named commands |
| Planned verification | tests/native/supabase-dev.access.ts and vitest.supabase-dev.config.ts for managed target checks |
| Later app wiring, separately scoped | packages/adapters/src/postgres.ts only if managed identity binding differs. Review apps/web/lib/bridge.ts and apps/worker/src/main.ts to introduce an explicit hosted runtime while preserving local sign-in and page routes. |

The hosted-only path is deliberate. Both local bootstrap and native test setup scan supabase/migrations automatically. Use one reviewed ledger for baseline and hosted-only revisions, with checksums and transactional application. Reconcile any existing managed migration history before writing a ledger or adopting CLI tracking. Review changes against both the local and managed targets. [Migration workflow](https://supabase.com/docs/guides/local-development/database-migrations)

## Implementation and acceptance order

1. Confirm the development project reference and expected Sydney region in its dashboard. Store credentials locally. Verify TLS, identity of the target, application schema, grants and migration history with a read-only preflight. Treat an occupied or ambiguous target as a review case. Abort on mismatch.
2. Prepare hosted hardening and tests in source control. Rehearse the exact migration sequence on an isolated target with the same managed behavior. On an approved clean dev target, apply reviewed baseline then hosted restrictions before inserting synthetic test data. Validate ledger, schema, privilege checks and rollback of a failed migration. Keep the prior baseline immutable. Recovery is a reviewed forward fix or restore to a separate target.
3. With two disposable dev identities, prove owner read/write behavior, anonymous and cross-user denial, forged tenant FK rejection, report immutability and direct RPC denial. Check identity cleanup across pooled transactions, non-owner role attributes, and worker claim races with separate connections. Clean up only rows created by the tests. Run npm run check:all for the local regression gate and report managed results separately.
4. Connect the application runtime only after the hosted privilege tests pass and the identity path is agreed. Add a hosted Auth adapter alongside local fixture auth if needed. Reuse the existing project and report services. Verify the end-to-end flow in dev before any VPS cutover.

## Storage and VPS checklist

- Create private report-exports when exports ship. Keep a file metadata row tied to the report and tenant, use generated object paths, and authorize ownership before issuing short-lived signed URLs. Test owner, other user, anonymous, expiry, deletion and orphan cleanup. Add private user-uploads only with an upload feature and server validation. Back up object bytes independently from the DB. [Private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) · [Backups](https://supabase.com/docs/guides/platform/backups)
- Build pinned Next.js web and worker Docker images. Start them as separate services on the Sydney VPS. Use a private worker network, restart policies, readiness checks and controlled log rotation. Verify a worker restart leaves queued and in-flight work recoverable.
- Put a reverse proxy in front of the web service. Use Cloudflare Full (strict) with an origin certificate and restrict direct origin access. Cache public static assets. Bypass cache for callbacks, sessions, project/report routes and signed downloads. Test the actual headers and access through the proxy. [Cloudflare TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/) · [Cloudflare cache control](https://developers.cloudflare.com/cache/concepts/cache-control/)
- Separate dev and production credentials, run migrations as a separate release step, and rehearse restore and image rollback. Check job age, connection use, auth failures and private-cache behavior before release.

## Actual checks

Source, migrations, configuration filenames, Docker Engine and vendor documentation were inspected. Docker responded with Linux Engine 29.9.2. Supabase CLI and psql were not on PATH. The first preflight can use the repository's pg dependency and verified TLS. A CLI workflow would need its own installation and approval. No database connection, migration or application test ran in this planning step. The real development project and any stored credentials remain unverified.
