# M1 implementation verification

Date: 2026-10-27 (Australia/Sydney)

## Delivered scope

Local fixture sign-in -> processing notice -> idea -> immutable profile preparation -> founder correction/confirmation -> durable queued research -> synthetic private snapshot -> new profile/report version -> project deletion. No live model, provider, website fetching, payment, email, public publishing or deployment.

This is a local development slice, not production authentication or a claim that every G0/G1 production gate is closed. PGlite executes PostgreSQL roles, RLS and constraints; native PostgreSQL/Supabase and real-user security remain separate verification gates.

## Checks actually executed

| Check | Result |
| --- | --- |
| npm run lint | Passed |
| npm run typecheck | Passed with TypeScript strict |
| npm test | 30 passed: 6 domain, 23 database/security integration, 1 file persistence |
| npm run scan:secrets | Passed; limited heuristic scan, ignored runtime data excluded |
| npm run build | Passed: Next.js production build, no deployment |
| npm run check | Passed aggregate lint/typecheck/test/secret-scan/build |
| Targeted final SQL/RLS integration rerun | 23 passed after strengthening composite foreign-key assertion |
| npm run test:e2e | 3 Chromium scenarios passed on final runtime |
| npm audit --audit-level=high --json | 0 known vulnerabilities returned at execution |
| git diff --check | Passed; existing Git line-ending conversion warnings remain informational |
| Desktop/mobile screenshots | Captured at 1440px and 375px; inspected for layout and evidence labels |

Browser scenarios cover corrected profile and immutable report versions, deletion, anonymous/CSRF/tenant/input limits, HttpOnly cookies, keyboard entry, untrusted HTML as text and no external browser requests. SQL tests also cover provider failures, budgets, retries, lease recovery/exhaustion, cancellation/deletion in flight, RLS read/write denial, immutability, licence blocks and rollback/reapplication. Persistence tests close/reopen file-backed PostgreSQL and detect migration drift.

No live API, Supabase Auth, native PostgreSQL concurrent-worker, production infrastructure, payment, export or crawler test was run. GitHub Actions and its gitleaks action are configured but have not run remotely. No human-review label or legal clearance is asserted. This agent's screenshot inspection is not owner visual approval or human editorial report review.

## Changed or created files in this task

The owner had already changed AGENTS.md and added DESIGN.md/assets before this task. Their UI instructions and supplied assets were preserved; this task changed only the onboarding design-path line in AGENTS.md. DESIGN.md and all three supplied PNGs were read, not edited. Next.js generated apps/web/AGENTS.md and next-env.d.ts.

- `.env.example`
- `.github/workflows/ci.yml`
- `.gitignore`
- `AGENTS.md`
- `README.md`
- `apps/web/AGENTS.md`
- `apps/web/app/api/[...path]/route.ts`
- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/ui.tsx`
- `apps/web/lib/bridge.ts`
- `apps/web/next-env.d.ts`
- `apps/web/next.config.ts`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/worker/package.json`
- `apps/worker/src/main.ts`
- `apps/worker/src/server.ts`
- `docs/ARCHITECTURE.md`
- `docs/PROJECT_HANDOFF.md`
- `docs/README.md`
- `docs/adr/0001-m1-local-fixture.md`
- `docs/adr/0002-evidence-and-confirmation.md`
- `docs/adr/0003-design-handoff-status.md`
- `docs/operations/M1.md`
- `docs/operations/M1_VERIFICATION.md`
- `docs/providers/LICENSE_REGISTER.md`
- `docs/security/THREAT_MODEL.md`
- `eslint.config.mjs`
- `package-lock.json`
- `package.json`
- `packages/adapters/package.json`
- `packages/adapters/src/database.ts`
- `packages/adapters/src/fixture-provider.ts`
- `packages/adapters/src/index.ts`
- `packages/application/package.json`
- `packages/application/src/index.ts`
- `packages/application/src/projects.ts`
- `packages/application/src/runner.ts`
- `packages/contracts/package.json`
- `packages/contracts/src/index.ts`
- `packages/domain/package.json`
- `packages/domain/src/index.ts`
- `playwright.config.ts`
- `scripts/dev.ts`
- `scripts/scan-secrets.mjs`
- `supabase/migrations/202610270001_m1.sql`
- `supabase/migrations/202610270002_lease_exhaustion.sql`
- `supabase/rollback/202610270001_m1.sql`
- `supabase/rollback/202610270002_lease_exhaustion.sql`
- `tests/domain.test.ts`
- `tests/e2e/fixture.spec.ts`
- `tests/helpers.ts`
- `tests/integration.test.ts`
- `tests/persistence.test.ts`
- `tsconfig.json`
- `vitest.config.ts`

Ignored runtime artifacts include .local database/session/capability files, .next, screenshots under artifacts/, and Playwright test-results/. They are not source changes or committed customer data. No commit or push was created.

## Remaining owner inputs and gates

- Confirm Know Your Business versus NextSignal before branded UI work.
- Supply the intended existing UI library/source/version and commercial licence.
- Supply licensed font assets and clean SVG/vector/transparent logo exports if exact typography and brand use are required.
- Review the local functional slice; later review the actual branded UI.
- Before real providers: approve specific account/endpoint rights, data retention, export/cache terms, processing/cross-border disclosures and budget caps.
- Before production: native PostgreSQL/Supabase Auth/storage, scoped worker credentials, encrypted transport/storage, backups/deletion restoration, abuse controls, human report QA and legal review.

