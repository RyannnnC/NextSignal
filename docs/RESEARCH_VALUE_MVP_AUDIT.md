# Research value MVP audit

## Implementation inventory

| Capability | Status | Code and evidence |
| --- | --- | --- |
| Idea intake | Working | `apps/web/app/ui.tsx` submits the idea, AU geography, consent, scenario and request UUID. `packages/contracts/src/index.ts` validates them. `packages/application/src/projects.ts` stores the idea and immutable profile versions. |
| Business parsing | Mock | `Projects.create` copies the input into the profile and supplies generic customer and problem placeholders. The founder can edit and confirm them. |
| Website analysis | Missing | `apps/web/app/grow/page.tsx` renders `GrowthScope` in `apps/web/app/components/marketing-home.tsx`. The current project contract rejects website input. |
| Research jobs | Working | `Projects.start` enqueues a run against a confirmed profile. `packages/application/src/runner.ts` reserves an attempt and commits evidence, actions and a report. `supabase/migrations/202610270002_lease_exhaustion.sql` handles leases and terminal retry exhaustion. |
| Keyword extraction | Missing | `packages/domain/src/index.ts` exposes deduplication, and the worker has no keyword planning call. `packages/adapters/src/fixture-provider.ts` emits a null search volume for the normal scenario. |
| Demand analysis | Mock | `FixtureProvider` supplies unavailable or synthetic contradictory values. `makeFixtureReport` marks demand unknown. No live volume or willingness to pay is established. |
| Competitor discovery | Missing | The normal fixture includes no observed competitor rows. Its comparison action asks the founder to find substitutes. |
| AI report generation | Mock | `makeFixtureReport` constructs fixed findings and actions in `packages/application/src/runner.ts`. No model is called. |
| Supabase persistence | Partial | `scripts/lib/supabase-dev-verify.ts` exercises the same application services and tenant policies in Sydney PostgreSQL. It rolls back test data. `apps/web/lib/bridge.ts` and `apps/worker/src/main.ts` serve the browser through local Docker PostgreSQL and fixture sessions. |
| Evidence citations | Partial | `Evidence` and `Report` enforce IDs, timestamps, scope and numeric provenance. `apps/web/app/report-view.tsx` renders evidence and limitations, but normal sources are internal fixture references. |
| Error handling | Working | The fixture supports missing, contradictory, timeout, malformed and quota outcomes. The runner bounds retries and the UI shows status and error codes. |
| Usage and cost controls | Partial | The project/run caps, per-run reservations, idempotency keys, worker leases and timeout are implemented. A global monetary ledger, provider-specific caps and a paid kill switch remain prerequisites. |

## Why the report lacks value

The normal fixture produces one unavailable value and the runner turns it into the same generic hypothesis and experiments regardless of the confirmed business. The read path returns the saved JSON and the report page renders the supplied evidence. The main loss occurs before persistence because the worker gathers no research questions, competitor observations or actual demand data. The fixture leaves missing volume null. It also marks contradictory values as synthetic. The UI identifies the output as a fixture, although its fixed actions are too generic to guide a Sydney repair pilot.

Preserve the existing idea form, founder confirmation, private report deep link, shared report component, green design tokens and the Grow scope page. Preserve the queue, immutable snapshots, RLS and existing failure scenarios.

## Reference report and minimal change

Use the exact sample idea, “A computer repair service targeting international students in Sydney.” Seed a draft with the Sydney/NSW scope, the proposed customer and testable problem assumptions. Keep founder confirmation. Extend the existing version-one JSON contract additively with an optional profile snapshot and source classification. Keep the current relational schema and synthetic report marker. Older reports remain readable.

Use `VERIFIED_SOURCE` for dated first-party citations, `HYPOTHESIS` for keyword and service assumptions, and `NOT_AVAILABLE` for unmeasured demand and customer behaviour. `RECORDED_SAMPLE` is reserved for traceable samples with reuse approval. The example uses a citation to ABS Greater Sydney QuickStats as geographic context and a citation to Apple's own Sydney store page as one substitute for relevant Apple-device cases. Store the source URL, author, review date, scope and limitations. Use independently written descriptions of factual information and links. No raw datasets, page copies or images are embedded. [ABS QuickStats](https://www.abs.gov.au/census/find-census-data/quickstats/2021/1GSYD) · [Apple Sydney](https://www.apple.com/au/retail/sydney/)

Use the existing evidence list for keyword hypotheses, source observations and missing values, the findings area for risks, and the existing action list for a customer interview, a substitute comparison and a manual booking test. Persist the reference report through the current job and render it through `ReportView`. Confirm browser reopen and cross-account denial locally. Verify the same payload through the Sydney smoke test. Hosted browser reopen requires the separate authenticated application runtime.

## Provider integration plan

| Provider | Credentials and endpoint | Geography and pilot usage | Limits, cache, rights and failure | Normalised output |
| --- | --- | --- | --- | --- |
| ABS Data API | Public SDMX API. Allowlist an approved dataflow, structure and `/rest/data` series. Confirm endpoint access and published limits before enabling. | Exact supported AU region or broader labelled geography. At most one approved series request per report on a cache miss. | Cache by dataflow, dimension key, revision and reference period. Check dataset-specific attribution and reuse. Return unavailable if geography, measure or period cannot answer the question. [ABS data guide](https://www.abs.gov.au/statistics/application-programming-interfaces-apis/data-api-user-guide) | Series and dataset IDs, observation period, geography, measure, unit, value and limitations. |
| DataForSEO | Server-side API login and password. Google Ads Search Volume Live and Google Organic SERP Live Advanced. | Resolve supported Sydney/AU location and language codes. Proposed cap of one keyword batch with up to ten terms and two SERP tasks. | Google Ads Live documents a cap of 12 requests per minute per account. Confirm the separate SERP and account limits. Review commercial display, export and cache rights. Cache approved metrics by keyword, location, language, device and period. Respect throttling and bound retries. Keep paid ad competition separate from organic observations. [Search volume](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/) · [Organic SERP](https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/) | Volume estimate, period and units, ad competition, SERP position, result type, URL, task ID and reported cost. |
| AnswerThePublic | Server-side workspace PAT, API enabled and eligible recurring plan. Check `/me`, then use `/api/public/v1/searches` and `/api/public/v1/reports/{id}`. | Request AU and the intended language when supported. Proposed cap of one search and two reads. | Observe plan allowances, response headers and `Retry-After`. Review Alpha contract and display, redistribution and retention rights. Cache only licensed results. Treat no entitlement as unavailable and avoid resubmitting a search with an uncertain outcome. [Public API](https://api.answerthepublic.com/api-docs/public.md) | Question text, search intent category, source engine, region, language, timestamps and task reference. |
| OpenAI | Server-side project API key. Responses API with Structured Outputs. Validate the response against the application schema. | Supply the confirmed AU market and approved evidence IDs. Proposed cap of one understanding request and one evidence-grounded synthesis request with per-model input/output token caps. | Check account/model rate limits, processing terms, retention and provider redistribution rights before sending content. Cache reusable instructions and tenant-scoped results under the approved retention policy. Handle refusal, timeout and invalid evidence IDs without inventing missing evidence. [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) | Structured hypotheses, findings, citations, limitations and actions. Record model/prompt version, token usage and cost metadata separately from evidence. |

## Security, spend and sequence

Use server-verified auth, tenant-scoped project lookup and PostgreSQL RLS. Add request throttling and per-user and global caps. Reserve money atomically before a billable call. Use a durable operation key, lease fencing, concurrency limits, bounded retries, per-job keyword and SERP caps, explicit LLM token limits and an emergency paid-research kill switch. Retain provider task IDs and actual cost when available. Reconcile uncertain outcomes before retrying. Store server credentials outside the client and logs. Keep provider traffic disabled until the entitlement and licence register is approved. The caps in the provider table are design proposals.

1. Ship the reference fixture and verify local rendering and Sydney persistence.
2. Connect verified application sessions and least-privilege Sydney runtime connections. Verify browser reopen and two-user isolation there.
3. Select one relevant ABS SDMX series and add a no-paid-call adapter test using approved data, explicit attribution and a precise geographic and period mapping.
4. After provider and spend approval, integrate one bounded DataForSEO keyword batch. Add SERP, AnswerThePublic and model synthesis as separately measurable increments.
