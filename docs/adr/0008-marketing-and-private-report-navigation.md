# ADR 0008: Marketing, fixture workspace and private report navigation

- Date: 2026-11-02
- Status: Owner approved; implemented locally, verification recorded separately
- Owner: Project owner

## Decision and scope

Preserve the existing M1 idea fixture and its native PostgreSQL/application/contracts/security boundaries. Extract its work area into /validate, keep / as a focused marketing page, add /grow as a clearly planned capability explanation, and display saved reports at /projects/[projectId]/reports/[reportId]. Reuse the existing ReportView and authorized project API rather than creating a report backend or new data model.

SiteShell shares existing navigation/footer/language controls and in-memory locale state across routes. Existing locale storage behavior, no-store/noindex headers, BFF origin/cookie checks and tenant RLS remain unchanged. A report page contains no private business content in static/server output; its client loads the existing authorized project endpoint. A UUID in a URL is not authorization. Unauthenticated viewers get a sign-in link; denied/missing/deleted records get one generic unavailable state. Return navigation accepts only the fixed internal UUID report pattern. Historical overview data is selected by report.profileId rather than the latest profile.

The homepage reuses hero typography, product entries, steps and footer caveats. Missing pricing/CTA/research sections use existing tokens and scoped CSS modules. Source BigLogo.png supplies the hero wordmark without a duplicate visible name inside the hero; value text remains the semantic H1. The original PNGs are untouched. app/icon.png is a proportional 64px transparent export of Logo.png using already-installed image tooling.

## Truthfulness and limits

Only the local idea fixture is available. The A$0 snapshot card states its synthetic limitations; A$49 and A$79 are proposed per-report display prices, and Custom Quote is a future service. They do not create commercial tiers, entitlements, bookings or checkout. A single typed services configuration owns display prices, availability, scope and CTA targets. All CTAs navigate to working pages or scope anchors. Research cards are labelled planned editorial content, never invented case studies. No private user report is copied into marketing.

Grow-specific technical SEO/keyword/competitor/implementation modules remain roadmap slots. The current contracts cannot honestly provide them; do not manufacture empty/live-looking analytics. ReportView already supplies reusable evidence/findings/limitations/actions presentation, so no large report component hierarchy is introduced. Future real-provider and growth contracts require their own vertical slice and approval.

## Alternatives and consequences

Rebuilding the homepage and analysis experience would duplicate working logic and risk tenant/evidence regressions. Adding a new report endpoint or table is unnecessary because Projects.get already returns authorized versioned reports and profiles. Keeping all content on / would retain the navigation problem. Adding every future report heading now would create misleading empty UI. Use small presentation and client-request helpers, and retain all backend interfaces.

Shared navigation and independent report routes require updating old /#signin and /#new-project entry expectations to /validate. No broad redirect is introduced. Workspace summaries link to the single full report presentation rather than duplicating it inline. Public indexing, production auth, provider licensing and legal readiness are not implied by marketing layout work.

## Verification, cost and rollback

See operations/2026-11-02-WEB-ITERATION-VERIFICATION.md for actual checks and changed-file manifest. Regression coverage includes historical profile selection, safe return paths, existing M1 behaviors, direct report reloads, sign-in return, cross-tenant/missing/deleted records, CTA destinations, bilingual state, mobile layout, keyboard/a11y and original asset usage. Required native checks remain separate from scoped PGlite tests.

No new dependencies, paid APIs, cloud cost or deployment are introduced. Extra pages/assets add a small local build/browser cost; production performance and commercial pricing remain future work. Rollback concerns only web presentation/routes/tests: restore the previous page/ui/layout/report-view/i18n files from the pre-change source state and remove the new web files/icon. Do not roll back migrations, delete native/PGlite data, reset credentials or alter role grants to revert UI.
