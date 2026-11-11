# Supabase development connection plan

Updated 2026-11-10, Australia/Sydney. Scope is the existing M1 database path and access controls in the Sydney development project.

## First increment — read-only connection probe

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the ignored `.env.supabase-dev.local` at the repository root. Use the project's default HTTPS URL from the development dashboard. Run `npm run supabase:preflight` from the root. The command checks the key against the hosted Auth settings endpoint without signing in. The browser and local fixture runtime do not read this file.

For the optional SQL metadata probe, add the three entries in [the database template](../../config/supabase-dev.env.example) to the same file. Use the dashboard project reference, a direct or Sydney session-mode PostgreSQL URL on port 5432, and the dashboard CA certificate file. Percent-encode reserved characters in the URL password. The probe verifies TLS, compares the API and database target identifiers, and inspects PostgreSQL version and schema markers in a read-only transaction. The direct connection hostname does not establish the region. The mutating commands require the Sydney Session pooler and matching project reference. [Connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres)

| Command | Effect |
| --- | --- |
| `npm run supabase:preflight` | Read-only HTTPS and SQL checks. |
| `npm run supabase:preflight -- --apply` | Apply pending migrations in one transaction on the configured Sydney development target. An untracked occupied target or mismatched ledger is rejected. The migration credential remains outside the app. |
| `npm run supabase:preflight -- --verify` | Exercise existing project and fixture runner services with two synthetic SQL identities. The verification refuses an occupied queue and rolls back rows and temporary role grants. It also checks anonymous project access using the publishable key. |

### Recovering from duplicate role error `42710`

On the Sydney development project, `supabase db push` can try to replay the baseline when `supabase_migrations.schema_migrations` is empty. The baseline already exists in `kyb_private.hosted_migrations`, and the CLI only scans `supabase/migrations`. Run `npm run supabase:preflight` to see the CLI versions, then use `npm run supabase:preflight -- --apply` for this project. The runner accepts an empty CLI table, checks the hosted ledger against the source files, and skips recorded migrations. An empty CLI table may remain in place. Keep using the hosted runner for this database. If the CLI ledger contains versions, review the two histories before applying anything. [Supabase migration history](https://supabase.com/docs/guides/deployment/database-migrations)

### Application integration sequence

1. Reuse both baseline SQL migrations. The hosted-only revisions add grants, conversation and file metadata, and a server actor helper. Managed PostgreSQL denies `kyb_app` usage of the managed `auth` schema, so the helper reads the same transaction-local subject without accessing that schema. It is invoker-scoped, works only with trusted server-assigned identity, and grants no browser role access. Test separate least-privilege login connections and identity cleanup across pooled transactions before application cutover.
2. Introduce explicit hosted development routing in `apps/web/lib/bridge.ts` and an identity adapter under `apps/web/lib/supabase/`. Keep the local route, test account cookie, and fixture bootstrap on the local path. For a hosted cookie-based login use the installed `@supabase/supabase-js` and add `@supabase/ssr` when implementing session refresh. Verify the user on the server and provision workspaces idempotently under that identity. Keep the same project API contract and pages. Pass identity to `packages/adapters/src/postgres.ts` from the server only. Use restricted server-side SQL credentials for application operations and queue claims. Add a separate hosted entry point under `apps/worker/src/` to run the existing fixture runner without exposing a worker HTTP port. [Supabase Auth for Next.js](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
3. Add `conversations`, `messages`, and `report_files` in separate additive migrations with tenant-aware composite foreign keys and RLS. Reuse the report payload in `report_versions`. Add the private `report-exports` bucket, application authorization for short-lived signing, and a deletion flow that retries object removal without losing the metadata needed to find orphaned objects. Keep upload and signing operations scoped to the current user where the Storage policy allows them. Validate cross-user API, SQL and Storage denial separately.

## Repository audit

| Area | Current implementation |
| --- | --- |
| Authentication | The Next BFF forwards the local Alice/Bob login to the loopback worker host. The browser holds an HttpOnly cookie and PostgreSQL stores the session digest and expiry. The worker binds a trusted user ID to a transaction. Local auth.users and auth.uid() come from a compatibility shim. |
| Database | Browser runtime uses Docker PostgreSQL 17 with a named local volume, using pg and SQL migrations. PGlite is for tests and legacy import. The SDK is used by the hosted smoke command. The hosted development database has six versioned migrations recorded in `kyb_private.hosted_migrations`. |
| Reports | Private, immutable JSON snapshots in report_versions. They bind to a historical profile through the run and payload. The report page uses the existing authorized project API. |
| Conversations and files | The hosted schema now has `conversations`, `messages`, and `report_files`. The current application has no conversation endpoint, export route, or upload path. New tables are read-only to the runtime role until their write workflows are implemented. |
| Runtime | The BFF and worker explicitly gate local fixture execution. The Compose files run development and native test databases. The VPS runtime needs its own entry points and release verification. |

See [the production plan](../PRODUCTION_INFRASTRUCTURE_PLAN.md) for the broader topology, backup and capacity proposal.

## Minimum schema and RLS

Reuse the existing 16 M1 application tables. The ownership chain is auth.users → workspaces → projects. The existing profile_versions, research_runs, jobs, run_events, provider_calls, evidence_records, findings, finding_evidence_links, action_items, report_versions, consent_events, audit_events, deletion_requests and provider_licenses support current behavior. The managed project supplies auth.users. Use fresh synthetic test data in that project after confirming the baseline. Keep the local auth shim, Alice/Bob IDs and local sessions on the local path.

| Surface | Policy and grant design |
| --- | --- |
| Workspaces and projects | The server derives the user from a verified identity and resolves workspace ownership. The restricted SQL role uses transaction-local claims. RLS checks workspace owner on reads and existing rows for writes, with WITH CHECK on inserted and updated rows. |
| Reports and related rows | Inherit the same workspace boundary. Keep tenant-aware composite FKs and report immutability. Reuse project deletion rules and server-side report generation. No direct browser table grants. |
| Conversations and messages | Conversations reference a project within the same workspace. Messages link through the conversation's tenant key. Owner read RLS applies to both tables. The future write service will set message role itself and paginate on the `(created_at, id)` cursor. |
| Worker | Use a separate login and narrowly granted claim capability. Inspect the SECURITY DEFINER owner and fixed search path. Confirm browser roles cannot call the claim function through SQL privileges or RPC. Keep lease validation on worker writes. |
| Hosted defaults | Inspect explicit and default grants, role memberships, RLS state and Data API exposure before creating business data. Restrict anon and authenticated access to M1 tables and functions, including provider_licenses and claim_fixture_job. Prefer disabling the Data API for the server-SQL slice if no feature needs it. |

The current SQL adapter sets `request.jwt.claim.sub`, which the hosted actor helper reads. No database owner or BYPASSRLS role belongs in app runtime. The existing local sessions can be retained for the loopback demo. Using them against a remote database would require an isolated fixture-only identity mapping and updated data disclosure. For the hosted browser mode, prefer verifying real Supabase Auth identities in a separate adapter alongside local sessions. Neither browser identity path was changed in this increment. [API security](https://supabase.com/docs/guides/api/securing-your-api) · [Database connections](https://supabase.com/docs/guides/database/connecting-to-postgres)

## Environment and file scope

The [placeholder template](../../config/supabase-dev.env.example) is for migration tooling. Copy it to the ignored .env.supabase-dev.local and set the project reference, migration URL and CA file there. Use separate restricted web and queue connection strings only when the application integration is approved. Auth SDK configuration, publishable keys and OAuth callbacks belong to a later identity slice. Do not place database credentials or service credentials in NEXT_PUBLIC variables.

| Step | Exact files |
| --- | --- |
| Prepared connection inputs and probe | .env.example, config/supabase-dev.env.example, scripts/supabase-dev.ts, package.json and this plan |
| Shared baseline to reuse | supabase/migrations/202610270001_m1.sql and supabase/migrations/202610270002_lease_exhaustion.sql |
| Prepared hosted-only hardening | supabase/hosted/migrations/202611070001_dev_access_controls.sql, supabase/hosted/rollback/202611070001_dev_access_controls.md and tests/native/postgres.native.ts |
| Hosted migration and verification tooling | `scripts/supabase-dev.ts` and `scripts/lib/supabase-dev-verify.ts` |
| Hosted development application wiring | apps/web/lib/bridge.ts, apps/web/lib/supabase/server.ts, apps/worker/src/supabase-dev.ts, and packages/adapters/src/postgres.ts only if managed identity binding differs. Preserve the local worker and project/report route contracts. |
| Hosted additive schema | `202611100001_conversations.sql`, `202611100002_report_exports.sql`, `202611100003_hosted_actor.sql`, and forward-recovery notes under `supabase/hosted/rollback` |

The hosted-only path is deliberate. Both local bootstrap and native test setup scan supabase/migrations automatically. The native access test simulates grants to the Supabase API roles in a disposable PostgreSQL transaction. It does not verify the hosted project's defaults or roles. Use one reviewed ledger for baseline and hosted-only revisions, with checksums and transactional application. Apply the baseline and the hosted revocations in one transaction for a clean target. Reconcile any existing managed migration history before writing a ledger or adopting CLI tracking. [Migration workflow](https://supabase.com/docs/guides/local-development/database-migrations)

## Implementation and acceptance order

1. Confirm the development project reference and expected Sydney region in its dashboard. Store credentials locally. Verify TLS, identity of the target, application schema, grants and migration history with a read-only preflight. Treat an occupied or ambiguous target as a review case. Abort on mismatch.
2. Prepare hosted hardening and tests in source control. Rehearse the exact migration sequence on an isolated target with the same managed behavior. On an approved clean dev target, apply reviewed baseline then hosted restrictions before inserting synthetic test data. Validate ledger, schema, privilege checks and rollback of a failed migration. Keep the prior baseline immutable. Recovery is a reviewed forward fix or restore to a separate target.
3. With two disposable dev identities, prove owner read/write behavior, anonymous and cross-user denial, forged tenant FK rejection, report immutability and direct RPC denial. Check identity cleanup across pooled transactions, non-owner role attributes, and worker claim races with separate connections. Clean up only rows created by the tests. Run npm run check:all for the local regression gate and report managed results separately.
4. Connect the application runtime only after the hosted privilege tests pass and the identity path is agreed. Add a hosted Auth adapter alongside local fixture auth if needed. Reuse the existing project and report services. Verify the end-to-end flow in dev before any VPS cutover.

## Storage and VPS checklist

- Provision the private `report-exports` bucket through the Storage API or Dashboard when the export path ships. Allow PDF and CSV only and set a file size limit. The metadata migration fixes generated paths to `<workspace>/<project>/<report>/<file>.<ext>` and restricts report deletion while file metadata exists. Remove objects through the Storage API before deleting metadata. Authorize the report and file in a server-side owner-scoped query before signing for five minutes. Test owner, other user, anonymous, expiry, deletion and orphan cleanup. The bucket and signed download route have not been created. [Private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) · [Storage schema](https://supabase.com/docs/guides/storage/schema/design)
- Build pinned Next.js web and worker Docker images. Start them as separate services on the Sydney VPS. Use a private worker network, restart policies, readiness checks and controlled log rotation. Verify a worker restart leaves queued and in-flight work recoverable.
- Put a reverse proxy in front of the web service. Use Cloudflare Full (strict) with an origin certificate and restrict direct origin access. Cache public static assets. Bypass cache for callbacks, sessions, project/report routes and signed downloads. Test the actual headers and access through the proxy. [Cloudflare TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/) · [Cloudflare cache control](https://developers.cloudflare.com/cache/concepts/cache-control/)
- Separate dev and production credentials, run migrations as a separate release step, and rehearse restore and image rollback. Check job age, connection use, auth failures and private-cache behavior before release.

## Actual checks

On 2026-11-10 the matching Sydney Session pooler connected with CA and hostname verification to PostgreSQL 17.11. Five migrations committed on the clean target, then the hosted actor revision committed after the first role smoke exposed SQLSTATE `42501` on schema `auth`. Reapplying committed zero revisions. The managed smoke then saved and reloaded a fixture report using the existing services, checked two SQL subjects and rejected a forged workspace and a mismatched foreign key. The anonymous HTTPS project request returned 401. Synthetic rows and temporary grants were rolled back. This smoke does not sign in over HTTP, verify browser refresh against hosted data, or access Storage objects.

`npm run check:all` passed. It covered lint, typecheck, 32 standard tests, the secret scan, the Next.js production build, 10 native PostgreSQL tests, one import test, six browser tests and Docker restart persistence. The browser and restart tests used the local application database.
