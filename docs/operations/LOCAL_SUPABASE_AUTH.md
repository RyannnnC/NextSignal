# Local Supabase Auth development

## Environments and verified recovery

The original Docker PostgreSQL remains at 127.0.0.1:54328 in its original volume. It retains Alice/Bob, their workspaces and historical reports. The new CLI project is `nextsignal-auth-local` with independent named volumes. Sydney hosted development is separate; these commands never connect to it.

Before initial local Auth setup, stop application writers and run `npm run db:backup`. The command captures a custom-format database dump and roles, restores them into an isolated network-disabled PostgreSQL container, and verifies every application table's count and content digest. Backup files and receipts stay under ignored `.local/backups/`. Preserve these files privately. Restore rehearsal removes only its own temporary container and anonymous volume.

On 2026-11-19 the source backup at `.local/backups/nextsignal-restore-5b43e635d9/` passed restoration for 23 tables. After Auth implementation the original 23 table digests still matched. This is a local database restore check; it does not establish a production backup policy.

## Run

Requires Docker Desktop's healthy Linux engine, Node.js 24 and project dependencies.

```sh
npm ci
npm run auth:up
npm run dev
```

| Service | Local URL or port |
| --- | --- |
| Application | http://127.0.0.1:3000 |
| Register | http://127.0.0.1:3000/auth/sign-up |
| Local email inbox | http://127.0.0.1:55424 |
| Supabase API | http://127.0.0.1:55421 |
| Supabase PostgreSQL | 127.0.0.1:55422 / postgres |
| Studio | http://127.0.0.1:55423 |

Register with an email and a password of at least 12 characters. Open that address's verification email in the local inbox using the same browser. The PKCE callback exchanges the code for a session and opens the account page or an approved pending workflow. The account page supports logout. Password recovery uses the same local inbox. Local mail is captured for testing; external mailbox delivery requires a separate SMTP configuration and verification.

`auth:up` starts the pinned CLI with `supabase/auth-local/supabase/config.toml`, restricts published ports, applies checksum-tracked migrations and saves restricted runtime credentials to ignored `.local/auth-local.json`. It is safe to rerun. Keep the CLI output in the private `.local/supabase-start.log`, which can include development keys.

Docker Desktop's port publishing did not honor the bridge's default binding option in this environment. `scripts/bind-auth-loopback.ts` explicitly restricts the four named local Auth services to 127.0.0.1. It retains volumes and container configuration, preserves Kong's generated files and their ownership, and restores the prior container on replacement failure. Private recovery configurations live under `.local/auth-container-recovery/`. Always use `auth:up` after restarting the CLI to recheck these bindings.

To stop the Auth stack while retaining its volumes:

```sh
npx supabase stop --workdir supabase/auth-local
```

Stop the application before changing modes. `npm run dev` selects local Supabase identity and business storage together. `npm run dev:fixture` opens the preserved fixture environment on port 3001. Both modes share the local worker port, so run one at a time. No identity synchronization or fixture-user import is performed. Avoid database reset, volume deletion and broad Docker prune commands.

## Trust and schema

- The application uses `@supabase/ssr` in server routes with HttpOnly cookies. Auth is revalidated server-side through `getUser`; a browser-provided UUID is never an identity source.
- The worker separately verifies the access token, confirmed email and continued existence of its Auth session before entering an owner-scoped database transaction. Workspace creation is serialized per verified UUID and protected by the existing owner RLS policy.
- Authentication endpoints enforce fixed loopback Host, same-origin POSTs, request size limits, schema validation and generic login/recovery errors. Callback destinations are restricted to known application paths. Auth callback query strings are excluded from development request logging.
- Passwords are handled by Supabase Auth APIs. The application has no password table, hashing implementation or manually inserted Auth users. Service-role credentials are not used by the web application.
- The local Auth migration runner reuses the eight immutable shared/hosted revisions in their established order, then applies local-only revisions `202611190001_runtime.sql` and `202611190002_workspace.sql`. Its ledger is `nextsignal_private.auth_local_migrations`. It excludes the fixture Auth shim. The local-only changes restrict Auth session existence checks to the worker and permit RLS-checked workspace inserts by the backend.

## Verification

`npm run test:auth` starts a separate local Auth application run and exercises real registration, unverified access denial, Mailpit verification, sign-in, refresh, logout, password recovery, invalid callbacks, same-origin protection, owner report readback, cross-user denial and rejected revoked sessions. It requires the Auth stack and its setup to be ready. Fixture browser tests use `npm run test:e2e` with the Auth application stopped.

Auth browser traces and screenshots are disabled to avoid retaining passwords, codes or session tokens in recorded requests. The tests register unique synthetic addresses via the public Auth API. Their projects are deleted after verification; the development Auth users and local messages are retained for inspection. Legacy users remain in the original database.

On 2026-11-19 the real Auth browser test passed against the isolated stack. It included password recovery, repeated login, invalid-link handling and replay of signed-out cookies. The existing fixture browser suite passed nine tests; the standard suite passed 49 tests; native PostgreSQL passed 10 tests; the controlled original-container persistence check passed. Lint, typecheck, secret scanning and the production build passed. Production dependency audit reported zero known vulnerabilities. An early test exposed missing workspace INSERT privilege, fixed through the additive local-only migration. A later exact-selector failure was corrected without weakening the cross-account assertion.

The full audit retained nine moderate development-tool dependency advisories; the high-severity audit gate passed. These are separate from the production dependency result. Blank English desktop and Chinese mobile registration screenshots are under `artifacts/auth/`.

## Changed implementation files

| Area | Files |
| --- | --- |
| Auth endpoints and UI | `apps/web/app/auth/{action,callback,sign-in,sign-up,forgot-password,reset-password}`, `components/auth-form.tsx`, `components/password-form.tsx` |
| Trusted session and report access | `apps/web/lib/supabase-server.ts`, `bridge.ts`, `packages/adapters/src/auth-config.ts`, `auth-local.ts`, `apps/worker/src/main.ts`, `server.ts` |
| Account and mode labels | `apps/web/app/components/account-pages.tsx`, `report-detail.tsx`, `site-shell.tsx`, `layout.tsx`, `project-step.tsx`, `apps/web/lib/i18n.ts`, `packages/contracts/src/index.ts` |
| Local operations and schema | `scripts/{backup-local,bind-auth-loopback,dev-auth,setup-auth-local,start-auth-local}.ts`, `scripts/dev.ts`, `supabase/auth-local/` |
| Dependencies and checks | Root, Web and adapters package manifests, lockfile, `apps/web/next.config.ts`, `playwright.auth.config.ts`, `tests/auth/local-auth.spec.ts`, `.gitignore` |

Rollback consists of stopping the Auth application and selecting the original fixture runtime. Preserve the new volume and its writes for reconciliation. Restoring the old backup is a separate recovery operation into a clean target, using its roles, dump and receipt; do not overwrite either active database. Hosted Auth and production release require separately approved configuration, backups, provider rights and verification.

[Official SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client) · [Local configuration](https://supabase.com/docs/guides/local-development/cli/config)
