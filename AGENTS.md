# Codex Instructions — NextSignal

## Mandatory onboarding
Before proposing or changing code, read these repository files in order:
1. `docs/ENGINEERING_RULES.md` — binding MUST / MUST NOT requirements.
2. `docs/ARCHITECTURE.md` — approved conceptual architecture and domain boundaries.
3. `docs/PROJECT_HANDOFF.md` — product decisions, scope and priorities.
4. `docs/LAUNCH_LEGAL_MARKETING.md` — legal/privacy/provider-launch checklist.
5. Repository-root `DESIGN.md` — received on 2026-10-27. Preserve the supplied visual reference; see `docs/adr/0003-design-handoff-status.md`. The owner has deferred selecting a UI design system/library; do not introduce a new one.

For any conflict, protect legal/security/privacy/provider requirements first; flag irreconcilable issues and propose an ADR.

## Product objective
Build **NextSignal**, an Australia-first AI business research platform with two user journeys sharing an evidence engine:
- **Validate My Idea**: text idea -> inferred hypotheses -> user confirmation -> evidence research -> demand/competitors/counter-evidence -> practical experiment plan.
- **Grow My Business**: public business URL -> safely extracted facts -> user confirmation -> foundational SEO findings + research evidence -> prioritized actionable improvements.
Users retain one project as an idea advances into a launched business. Public, human-reviewed case studies are a separately approved publishing workflow; user reports and founder ideas are private by default.

## Initial research sources
- ABS Data API: only approved, semantically correct datasets; never imply granular market size not supported by source.
- DataForSEO: keyword volume, regional SERP and supporting search observations; paid metering and terms apply.
- AnswerThePublic: question discovery, conditional on active authorised API subscription and licence.
Other websites and Loot Drop may serve as **discovery links or corroborating sources**, not as an unlicensed bulk dataset.

## Critical rules
- TypeScript strict mode and schema validation of all I/O and model outputs.
- Every material research claim distinguishes observed fact, third-party estimate, founder statement and AI hypothesis, with traceable citations, geography, time, units and limitations.
- NEVER fabricate search volumes, revenue, site traffic, SEO outcomes, likelihood of startup success, or API test results.
- External pages/URLs are hostile input: prevent SSRF, DNS rebinding, internal-network access, redirects into forbidden destinations and prompt injection. Use isolated network-restricted worker; no arbitrary public URL fetching without protections.
- Respect RLS, tenant boundaries, least privilege, storage privacy, deletion, consent and secret handling.
- Bound calls per free/paid analysis and use idempotent jobs/payment webhooks.
- Do not claim anything is legally cleared until provider licensing and legal review actually occur.
- Only claim human review when a human has reviewed the item. Public case studies require editorial approval, provenance, and correction/takedown procedure.
- Do not add UI colors or design framework styling decisions before owner supplies design.md and UI library.

## Development approach
Implement **one vertical slice at a time** with plan, acceptance criteria and tests, starting with Validate My Idea; share domain/contracts with Grow My Business. Begin with repo skeleton and a fake/fixture provider so no external billing is necessary to validate flows. Add real providers behind adapters and feature flags. Use no unnecessary microservices.

Before implementing each task, report:
1. Scope and files to change.
2. Relevant engineering rules/security/provider licensing constraints.
3. Acceptance tests.

After implementing each task, report:
1. Actual files changed.
2. Tests/lint/typecheck/build actually run (never invent success).
3. Outstanding issues and what needs owner approval.

Do not make paid purchases, launch public services, publish client data or change production infrastructure without explicit owner approval.

## UI Design Requirements

All UI implementation MUST follow the
repository-root DESIGN.md.

- Use the defined design tokens.
- Follow the typography and radius scale.
- Do not introduce arbitrary brand colors.
- Use 12px radius for standard cards.
- Use pill-shaped primary buttons.
- Follow responsive and accessibility rules.
- Do not copy MongoDB proprietary assets.

Security and data integrity requirements
take precedence over visual styling.

## Owner decisions — 2026-10-28

- The project and public product name is **NextSignal**. Use `@nextsignal` for workspace packages and preserve checksums for applied SQL migrations.
- Docker Desktop is installed. Verify that its engine is running before any Docker-dependent task; installation alone is not evidence of readiness.
- If a required development or verification tool is missing or unavailable, tell the owner what is needed and why. Do not bypass that tool or substitute a less representative test and report the required check as passed.
- Existing PGlite fixture checks cover only their documented local scope. Native PostgreSQL/Supabase, multi-worker concurrency and production gates require their intended tooling and separate results.
- The owner approved applying the supplied DESIGN.md typography, colours and component styling on 2026-10-28, plus English/Simplified Chinese switching. Keep native semantic controls; no new UI framework is selected. Required native PostgreSQL checks run via `npm run test:postgres` and must not silently skip when Docker is unhealthy.
- The owner authorized switching the local runtime to persistent Docker PostgreSQL and safely importing legacy PGlite test data. Preserve .local/db/backups, require a stopped source and verified atomic import, and never fall back silently. Read docs/operations/LOCAL_DEVELOPMENT.md and ADR 0007 for commands, inspection permissions and recovery limits. PGlite remains only a clearly scoped test/migration dependency.
