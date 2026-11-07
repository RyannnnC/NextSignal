# Phase 2 web iteration: implementation and verification

Date: 2026-11-02 (Australia/Sydney)

Owner approved the Phase 2 plan before implementation. This record describes actual local work, not a production release. No real API, payment, deployment, database schema, role-policy or research business-logic change was introduced.

## Delivered behavior

- / is now the marketing homepage: supplied BigLogo visual and existing value H1, product entries, reused Describe/Confirm/Explore content, four services, limited free-fixture CTA, clearly planned Research & Case Studies, final CTA and preserved local/privacy/provider caveats.
- /validate contains the existing M1 work area: local Alice/Bob login, consent, idea/profile correction and confirmation, scenarios, projects, runs, cancel/delete and immutable report summaries. The same service/API/database behavior remains behind it.
- /grow explains future website/SEO/growth scope. It has no URL input, crawler or live report claims.
- /projects/[projectId]/reports/[reportId] loads the existing authorized project endpoint and reuses ReportView. It supports direct reload, login/return, missing/deleted/denied records and historical-profile overview selection. It does not expose private content in static/server output or create a public report link.
- Shared SiteShell retains the supplied typography/tokens, original flag controls, language preference behavior, navigation/footer and a semantic skip link. New layout styles are scoped CSS modules; globals.css was not changed.
- services.ts is the single typed display configuration for availability, feature scope, A$0/A$49/A$79/custom quote and CTA targets. Paid/expert services are explicitly planned. All CTAs lead to real pages or scope anchors; no checkout or fake booking/contact form exists.
- Source PNG files remain byte-for-byte unchanged. BigLogo is used with its intrinsic 3:1 ratio and a proportionally contained responsive box. app/icon.png is a 64px transparent proportional export of Logo.png. Browser tests check the declared/rendered ratio and an icon link that resolves successfully.

ReportView remains the shared report renderer for provenance, findings, limitations and actions. report-presentation.ts performs saved-report/profile selection without mutating contracts or payloads. Future Validate/Grow-specific real research sections remain documented in ADR 0008; no fabricated keyword/competitor/SEO data or empty live-looking analytics was added.

## Actual changed-file manifest

Modified existing files:

- README.md
- apps/web/app/page.tsx
- apps/web/app/layout.tsx
- apps/web/app/ui.tsx
- apps/web/app/report-view.tsx
- apps/web/lib/i18n.ts
- tests/e2e/fixture.spec.ts
- tests/e2e/language-design.spec.ts
- docs/operations/M1.md
- docs/operations/M1_WALKTHROUGH.md
- docs/operations/2026-11-02-WEB-ITERATION-PLAN.md (approval follow-up only)

Added:

- apps/web/app/validate/page.tsx
- apps/web/app/grow/page.tsx
- apps/web/app/projects/[projectId]/reports/[reportId]/page.tsx
- apps/web/app/components/site-shell.tsx
- apps/web/app/components/site-shell.module.css
- apps/web/app/components/marketing-home.tsx
- apps/web/app/components/marketing-home.module.css
- apps/web/app/components/report-detail.tsx
- apps/web/lib/client-api.ts (extracted existing browser request behavior, with typed status/code errors)
- apps/web/lib/report-presentation.ts
- apps/web/lib/services.ts
- apps/web/app/icon.png
- tests/report-presentation.test.ts
- tests/e2e/navigation.spec.ts
- docs/adr/0008-marketing-and-private-report-navigation.md
- this verification record

No existing file was deleted. Pre-change SHA-256 comparison confirmed no changes in packages/, apps/worker/, supabase/, docker/, assets/, package.json/package-lock.json, DESIGN.md, globals.css, the BFF or API route. Existing unrelated modified/untracked work was preserved; no commit, reset, cleanup or production change was performed. Local hash manifests and screenshots are ignored verification artifacts, not private report exports for publication.

## Actual validation results

| Check | Actual result |
| --- | --- |
| Docker engine before native work | Healthy Linux Engine 29.9.2 |
| npm run check:all | Passed: lint, typecheck, base tests, secret heuristic scan, production build, native PostgreSQL, import, Chromium and persistent-container restart |
| Base tests | 32 passed across 4 files, including historical-profile/missing-data/safe-return-path regressions |
| Native PostgreSQL | 9 passed, including RLS, four OS workers, idempotency/lease/concurrency and migrations |
| Native import | 1 comprehensive suite passed; existing import/session/inspection boundaries retained |
| Chromium E2E | 6 passed, including the preserved M1 flow, immutable regeneration, deletion, HTTP/tenant boundaries, input safety, bilingual behavior and new navigation/private-report cases |
| Native persistence | Controlled stop/start passed; immutable report and post-restart tenant isolation preserved |
| Final application check after the last workspace error-handling adjustment | npm run check passed again: lint/typecheck, 32 base tests, scan and build |
| Final browser test/cleanup adjustment | npm run test:e2e passed again, all 6 cases; final lint/typecheck passed |
| git diff --check | Passed, with existing Windows line-ending normalization notices |
| Retained 2026-10-29 walkthrough project | Existing local read-only inspection passed with original IDs, 2 profiles, 1 run/report, 1 synthetic evidence, 3 actions and Bob-visible row count 0 |

Build output includes /, /grow, /icon.png, /validate, the private report route and the unchanged API catch-all. A local build is not a deployment. Remote CI and a fresh dependency audit were not run. No dependencies were installed or upgraded.

Browser checks include real CTA/anchor destinations, lack of a URL input on Grow, planned-service labels, supplied logo/icon usage, English/Chinese persistence across routes/reload, 1440px desktop/375px mobile layout and axe checks on the implemented surfaces. Existing M1 tests still exercise confirmation gating, immutable versions, synthetic unknowns, no external browser requests, cookies, tenant denial, deletion, keyboard navigation and hostile input rendered as text. Passing automated axe checks is not complete WCAG certification.

Private-report coverage includes owner direct/reloaded access, another account denied without exposing the overview, anonymous access, explicit logout, sign-in return to a validated internal route, missing/random/malformed identifiers, deleted report state and historical customer binding. A nonexistent/unauthorized report uses the same unavailable message. Reports remain behind the existing API/RLS; no ID-only authorization or admin query was added.

## Issues found and corrected during validation

- Next image optimization rounds small pixel dimensions. The logo now explicitly keeps a 3:1 contained box; the regression checks intrinsic HTML proportions and rendered layout rather than demanding an exact ratio from an optimizer's rounded natural dimensions.
- A new test originally submitted an API mutation before login finished. It now waits for the authenticated workspace, preserving the real session boundary.
- Next's own route-announcer also uses role=alert. Missing-report assertions are scoped to the app's main content, without changing application accessibility behavior.
- A mobile screenshot initially caught the previous client route during navigation. The final test checks the homepage URL/H1, reloads, verifies the hero at mobile width and then captures the actual homepage. The final mobile homepage image was visually inspected.
- Repeated test runs consumed the real bounded fixture-session quota. The quota and session implementation were not changed. Tests now revoke their own sessions in afterEach/finally, and the private-route test explicitly signs out before testing anonymous re-entry. One credential recovered only from this task's retained failing-test trace was revoked through the existing session API without printing it. No bulk session-table deletion, role change or quota bypass was used; earlier discarded sessions remain subject to the existing expiry policy. The final full browser suite passed after this cleanup fix.

Nonfatal Windows Watchpack system-file warnings and NO_COLOR/FORCE_COLOR notices occurred during development/browser checks. They did not prevent passing checks; no unrelated system/tooling change was made.

## Preview and remaining limits

The local dev server was restored at http://127.0.0.1:3000 after build/persistence verification. Use Start Free or visit /validate for the preserved workflow. The homepage preview tab is retained. Screenshots live under ignored artifacts/: phase2-home-desktop.png, phase2-home-mobile.png, phase2-home-final.png, m1-desktop.png/m1-mobile.png and language/design captures.

Real AI/provider integrations, website analysis, growth reports, paid reports, expert booking/delivery, reviewed public cases and production identity/legal readiness remain incomplete and visibly planned. Native test accounts are local fixtures, not production authentication. Source asset licensing/public brand review remains a separate launch consideration; no legal clearance is asserted.

No further approval is required to finish this authorized local UI scope. A subsequent real-provider or production milestone still needs its own scoped approval and provider/security prerequisites. Recommended next work is owner review of copy/layout followed by one licensed evidence-provider vertical slice; do not broaden into payments or crawling as part of this UI iteration.
