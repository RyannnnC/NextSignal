# Local PostgreSQL cutover verification — 2026-10-28

## Scope and acceptance

Owner authorized replacing the local PGlite runtime with persistent Docker PostgreSQL, safely migrating test data, and verifying the complete M1 fixture flow. Acceptance requires unchanged source files, an independent raw backup, transactional import with exact per-table counts/hashes, rollback/idempotency coverage, native tenant isolation, browser evidence that the runtime is PostgreSQL, and report persistence through a real container stop/start. No real API, paid service or public deployment is included.

## Actual environment and migration

Docker Desktop Linux Engine 29.9.2 and Compose 5.6.1 responded normally. The persistent local service runs PostgreSQL 17.11, pinned to the official image digest in docker/compose.local.yml, on loopback port 54328. Disposable native tests use a separate random Compose project on port 54329. The production application build is a local verification artifact, not a deployment.

The source was .local/db. Initial backup: .local/backups/pglite-2026-10-28T08-47-10-542Z-3c4db833. A second invocation retained a second backup and confirmed the same-source import was a no-op. Each private receipt contains counts and hashes; exports/backups/credentials are ignored by Git.

| Source table | Imported rows at cutover |
| --- | ---: |
| auth.users | 2 |
| public.workspaces | 2 |
| public.projects | 0 |
| public.profile_versions | 0 |
| public.consent_events | 0 |
| public.research_runs | 0 |
| public.jobs | 0 |
| public.run_events | 0 |
| public.provider_calls | 0 |
| public.evidence_records | 0 |
| public.findings | 0 |
| public.finding_evidence_links | 0 |
| public.action_items | 0 |
| public.report_versions | 0 |
| public.audit_events | 56 |
| public.deletion_requests | 16 |
| public.provider_licenses | 4 |

All 17 table counts and canonical JSON hashes matched before commit. Original data contained no live projects/reports; it would be inaccurate to claim that original report content was migrated. A separate nonempty import test covers two immutable report versions. Login sessions were deliberately not copied; sign in again.

The original source file-tree SHA-256 was 93005ccfaddee10f862677f53be8cb9ec72a579db11b5eb169f0e662833f15d8. After native M1 and persistence checks, a read-only verification confirmed both that the source was unchanged and that the raw backup matched the source. Subsequent PostgreSQL test writes are separate from these cutover counts.

## Actual checks executed

`npm run check:all` passed locally with:

- ESLint and strict TypeScript checks.
- 30 base tests. Their PGlite coverage remains explicitly scoped; it is not the native evidence.
- Repository secret heuristic scan and Next.js production build.
- 9 native PostgreSQL cases: migration/rollback/reapply, non-superuser RLS, tenant constraints, idempotency, row-lock skipping, lease fencing, cancellation/deletion races and four independent OS workers.
- 1 native import suite covering a nonempty two-report source, nonempty-target refusal, injected precommit failure/rollback, all table hashes/counts, matching replay, changed-source refusal, private session hashing/revocation and read-only inspector boundaries.
- 4 Chromium browser tests, including the full idea -> profile correction/confirmation -> private report -> second immutable version -> deletion flow, HTTP/tenant boundaries, unsafe input, bilingual UI and accessibility. The health assertion explicitly requires database=postgresql.
- Controlled stop/start of the persistent local PostgreSQL container. A complete test project/report matched after restart; another tenant remained denied. The test removed only its own project afterward.

Also executed: actual db:migrate and replay, db:status, db:shell table/column inspection, and db:schema -- --write. Lint, typecheck and the persistence test were repeated after the final script lifecycle adjustment and passed. Windows Watchpack system-file and NO_COLOR warnings were nonfatal. CI configuration was updated, but remote CI was not executed by this task; no fresh npm audit result is claimed here.

## File manifest for this cutover

| Area | Files |
| --- | --- |
| Persistent service and local-only schema | docker/compose.local.yml; supabase/local/0001_runtime.sql |
| Configuration, pools, sessions and migration contracts | packages/adapters/src/local-config.ts; local-postgres.ts; local-sessions.ts; local-import.ts; packages/adapters/package.json |
| Startup and database tools | scripts/lib/local-postgres.ts; scripts/dev.ts; scripts/db.ts; scripts/migrate-local.ts; scripts/verify-local-persistence.ts; scripts/test-postgres.ts; package.json |
| Worker and web health boundary | apps/worker/src/main.ts; apps/worker/src/server.ts; apps/web/lib/bridge.ts |
| Native import and browser verification | tests/native/local-import.import.ts; vitest.import.config.ts; tests/e2e/fixture.spec.ts; playwright.config.ts |
| CI | .github/workflows/ci.yml |
| Decisions and inspection docs | docs/adr/0007-local-postgresql-cutover.md; docs/database/SCHEMA.md; docs/operations/LOCAL_DEVELOPMENT.md; this record |
| Updated current guidance | AGENTS.md; README.md; .env.example; docs/README.md; docs/ARCHITECTURE.md; docs/PROJECT_HANDOFF.md; docs/security/THREAT_MODEL.md; docs/operations/M1.md; docs/operations/NATIVE_POSTGRES.md |

Existing versioned application SQL migrations were not rewritten. Earlier concurrency fixes are recorded separately in ADR 0006. Supplied assets, design and bilingual UI remain in place. No new dependencies were installed for this cutover.

## Limits and remaining gates

The inspector can see all public column metadata but receives no tenant rows under RLS. This protects private data; use the application to inspect tenant-scoped content. Worker pools do not use management credentials. The local identity shim and passwordless fixture accounts are still unsuitable for production authentication.

The Docker volume persists restarts but is not an independent backup. Migration snapshots contain private historical data, including any pre-deletion content; application deletion does not clear snapshots. Retain the current native volume and credentials before recovery; the old PGlite snapshot cannot restore later PostgreSQL writes. Backup expiry and production restore procedures need a separate plan.

Real Supabase/JWT, provider licensing, production encryption/operations, budget controls and legal/public-launch approvals remain open. No further owner approval is needed for this completed local scope. A new scope decision is required before enabling real providers or deployment.
