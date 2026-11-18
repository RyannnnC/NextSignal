# NextSignal UX and Auth Redesign Plan

## Phase 0 audit

| Existing route | Responsibility and change |
| --- | --- |
| `/`, `/grow` | Marketing home and growth scope. Preserve branding and bring shell and section content onto the same grid. |
| `/validate` | FixtureApp combines session, input, editing, jobs and history. Keep idea input here. Redirect legacy project deep links to review. |
| `/projects/[projectId]/reports/[reportId]` | Existing owner-scoped immutable detail. Keep the path and evidence renderer. |
| `/api/[...path]` | Same-origin fixture bridge. Preserve routes, cookie and authorization in Phase 1. |

The old shared cap is 1400px and the generic workspace cap is 960px. Use a 1440px border-box shell, 32/24/16px gutters, a purposeful form column, and a wider report grid. Reuse localized field groups, report content, Recharts, Ant Design Icons and design tokens. Split screens into `/auth/sign-in`, `/validate/[projectId]/review`, `/validate/[projectId]/progress`, `/account` and `/account/reports`. Real registration, callback and recovery routes belong to Phase 2.

The bridge uses an HttpOnly fixture cookie, same-origin checks and an internal worker key. The worker resolves the session and calls application services under a limited SQL role with transaction-local identity. `auth.users.id` owns a workspace, which contains projects, profiles, consent, jobs, runs and reports. Composite references and RLS maintain the tenant boundary. Phase 1 uses the same backend authorization; client session state only supports presentation.

| Environment | Identity, migration and recovery boundary |
| --- | --- |
| Existing local Docker PostgreSQL | Fixture auth shim and fixture sessions; port 54328 and existing named volume. Leave data and volume intact. |
| Future local Supabase CLI | Managed Auth schema and real verified identities. Allocate an isolated project identity, volume and free ports. Keep the fixture bootstrap out of managed Auth. |
| Sydney hosted development | Separate credentials and hosted ledger. The custom runner records baseline and hosted-only revisions; CLI history can be empty. Never replay role creation on this occupied target. |

## Phase 2 migration checklist

1. Inventory existing fixture account, workspace and report relationships. Stop writers before a consistent protected backup; capture schema, business rows and migration ledgers. Restore to a separate target and verify counts, ownership and sample immutable reports before cutover. Keep the existing volume.
2. Check the installed Supabase CLI and official config for isolated project, port and mail settings. Start a fresh local project. Inspect the managed roles and Auth functions, then rehearse the reviewed shared and hosted-hardening migration sequence. Preserve applied checksums; document conflicts and engineer a minimal forward fix. Never replay `supabase/local/0001_runtime.sql` into managed Auth or mix the two ledgers.
3. Configure Auth and PostgreSQL in the same environment. Add dedicated register, sign-in, verification callback, recovery, logout and refresh with official SSR helpers. Verify identity server-side and allow only approved same-origin return paths. Use local Mailpit and keep email confirmation enabled. External SMTP delivery is a separate check.
4. Provision workspaces idempotently from verified UUIDs. Keep restricted application and worker roles and transaction-local subject binding. Register test identities through Auth APIs. Keep passwords and service keys out of logs, Git and browser code.
5. Verify anonymous, expired, signed-out and cross-tenant requests through application APIs. Cover forged IDs, pooled connection reuse, job claims and RLS. Exercise register → verify → sign in → research → reopen private report → sign out.
6. Rehearse ownership mapping on a separate restore. Preserve original report snapshots. Switch runtime only after verification. Roll back application configuration to its previous local runtime while retaining both data stores; reconcile new writes before a data rollback. Legacy removal requires separate approval.

## Phase 1 acceptance

Check 375, 768, 1024, 1440 and 1920px layouts, desktop menu and mobile keyboard controls, bilingual text, guest draft, review, progress, account history and a single immutable report. Verify anonymous and cross-tenant denial and existing cancellation, failure and deletion behavior. Run lint, types, unit tests, native PostgreSQL, Chromium and production build. No database cutover is part of this phase, so backup and restore are pre-cutover actions.

## Phase 1 verification record

- Lint, TypeScript, 49 unit and integration tests, secret scanning and the production build passed.
- Native Docker PostgreSQL passed 10 tests. The Chromium suite passed nine tests, including anonymous and other-account denial, immutable report history, and the separated fixture UX. The layout test also passed on a separate run after the desktop navigation spacing adjustment.
- The layout test captured 45 PNGs under `artifacts/phase1/`: nine screens at five widths. History screenshots mask project rows unrelated to the test.
- The sign-in page uses the existing fixture session API. Account history loads at most six project detail payloads per page; a lightweight account-history query belongs to the later account integration. No auth, worker, schema, migration file or persisted fixture user was changed by Phase 1.
