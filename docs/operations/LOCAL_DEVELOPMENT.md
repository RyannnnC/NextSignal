# Local PostgreSQL: run, inspect and recover

## Where things live

The PostgreSQL engine and data live in Docker. The TypeScript application code remains in this repository on Windows; it is not inside the stock PostgreSQL container. SQL migrations define database tables, constraints, functions and RLS. Zod contracts define JSON document keys and API/report shapes.

| Item | Location |
| --- | --- |
| Browser preview | http://127.0.0.1:3000 |
| Local worker host | 127.0.0.1:4311 |
| PostgreSQL | 127.0.0.1:54328 / next_signal_local |
| Compose project/service | next-signal-local / postgres |
| Persistent data | Docker named volume next-signal-local_pgdata |
| Read-only GUI connection credentials | .local/postgres/inspector.json |
| Runtime credentials (not for sharing) | .local/postgres/runtime.json |
| Bootstrap credentials (not needed for normal viewing) | .local/postgres/admin.json and docker.env |
| Preserved legacy database | .local/db |
| Private migration backup/receipt | .local/backups/pglite-.../ |

Never commit or share .local, Docker credentials, raw exports or database backups. The repository ignores them. No native runtime fallback occurs when Docker is stopped. The named volume is persistence, not an independent disaster-recovery backup.

## Start and stop

Requires Docker Desktop's healthy Linux engine and Node.js 24. Run from the repository root:

```sh
npm ci
npm run dev
```

The command starts/verifies the Docker database, checks schema history and cutover readiness, then starts web and worker. Existing PGlite data requires explicit `npm run db:migrate` while both web/worker are stopped. Fresh checkouts without legacy data initialize a fresh local database. Real APIs, LLM processing, crawling, payments and public deployment remain disabled.

Ctrl+C stops web/worker. PostgreSQL stays available for inspection. To stop PostgreSQL without deleting its data:

```sh
npm run db:stop
```

Use `npm run db:up` to start/bootstrap only the database, and `npm run db:status` to see its version, readiness and import marker. Do not run Docker volume deletion or broad prune commands; they can destroy persistent data. Keep credentials together with recovery material; regenerating credentials does not automatically reset an existing PostgreSQL volume's owner password.

## See fields immediately from a terminal

These commands use the real psql already installed inside Docker; no host psql or VS Code database extension is required:

```sh
npm run db:schema
npm run db:shell
```

At the psql prompt:

```text
\dt public.*
\d public.projects
\d public.profile_versions
\d public.research_runs
\d public.report_versions
\q
```

One-shot PowerShell equivalent:

```powershell
npm run db:shell -- --command '\d public.projects'
```

The shell uses kyb_local_inspector. It can list columns, types, foreign keys, indexes and RLS definitions. Customer tables return no rows because the inspection role has no tenant RLS policy; that is intentional, not a migration failure. It cannot INSERT/UPDATE/DELETE. Use the normal Alice/Bob application session for tenant-scoped data. Global provider policy metadata is readable.

`npm run db:schema -- --write` regenerates [the public field reference](../database/SCHEMA.md) from the running database without exporting customer values.

## Docker Desktop path

Open Docker Desktop -> Containers -> next-signal-local -> postgres. Logs show the database process, not business ideas. In the container's Exec terminal, run:

```sh
psql -U kyb_local_inspector -d next_signal_local
```

Then use the same psql commands above. Volumes shows next-signal-local_pgdata. Its contents are PostgreSQL's binary storage, not editable TypeScript or a substitute for SQL migrations. Do not edit database storage files directly.

## VS Code path

VS Code is installed at the inspected user-profile installation, although its `code` CLI was not on the current shell PATH. Open VS Code -> File -> Open Folder, and select:

```text
C:\Users\Admin\Desktop\Github Work\KnowYourBusiness
```

Use Terminal -> New Terminal to run db:shell/db:schema. Use Ctrl+P to open code files:

| Question | File |
| --- | --- |
| All database columns, types and defaults | docs/database/SCHEMA.md |
| Original schema, foreign keys and RLS | supabase/migrations/202610270001_m1.sql |
| Expired-lease recovery function | supabase/migrations/202610270002_lease_exhaustion.sql |
| Local-only identity/session bootstrap | supabase/local/0001_runtime.sql |
| Profile/report JSON keys and validation | packages/contracts/src/index.ts |
| Project creation/confirmation/cancel/delete | packages/application/src/projects.ts |
| Research stages and immutable report creation | packages/application/src/runner.ts |
| Native PostgreSQL transaction/tenant adapter | packages/adapters/src/postgres.ts |
| Native runtime pools/bootstrap | packages/adapters/src/local-postgres.ts |
| Local session implementation | packages/adapters/src/local-sessions.ts |
| HTTP application endpoints | apps/worker/src/server.ts |
| Web BFF | apps/web/lib/bridge.ts |
| Docker service/volume/port configuration | docker/compose.local.yml |

For example, profile_versions.content is JSONB with summary/customer/problem/geography/assumptions defined by Profile; report_versions.payload is the versioned Report object. They are not separate SQL columns for every JSON key.

If you already have a PostgreSQL extension/client, connect with host 127.0.0.1, port 54328, database next_signal_local, user kyb_local_inspector. Read only that user's password from the local inspector.json file; do not paste it into Git, chat or screenshots. No extension was installed by this task. A GUI extension is optional; the terminal workflow above is complete.

## Migration checks and recovery

Stop web/worker first, then run `npm run db:migrate`. It refuses active ports, a changed source or a nonempty target. It retains a raw source copy, separate export working copy, private data.json and receipt.json under .local/backups. The source remains untouched. Import transaction rollback and matching-source replay are verified separately using `npm run test:import`.

Receipts list per-table counts and hashes without business text. Old browser cookies require signing in again after cutover; PGlite sessions were not imported. The old snapshot does not contain PostgreSQL writes made after cutover. Before recovery, preserve current native data and credentials, choose a separate clean recovery target, and reconcile newer work. Do not overwrite the active volume or delete the old source as an automatic rollback step.

## Full validation

With web/worker stopped:

```sh
npm run check:all
```

This runs lint/types/base tests/build/secret heuristic checks, disposable native migration/RLS/multi-process tests, an isolated import/session/inspector test, browser M1 tests against the actual PostgreSQL runtime, and a controlled persistent-container stop/start test. The persistence test creates and deletes only its own fixture project. Docker remains required; no required test silently falls back to PGlite.

The local runtime still uses explicit passwordless test identities and an auth.uid compatibility shim. It does not establish production Supabase authentication, encrypted production storage, provider licensing or legal readiness.
