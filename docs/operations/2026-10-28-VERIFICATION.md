# Next Signal: native gate and bilingual UI verification

Date: 2026-10-28 (Australia/Sydney)

Follow-up: the owner subsequently resolved Docker virtualization. Native verification now passes, including the cancellation/deletion fixes recorded in [2026-10-28-NATIVE-VERIFICATION.md](2026-10-28-NATIVE-VERIFICATION.md). The blocked results below describe the earlier run and are preserved as history.

## Implemented changes

- Native PostgreSQL: docker/compose.native-test.yml, scripts/test-postgres.ts, vitest.native.config.ts, packages/adapters/src/postgres.ts, packages/adapters/package.json, tests/native/setup.ts, tests/native/worker-process.ts, tests/native/postgres.native.ts.
- Required verification commands and CI: package.json, package-lock.json, .github/workflows/ci.yml. New dependencies are pg/@types/pg, the specified Fontsource fonts, and axe-core's Playwright adapter.
- Bilingual visual surface: apps/web/app/ui.tsx, report-view.tsx, language-switch.tsx, globals.css and apps/web/lib/i18n.ts. Native controls remain; no new design framework is selected.
- Browser acceptance: tests/e2e/language-design.spec.ts.
- Governance: AGENTS.md, DESIGN.md, README.md, docs/ARCHITECTURE.md, docs/PROJECT_HANDOFF.md, docs/adr/0005-native-verification-and-bilingual-ui.md, docs/operations/NATIVE_POSTGRES.md, this record and two complete font OFL notices in docs/licenses.

## Actually executed

| Check | Outcome |
| --- | --- |
| Docker version/info and Desktop status | Engine readiness failed; timeout/HTTP 500 |
| WSL --version / --status | Returned successfully; does not prove hypervisor readiness |
| Desktop inspection with computer-use | Dashboard reported Virtualization is disabled in firmware; Engine stopped |
| npm run test:postgres | Failed at engine prerequisite before any native container/test was run; no fallback |
| Docker Compose config --no-interpolate --quiet | YAML configuration validation passed; not an engine test |
| npm run check | Base lint, strict typecheck, 30 existing tests, secret heuristic scan and production build passed |
| npm run test:e2e | 4 Chromium scenarios passed, including the new bilingual flow |
| Targeted bilingual browser rerun | Passed after explicit loaded-font assertion was added |
| npm audit --audit-level=high --json | 0 known vulnerabilities returned at execution |

Native scenarios are **written but NOT PASSED / NOT EXECUTED**. CI configuration has not been executed remotely. The native auth schema is a test compatibility shim, not Supabase JWT verification. No paid provider, real model, payment, production deployment or application database migration was performed.

## UI evidence and limits

Chromium checks cover self-hosted loaded fonts, no external browser requests, persistent locale, document language, flag/button accessible names and pressed state, unchanged typed idea/customer fields, unchanged stored report versions, translated report templates, 375px overflow, reduced motion and axe audits on Chinese login/report views. Screenshots in ignored artifacts/ show English/Chinese desktop, Chinese mobile and report views; these were inspected. No complete WCAG conformance or owner visual approval is claimed.

The dictionary translates fixed app/template content only. Founder content and source identifiers remain unchanged. Chinese body glyphs use installed system fallbacks; their appearance can vary across computers. Font notices are retained verbatim. Existing logo PNGs have not been edited.

## Required next action

The owner needs to resolve CPU virtualisation / Windows hypervisor readiness and restart Windows/Desktop as needed. Once `docker info` succeeds against a Linux engine, run `npm run test:postgres` to produce the missing native migration/RLS/multi-process evidence. Do not call the native gate complete based on the base checks above.
