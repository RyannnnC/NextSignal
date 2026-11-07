# Web iteration inventory and proposed plan

Date: 2026-11-02 (Australia/Sydney)

Status: Phase 1 inspected. Application implementation awaits owner approval, as explicitly requested in the pasted task. This document records observations and a proposal; it does not claim the proposed routes, pricing or services are implemented.

Follow-up: the owner approved Phase 2 on 2026-11-02. This inventory remains the pre-change baseline; see ADR 0008 and operations/2026-11-02-WEB-ITERATION-VERIFICATION.md for implementation and actual results.

## Scope and preserved decisions

Improve homepage organization, independent product/report navigation and reusable report presentation. Preserve the existing M1 fixture workflow, PostgreSQL runtime, contracts, authentication, RLS, immutable versions and provider restrictions. No real API, paid checkout, public deployment, CMS, database migration, new framework or new visual system is included.

The confirmed display name remains Next Signal, with a space, under the owner decision in AGENTS.md. Supplied image wordmarks use NextSignal; preserve the source artwork without adding a duplicate visible company name beside it. DESIGN.md's forest/mint tokens, self-hosted fonts, radius scale and native controls remain authoritative. There is no existing component framework to preserve or replace.

## Repository and dependency inventory

| Area | Actual implementation |
| --- | --- |
| apps/web | Next.js App Router, React UI, same-origin BFF, global design tokens, bilingual dictionary |
| apps/worker | Local HTTP host and research polling worker; explicitly fixture-only |
| packages/contracts | Strict Zod input/profile/evidence/report contracts |
| packages/application | Projects and ResearchRunner; independent of UI |
| packages/domain | Evidence integrity, state, budget and report validation rules |
| packages/adapters | Native PostgreSQL/runtime/session adapters; FixtureProvider; scoped PGlite test/migration support |
| supabase | Versioned application SQL migrations, rollback SQL and local identity shim |
| docker | Persistent local PostgreSQL and isolated native-test Compose services |
| tests | Base, native PostgreSQL/import, Chromium M1 and language/design coverage |
| assets | Logo.png, BigLogo.png, BigLogoWhite.png |

Installed dependency inventory was read with npm ls --depth=0: Next.js 16.4.3, React/React DOM 19.3.1, TypeScript 5.9.3, Zod 4.6.7, pg 8.23.1, PGlite 0.5.12, Playwright 1.64.1, Vitest 5.0.5 and the two existing Fontsource packages. No packages were installed or upgraded. The installed Next.js docs were consulted for page/dynamic-route/icon conventions; the relevant icon convention is app/icon.png, not favicon.png.

## Actual routes and components

| Route or component | Current responsibility and status |
| --- | --- |
| / -> apps/web/app/page.tsx | Renders FixtureApp from ui.tsx |
| apps/web/app/ui.tsx | Client state, language, header, hero, method panel, product entries, local login, idea/profile forms, private project list, run controls, inline reports and footer |
| apps/web/app/layout.tsx | Global CSS, metadata, html/body and skip link |
| apps/web/app/report-view.tsx | Independent typed ReportView renderer, currently rendered inline on / |
| apps/web/app/language-switch.tsx | Flag icons plus explicit language labels/pressed states; no remote assets |
| apps/web/lib/i18n.ts | Fixed English/Simplified Chinese UI and fixture text translation |
| /api/[...path] | Same-origin BFF for health, session and projects/confirm/runs/cancel; strict route allowlist |
| /validate, /grow | Not implemented; live HTTP requests returned 404 |
| /pricing, /research | Not implemented; live HTTP requests returned 404 |
| Independent report page | No page route exists in the source; there is no standalone report API |
| Analytics/charts | No implemented analytics/chart components; design/roadmap descriptions are not implementation |
| Favicon | No app icon file/metadata reference, no icon link in the inspected document; /favicon.ico returned 404 |

## Functionality already implemented

Validate My Idea has a local fixture vertical slice: Alice/Bob local sessions, separate processing/marketing choices, idea submission, deterministic profile placeholder, founder correction/confirmation, queued native jobs, bounded fixture calls, synthetic evidence, unknown/counter-evidence states, fixed experiments, immutable reports, regeneration/cancellation/deletion and tenant-scoped reads. Existing automated tests cover these behaviors; this inspection did not rerun the complete journey or those suites.

Grow My Business currently consists of an honestly deferred entry card. No URL form, fetcher, technical SEO analyzer, website research pipeline or growth report is operational. ABS, DataForSEO and AnswerThePublic are blocked/unimplemented in the provider register; no LLM provider is selected. Descriptions of these roadmap capabilities must not appear as currently delivered Free Snapshot features.

ReportView already renders title/time/market, synthetic/not-human-reviewed labels, limitations, findings, evidence with region/period/method/source reference and missing-data handling, three template actions, correction guidance and profile ID. This is useful reusable rendering to preserve; a wholesale report redesign is unnecessary.

## Homepage gap analysis

| Desired section | Actual state | Smallest proposed change |
| --- | --- | --- |
| Hero with brand | Existing value-proposition H1 and forest hero; typed header wordmark, supplied BigLogo not used | Preserve hero grammar/H1; add the supplied BigLogo visual with intrinsic 3:1 ratio and no duplicate company-name treatment |
| Two product entries | Both present; Validate works via page anchors, Grow deferred | Reuse the cards and point them to /validate and a clearly planned /grow page |
| How It Works | Describe/Confirm/Explore panel already exists inside Hero | Reuse/extract this content into the requested section; avoid a second duplicated step panel |
| Pricing & Services | Missing | Four cards from one typed configuration, with availability and placeholder pricing explicit |
| Free Analysis CTA | Existing Hero CTA only; no dedicated section | Reuse CTA styling and link directly to /validate with fixture disclosure |
| Research & Case Studies | Missing | Lightweight static planned-content section, no fake client results or report publication |
| Final CTA | Missing | Small existing-style CTA linking to /validate |
| Footer | Existing local/privacy/provider caveats | Preserve caveats and add working internal section/page links |

No existing pricing, case-study, checkout or public research components were found to preserve. Do not create standalone pricing/research pages solely to populate navigation: homepage anchors /#pricing and /#research are sufficient for this iteration.

## Brand assets inspected

| Actual source | Dimensions | Transparency | Proposed use |
| --- | --- | --- | --- |
| assets/Logo.png | 1254 x 1254 | Actual transparent and partially transparent pixels | Source for app/icon.png; retain the original and review a small proportional export |
| assets/BigLogo.png | 2172 x 724 | Actual transparent and partially transparent pixels | Hero visual wordmark; static image import with explicit aspect ratio |
| assets/BigLogoWhite.png | 2172 x 724 | Actual transparent and partially transparent pixels | Preserve as supplied; no need to introduce an additional variant in this iteration |

Pixel inspection used the already-installed Sharp dependency without modifying image bytes; Logo and BigLogo were also visually inspected. The sources contain substantial partial alpha and fine edge detail, so small-size legibility needs visual verification. Do not flatten transparency, stretch, crop or recolor them. No obsolete default framework icon was found to delete. File-name casing matters on Linux: the supplied source is Logo.png, not logo.png.

## Proposed routes and navigation

- /: focused marketing page assembled from the existing hero/entry/steps/footer and the genuinely missing sections.
- /validate: reuse the existing functional work area and state/HTTP logic extracted from FixtureApp. Preserve fixture notices, founder confirmation gating, scenarios, list/cancel/delete controls and inline status feedback.
- /grow: planned product explanation only, with real navigation back to the working idea fixture. Do not add a URL input or pretend that a crawler exists.
- /projects/[projectId]/reports/[reportId]: a private independent report view using the existing GET /api/projects/{projectId} response, ProjectView validation and ReportView. Find the report only inside the authorized project's report collection. No new database table or backend endpoint is needed. The route IDs are locators, not authorization.
- Pricing/research navigation: real homepage anchors. Free CTAs: /validate. Planned paid/custom services: status text plus a working link to the relevant scope explanation, not checkout/booking buttons. No invented support address, contact form or consultation availability.

Replace the full inline report list in the workspace with compact summaries and detail links while retaining ReportView unchanged or minimally composed for the independent page. This avoids maintaining two full report interfaces. Root / remains available as the homepage; existing internal #signin/#new-project links and E2E assumptions must be updated deliberately when the work area moves.

A directly opened private report must handle expired/absent sessions, login/return navigation, invalid IDs, missing/deleted reports and denied projects. Keep existing cache/noindex protections; this local iteration does not turn any surface into a public deployment.

## Pricing and availability proposal

| Service | Display | Current availability and CTA |
| --- | --- | --- |
| Free Business Snapshot | A$0 | Local idea fixture only; Start Free -> /validate. Explicitly state that real AI/website research is not yet available |
| Idea Validation Report | A$49 / report, proposed price | Planned; market/search/keyword/questions/competitors/Red Team/roadmap are planned deliverables, not current features. Link to scope explanation |
| Business Growth Report | A$79 / report, proposed price | Planned; website/SEO/search/content/competitor/growth findings are planned. Link to /grow |
| Expert Services | Custom Quote, planned service | Human review/consultation/SEO-GEO implementation/website optimization are not currently offered through the app. Link to an explicit service-status explanation |

Store display price, currency, availability, feature descriptions and CTA targets in one configuration. This is presentation data, not a billing/entitlement implementation. No subscription trial, unlimited usage, checkout, human-review claim, testimonials or invented statistics. All added copy must have English/Chinese equivalents. The A$79 tier is a proposed marketing placeholder, not an approved commercial entitlement or backend tier.

## Shared report approach

Preserve Report and ProjectView contracts and the current renderer's provenance/unknowns. Extract only genuinely repeated presentation blocks: a small ReportSection primitive and common header/evidence/limitations/actions presentation where needed. Do not create a separate component for every roadmap heading or add empty keyword/competitor/SEO panels to a fixture report.

Use a small typed presentation helper to select the saved report and its historical profile. Business Overview must use report.profileId, not the project's latest profile; otherwise an old immutable report could display newer corrected business information. Transformation stays separate from rendering and never rewrites the persisted report.

Document the future product-specific slots (Validate: hypotheses, demand/keywords, competitors, Red Team and experiments; Grow: business profile, technical SEO, search/content gaps, competitors and implementation roadmap). Only wire sections backed by today's contracts. Keep absent data explicit and leave real growth/paid report contracts to their own later slice.

## Proposed file manifest (not implemented)

Modify:

- apps/web/app/page.tsx: homepage composition.
- apps/web/app/ui.tsx: preserve/extract the existing work area; remove duplicated marketing shell and link to private report details.
- apps/web/app/layout.tsx: shared site shell/locale placement with existing skip link and local privacy metadata preserved.
- apps/web/app/report-view.tsx: only the shared presentation extraction warranted by the independent route.
- apps/web/lib/i18n.ts: shared translations and new copy.
- tests/e2e/fixture.spec.ts and tests/e2e/language-design.spec.ts: move workflow entry expectations to /validate and report-detail navigation; retain all existing behavior assertions.
- docs/operations/M1.md and docs/operations/M1_WALKTHROUGH.md: update navigation instructions.

Create:

- apps/web/app/validate/page.tsx.
- apps/web/app/grow/page.tsx.
- apps/web/app/projects/[projectId]/reports/[reportId]/page.tsx.
- apps/web/app/components/site-shell.tsx: existing-style header/footer/navigation and shared locale wiring.
- apps/web/app/components/marketing-home.tsx and marketing-home.module.css: homepage sections and scoped layout additions.
- apps/web/lib/services.ts: typed pricing/availability configuration.
- apps/web/lib/report-presentation.ts and apps/web/app/components/report-detail.tsx: saved-report/profile selection and client loading/auth/empty/error presentation.
- apps/web/app/icon.png: a proportional favicon export from the actual Logo.png source.
- tests/e2e/navigation.spec.ts and tests/report-presentation.test.ts: route/CTA/availability and historical-profile/missing-data regressions.
- docs/adr/0008-marketing-and-private-report-navigation.md: approved scope, route decisions and rollback plan after owner approval.

Reuse/preserve:

- assets/*.png, DESIGN.md, existing CSS token values/font imports and language-switch.tsx.
- packages/contracts, packages/domain, packages/application and packages/adapters business/persistence logic.
- apps/worker, apps/web/lib/bridge.ts and app/api/[...path]/route.ts security behavior.
- supabase, docker, .local/db, backups and the active native database volume.
- All existing tests; update navigation dependencies rather than deleting tests to make changes pass.

No global CSS rewrite is proposed. New marketing layout rules belong in a CSS module; if extraction reveals a necessary existing-selector adjustment, record it narrowly instead of changing tokens or broad element styles.

## Implementation order after approval

1. Record ADR and shared shell/locale extraction. Preserve the current visual vocabulary and M1 state semantics.
2. Add /validate using the existing work area, and /grow as an honest planned-capability page. Update internal links.
3. Add private report detail routing and small presentation helper, keeping historical profile binding and tenant checks.
4. Compose the homepage from reused sections plus missing pricing/CTA/research sections; integrate original brand assets and favicon.
5. Update translations, operation instructions and focused regression tests; verify the complete existing flow and independent report navigation.

## Acceptance criteria after implementation

- Homepage follows the requested eight-part order without embedding detailed private forms/reports; current hero value H1/design grammar remains.
- All navigation/CTAs have real destinations; unavailable services are clearly labelled. No real API/AI/website research is represented as operational.
- Original BigLogo aspect ratio/transparency is preserved; no duplicate company name is added alongside it. The icon link resolves to an image derived from Logo.png; no framework icon remains accidentally selected.
- Alice's existing projects/reports remain accessible through /validate and private report details. Unauthenticated/Bob/forged/missing/deleted report paths do not expose content.
- Idea -> consent -> profile correction/confirmation -> queued run -> partial fixture report -> new immutable version -> deletion still works. Old report overview resolves its historical profile.
- English/Chinese preference works across routes, including direct entry/reload, without changing saved business text or reports. Desktop 1440px/mobile 375px checks cover wrapping, targets, keyboard focus, no horizontal overflow and semantic/a11y checks.
- Run lint, typecheck, base tests, build, secret scan and Chromium flow/navigation/language checks. Run required native PostgreSQL checks with Docker healthy and report separate actual results; retain import/persistence checks in check:all. Stop/coordinate the dev instance before checks that require isolated ports or container restart; do not overwrite active application state to obtain a pass.
- No paid API/payment/network fetching/backend schema/permission changes; no dependencies or UI library required.

## Risks and mitigations

- Route extraction can break old anchors, login return flow, polling and tests currently hard-coded to /. Preserve behavior, update links/tests and verify direct reloads.
- Private report URLs can accidentally leak content through caching, pre-rendering or unscoped lookups. Keep the existing authorized project API, no-store/noindex behavior and cross-tenant tests.
- An overview joined to the newest profile would change the meaning of historical reports. Select by the immutable report.profileId.
- Global section/button styles can unintentionally affect new marketing sections. Scope new layout CSS and check both languages at narrow widths.
- Price cards and planned growth/consultation content can imply an available service. Make availability explicit in each card and CTA destination, not just in a footer disclaimer.
- PNGs contain partial transparency/fine detail and the BigLogo has embedded lettering. Check real light/dark rendering and small favicon legibility; keep originals intact.
- Existing source/work is largely untracked/modified in Git. Do not clean/reset/stage unrelated files or overwrite the repository. Any later commits must be scoped to agreed changes.
- Synthetic M1 success is software-path evidence only; real research quality, provider rights, production identity and public legal readiness remain incomplete.

## Actual Phase 1 verification

Executed on 2026-11-02:

- Read repository rules/design/architecture/handoff/legal/provider and relevant ADR/operation docs; inspected actual source/routes/config/tests/dependencies/assets.
- Docker info: healthy Linux Engine 29.9.2. Existing web/worker listeners were reused, not restarted.
- Health endpoint returned mode=local-fixture and database=postgresql.
- HTTP / returned 200; /validate, /grow, /pricing, /research and /favicon.ico returned 404.
- npm ls --depth=0 completed successfully; no install/upgrade.
- npm run lint and npm run typecheck passed.
- Browser inspection confirmed the existing homepage, product entries and local fixture notice. At requested mobile width 375px, the observed document had no horizontal overflow. This is a limited homepage check, not complete responsive/WCAG certification.
- Saved current screenshots under ignored artifacts/2026-11-02-home-before-desktop.png and artifacts/2026-11-02-home-before-mobile.png. PNG dimension/alpha inspection was read-only.

Build, unit/integration/native/import/persistence/E2E suites, dependency audit and remote CI were not rerun during this planning phase. Previous dated verification remains historical evidence, not a fresh result.

Actual repository change this phase: this planning document only. No application code, dependencies, source assets, schema, permissions, private project data or production infrastructure was changed. Approval is requested only for the concrete Phase 2 scope above.
