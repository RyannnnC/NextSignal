# Project Handoff — NextSignal

Product planning notes from 2026-10-26. For the current local workflow, see [the documentation index](README.md).

## Founder and goals
Solo developer in Sydney with software engineering experience, Windows workstation and early budget around AUD 1,000. Target customers: Australian startup founders, pre-launch solo builders, small SaaS operators and small business owners. Product research and customer acquisition in Australia first. Avoid building a commodity SEO score generator or generic AI business-plan tool.

## Product name and draft messaging
- Product name: **NextSignal**.
- Tagline: **Validate your idea. Grow with evidence.**
- Promise: Australia-first, source-grounded research, not AI certainty or success guarantees.
- DO NOT claim AI knows owners' businesses better than owners do. Owners confirm/modify inferred business profiles.

## Planned product capabilities
### A. Validate My Idea
Natural-language idea + target geography -> business hypotheses and problem/solution framing -> user corrections -> keyword seeds and question mapping -> Australian contextual stats (ABS where semantically applicable), search demand/SERP (DataForSEO), customer questions (AnswerThePublic) -> identifiable direct/substitute competitors -> counter-evidence/failure patterns and unknowns -> three prioritized cheap validation experiments. Results must visibly distinguish evidence and inference.

### B. Grow My Business
Public URL -> restricted HTML extraction (initial maximum 5 pages) -> deterministic SEO checks -> founder-confirmed business profile -> search/query/competitive gap research using shared provider layer -> 3 prioritized actions with evidence, implementation steps and measurement. Early GEO content should be descriptive and cautious, not pretend to have guaranteed AI-search ranking positions.

### Shared project lifecycle
Founder can start as idea and later attach a launched website, preserving prior hypotheses, competitor set, datasets, experiments and report versions. Differentiation is IDEA -> VALIDATE -> LAUNCH -> GROW continuity, not just more keyword metrics.

## Third website section: Public Research / Case Studies
Public editorial library distinct from private user reports; Australian startup opportunity case studies and independent public website reviews. Publish only after human review, careful sourcing, disclaimers, non-affiliation statements and correction/takedown workflow. Publicly accessible websites do NOT imply unrestricted reuse rights. Do not publish negative unsupported allegations, estimates as facts or user-submitted proprietary ideas. Cases double as trust building and original SEO content.

## Data and research constraints
Initial named providers: **Australian Bureau of Statistics (ABS Data API), DataForSEO, AnswerThePublic**. AnswerThePublic API requires confirmation of plan/eligibility; provider redistribution/export/caching rights need verification. ABS requires dataset mapping; must not fabricate market size from irrelevant macro statistics. DataForSEO ads competition must not be relabeled organic ranking difficulty. Loot Drop is a discovery source for failed business patterns, **not** a pre-approved scraped dataset. Google Trends, Similarweb, Search Console and GA4 are optional future sources, not MVP dependencies.

## Business model: hypotheses to test
- Free Snapshot: limited inference and authentic but limited evidence, controlled quota; no paid API overuse.
- First paid product: one-time detailed Evidence Report, test **AUD 49** (not validated).
- Optional expert review / SEO implementation as human-delivered upsell (scoped pricing).
- Monthly subscription / competition watch only after users demonstrate repeat usage needs.
- Must use separate free vs paid research jobs, not perform full paid research secretly for every free user.

## Initial implementation priorities
1. Repo scaffold, read-only local mock research fixture and domain schema; UI styling deferred.
2. Validate My Idea end-to-end vertical slice; create project/research job/profile confirmation.
3. Provider adapters + normalized provenance + billing/quota controls; ABS/DataForSEO/ATP one at a time.
4. Evidence-centric reports with Red Team, provenance, failure/unknown handling.
5. Grow My Business with securely isolated fetcher and deterministic SEO checks.
6. Free vs paid runs, Stripe sandbox, immutable report versions, server-side entitlements.
7. Private dashboard/admin, cost telemetry, human-reviewed case study publication workflow, privacy/legal checks, marketing landing pages and SEO foundations.

## Non-goals for MVP
Do not prematurely implement: continuous GEO monitoring, guaranteed search ranking forecasts, automatic third-party website updates, unrestricted crawling, bulk Loot Drop mirroring, CRM/ERP integrations, unlimited subscription research, automatic public publication of user reports, complex enterprise features or a third paid product.

## Legal/operational constraints
Sensitive unpublished founder ideas and customer reports must be private by default, deletion supported, no undisclosed training or reuse, provider disclosures accurate. Comply with relevant Australia Consumer Law / ACCC advertising obligations, Spam Act / ACMA marketing rules, applicable Privacy Act / OAIC rules, ABN and GST obligations when relevant, and third-party API commercial licensing. Lawyer review prior to paid public launch. A general disclaimer is distinct from a Privacy Policy and cannot cancel statutory consumer guarantees. Human-reviewed label only on genuinely reviewed outputs.

## Visual design
Root DESIGN.md and PNG assets were supplied on 2026-10-27. The supplied assets use NextSignal, the confirmed product name. The existing component-library handoff remains pending. Preserve supplied assets and do not select or purchase a new UI system. See ADR 0003 for the functional M1 UI scope.

The owner approved English and Simplified Chinese UI switching, with self-hosted fonts and OFL notices. The dated native verification and fixture cutover are recorded separately. [Native PostgreSQL history](operations/2026-10-28-NATIVE-VERIFICATION.md) · [Fixture cutover history](operations/2026-10-28-LOCAL-CUTOVER.md)

## Current implementation

Local Supabase Auth is the everyday development entry point. The Validate preview creates private, versioned reports and can use the explicitly enabled ABS development comparison. Grow, paid research, publishing and production deployment are future work. The original fixture database remains available separately. [Local Auth](operations/LOCAL_SUPABASE_AUTH.md) · [Provider register](providers/LICENSE_REGISTER.md)
