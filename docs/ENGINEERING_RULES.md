# Know Your Business — Mandatory Engineering Rules

> Version 0.1.0 — 2026-10-26  
> **MUST / MUST NOT** are merge-blocking. **SHOULD** is default unless documented in an ADR.  
> These are internal coding rules for humans and AI coding assistants. They are not a substitute for provider contracts or professional legal advice.

## Precedence
1. Applicable law, security and privacy obligations, third-party license terms.
2. `ENGINEERING_RULES.md` (this file).
3. `ARCHITECTURE.md` and approved ADRs.
4. Repository conventions, tests, code-style tooling.
5. `design.md` (visual standards only, supplied later).
6. Individual issue / feature requests.

Where conflicts occur, STOP and flag them; never silently override a higher-priority rule. UI style does not override user safety or access control.

## Product and data correctness
- **MUST** clearly separate observation, third-party estimate, founder statement and AI inference.
- **MUST** cite evidence IDs and relevant dates/regions/units for every numeric claim in reports.
- **MUST NOT** fabricate demand, traffic, keyword volumes, competitor pricing, growth rates, startup success probabilities or search ranking effects.
- **MUST** preserve and display unknowns, contradictions, stale evidence and API failure states.
- **MUST** maintain source snapshots/metadata to reproduce the reasoning (subject to licensing/retention rules).
- **MUST NOT** infer precise city-level statistics from national/state series.
- **MUST** allow founder correction of business profile and recalculate downstream prioritisation.
- **MUST NOT** convert AI confidence into a fictional statistical probability.

## Architecture and types
- **MUST** use TypeScript strict mode and Zod/JSON Schema for external input, provider responses and LLM output.
- **MUST** keep business domain separate from HTTP handlers, UI components, database adapters and providers.
- **MUST** expose provider interfaces and normalise all returned metrics to an evidence contract.
- **MUST** use schema migrations with forward and rollback plans; no ad-hoc manual production DDL.
- **MUST** use idempotent background jobs, payment fulfillment and event handlers.
- **SHOULD** keep one deployable web application + separately isolated worker until scaling justifies further services.
- **MUST NOT** hard-code API prices, tokens, provider credentials or client-specific secrets.

## AI safety and reproducibility
- **MUST** version prompts and model configuration used by each research run.
- **MUST** treat scraped pages and user submissions as untrusted data, not system instructions.
- **MUST** enforce max tokens, number of source queries, cost caps and output validation.
- **MUST** show where AI made hypotheses and what would falsify them.
- **MUST NOT** claim legal, financial or investment certainty or guarantee SEO/GEO results.
- **MUST** allow quality review, correction and regeneration without silently overwriting prior report versions.
- **SHOULD** benchmark AI report quality against baseline LLM research using a fixed test set and human assessors.

## Security and tenant boundaries
- **MUST** enforce authentication/authorisation server side and PostgreSQL RLS on all customer-owned data.
- **MUST** private-by-default for founder ideas, job inputs, report bodies, provider credentials and payment records.
- **MUST NOT** expose service-role keys or private data to client code or logging.
- **MUST** segregate untrusted web fetching with network-level egress restrictions; handle SSRF, DNS rebinding, redirect rechecks and malicious media types.
- **MUST** implement limits on input length, request rate, crawled pages, redirects, response sizes and billable provider usage.
- **MUST** validate webhook signatures and make processing idempotent.
- **MUST** prevent cross-tenant leaks through API endpoints, job queues, exports and admin consoles.
- **MUST** keep audit trails for privileged access and sensitive changes.
- **MUST NOT** run arbitrary customer-uploaded code or connect to a production CRM/ERP in MVP.

## Privacy and marketing
- **MUST** explain AI/provider processing to users before collecting unpublished ideas.
- **MUST** minimise, retain only as needed, support deletion requests and document subprocessors/cross-border handling.
- **MUST NOT** train shared models on private ideas or use them in public marketing without affirmative permission.
- **MUST** distinguish product-service notifications from promotional emails and separate explicit marketing opt-in.
- **MUST NOT** assume a website URL submission proves site ownership or constitutes marketing consent.
- **MUST** obtain legal review of Terms, Privacy, refund terms, data transfers and provider license permissions before paid public launch.

## API provider rules
- **MUST** document authorized endpoint, ToS/contract version, commercial display rights, caching/export rights, rate limits and attribution for every API.
- **MUST** use ABS only where dataset semantics match query and use official source attribution.
- **MUST** treat DataForSEO advertising competition as advertising-related (not organic SEO KD).
- **MUST** only enable AnswerThePublic API when contractual subscription/alpha access is active.
- **MUST NOT** scrape Loot Drop en masse or commercially republish it without adequate rights.
- **MUST** add provider-level circuit breakers, caching and partial-result behavior.

## Payment and consumer fairness
- **MUST** show price, included research scope, delivery and known limitations before payment.
- **MUST** grant paid access only after server-side verified settlement/completion events.
- **MUST** respect applicable Australian Consumer Law rights; no blanket 'no refunds' policy.
- **MUST** stop billing and/or provide appropriate remedy where service cannot be delivered as agreed.
- **MUST** show a clear way to request help, corrections and refunds.

## Testing: no merge without
- Unit tests for evidence normalization, scoring/priority, keyword deduplication, permissions and budgets.
- Provider adapter contract tests with live-safe fixtures and failure cases (timeouts, missing data, exceeded quota, malformed response).
- Integration tests for stage transitions, duplicate webhook, payment failure, project isolation, report export.
- Security tests for SSRF, redirect loops, DNS rebinding, HTML prompt injection, role bypass and anonymous abuse.
- End-to-end tests for Idea → Snapshot, URL → Snapshot, paid unlock and delete request.
- Automated checks: lint, typecheck, test, build, dependency/secrets scanning.
- Human report QA: no ungrounded statistics; provenance and limitations visible.

## Coding workflow
1. Read `ENGINEERING_RULES.md`, `ARCHITECTURE.md`, related ADRs and later the approved `design.md`.
2. Restate feature purpose, in/out of scope, data sources, legal/security impact and acceptance criteria.
3. Define contracts/schemas and relevant tests first.
4. Implement the smallest vertical slice; favor feature flags over unreleased complexity.
5. Run all checks; report tests actually executed vs not executed.
6. Update documentation, provider license register, migrations and telemetry.
7. Submit concise PR explaining trade-offs, evidence and rollback.

## Definition of done
A feature is **not done** until: it works; tests pass; owner/tenant access is checked; secrets safe; provider rights documented; monetary cost bounded; source/evidence integrity validated; privacy impact assessed; failures and empty states work; accessible UX confirmed; docs and telemetry updated.

## AI coding-assistant instruction (copy into repository instructions)

> Before writing or modifying code, read `docs/ENGINEERING_RULES.md` and `docs/ARCHITECTURE.md`. Respect their precedence and all MUST/MUST NOT statements. Do not fabricate tests, source data, API access, permissions or legal clearance. Ask for an ADR when a design conflicts with the architecture. Implement typed domain contracts, reliable tests, secure access, source-grounded business analysis, and cost caps. UI visuals remain undecided until an approved `design.md` is provided. Summarize changed files, tests run, unresolved risks and any blocked compliance requirements.
