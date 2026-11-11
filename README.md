# NextSignal

The project and public product name is **NextSignal**. Workspace packages use the `@nextsignal` scope. See ADR 0004 for tooling requirements and the distinction between fixture and production-representative verification.

Australia-first business research platform. M1 is a **local synthetic fixture** for the Validate My Idea workflow, not live market research or a public service.

## Run locally

Requires Node.js 24, npm and Docker Desktop with a healthy Linux engine. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:3000` for the homepage and follow Start Free to `/validate`. Choose a local Alice/Bob test account, read the processing notice, enter a test idea, correct/confirm the profile and start a fixture snapshot. View report opens the private versioned detail page; Back to project restores its workspace. Reports, runs and versions persist locally. Delete a project to remove its input and report payloads. `/grow` and the pricing/research sections describe planned services, not live integrations. No real AI, data provider, payment, email or URL-fetch integration is enabled.

**Keep this mode on your own computer.** Test identities are not production authentication. Do not enter confidential ideas or expose the ports. `.local/` is private runtime data excluded from Git.

The local runtime now uses persistent Docker PostgreSQL on 127.0.0.1:54328. Docker Desktop's Linux engine must be running. Legacy PGlite data has an explicit backup/import path (`npm run db:migrate` while web/worker are stopped); it is never opened as a runtime fallback. See [run/inspect/recovery instructions](docs/operations/LOCAL_DEVELOPMENT.md) and [the generated database field reference](docs/database/SCHEMA.md).

## Structure

- `apps/web`: Next.js marketing pages, fixture workspace, private report presentation and same-origin BFF.
- `apps/worker`: dedicated local fixture host and durable job loop.
- `packages/contracts`: strict Zod schemas shared with the browser.
- `packages/domain`: evidence, state and budget invariants.
- `packages/application`: use cases, ports and research executor.
- `packages/adapters`: local PostgreSQL/PGlite and fixture provider.
- `docker/compose.local.yml`: persistent local PostgreSQL; separate from disposable native tests.
- `supabase`: initial PostgreSQL migration and local rollback.
- `tests`: domain, SQL/RLS integration and browser scenarios.

## Verify

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm audit --audit-level=high
```

See [M1 operation and limitations](docs/operations/M1.md), [ADRs](docs/adr/0001-m1-local-fixture.md), [threat model](docs/security/THREAT_MODEL.md) and [provider register](docs/providers/LICENSE_REGISTER.md).

The confirmed brand is NextSignal. Root [DESIGN.md](DESIGN.md) now supplies the applied colours, shapes and typography. M1 uses native semantic controls, self-hosted DM Sans/IBM Plex Mono with [OFL notices](apps/web/public/licenses/DM-Sans-OFL.txt), and upper-right English/中文 flag buttons. Language switching changes presentation only; idea text and stored reports are preserved. No UI framework or remote font/translation service is used. Existing PNG logo assets remain unchanged.

Native PostgreSQL migration/RLS/multi-process verification is available through `npm run test:postgres`; `npm run check:all` includes it as a required gate. It fails instead of falling back when Docker is unhealthy. See [native verification status and host prerequisite](docs/operations/NATIVE_POSTGRES.md). The local preview still uses the original fixture data; production Supabase authentication is not implemented.

Use `npm run db:schema` to see live columns/types, or `npm run db:shell` for a read-only psql session inside Docker. Application code stays in this repository; open it with VS Code's File -> Open Folder. A host psql installation or database extension is optional.
