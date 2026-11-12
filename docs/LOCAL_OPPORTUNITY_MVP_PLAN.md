# Local Opportunity Explorer MVP

## Existing implementation audit

| Feature | Status | Evidence in the repository |
| --- | --- | --- |
| Idea intake and confirmation | WORKING | `apps/web/app/ui.tsx` submits idea text, consent and a fixture scenario. `packages/application/src/projects.ts` saves a draft, confirms an immutable profile version and creates a job. |
| Business understanding | MOCK | `Projects.create` supplies generic placeholders or a fixed Sydney reference. The user can edit summary, customer and problem before confirming. |
| Geography | PARTIAL | `packages/contracts/src/index.ts` validates Australia and state-level scope. The existing Sydney example in `packages/application/src/sydney-reference.ts` attaches public links, without per-location selection. |
| Local comparison and startup budget | MISSING | The original input and profile contracts have neither area identifiers nor a founder-supplied budget. The runner has no area grouping. |
| Queue and reports | WORKING | `packages/application/src/runner.ts` claims jobs, reserves attempts, validates reports and writes immutable JSON and evidence records. `apps/web/app/report-view.tsx` displays evidence, findings and actions on the current private report route. |
| Research acquisition | MOCK | `packages/adapters/src/fixture-provider.ts` provides synthetic, unavailable and failure scenarios. The older reference includes public citations. There are no live provider calls in this flow. |
| Sydney persistence | PARTIAL | `scripts/lib/supabase-dev-verify.ts` exercises application services and RLS against Sydney PostgreSQL in a rollback transaction. `apps/web/lib/bridge.ts` uses local fixture sessions for the browser. |
| Grow My Business | WORKING | `apps/web/app/grow/page.tsx` displays its existing scope and availability. Website research remains a separate feature. |

## Minimal implementation

Add optional computer-repair inputs to Validate My Idea and the confirmed profile. Sydney is the primary market. Haymarket, Burwood (NSW) and Chatswood are selectable as distinct ABS Suburbs and Localities (SAL) areas. Use fixed product IDs and preserve source IDs, classification, dataset version and mapping limitation in the report snapshot. The reusable geography contract allows unresolved mappings and optional coordinates. The MVP selector offers only the three validated mappings. Postcodes, LGAs, SA2s and statistical localities are different units.

Reuse versioned profile and report JSONB and evidence payloads. No relational change is necessary. Keep the reference brief partial, with area-level population context and explicit gaps for demand and local competitors. The comparison service associates evidence with a location only when its stable ID, source geography type, source ID and version match. Recommendations use the existing findings and actions. Preserve all legacy report readers and failure scenarios.

The reference case is computer repair for students and young professionals in Sydney. Use the 2021 ABS QuickStats population counts at SAL level, with collection date and Census period. Treat population as historical context, distinct from the number of likely customers, repairs or foot traffic. Keep missing competitor and demand values null. No area is ranked. [Haymarket](https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL11884) · [Burwood](https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL10716) · [Chatswood](https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL10891) · [ABS copyright](https://www.abs.gov.au/website-privacy-copyright-and-disclaimer)

## Future provider plan

| Provider | Pilot plan and constraints |
| --- | --- |
| ABS | Select one approved SDMX dataflow and resolve geographic codes against the dataset dimensions. Preserve source version, period, measure, unit and attribution. Cache by revision and exact dimension tuple. Use unavailable when the source does not support the required geography. [ABS data guide](https://www.abs.gov.au/statistics/application-programming-interfaces-apis/data-api-user-guide) |
| Google Places | Evaluate Text Search (New) with `regionCode=AU`, one explicitly constrained query per area and the smallest field mask for ID, display name, address, location and attribution. Validate result scope independently. Search results are a sample affected by coverage, ranking and pagination. Field masks determine billed SKU. Review quota and per-request price before enablement. Display required Google and third-party attribution. Store only permitted fields. Place IDs have a caching exception. Review whether durable report content, export and derived use are permitted before selecting this provider. [Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search) · [Pricing](https://developers.google.com/maps/billing-and-pricing/pricing) · [Policies](https://developers.google.com/maps/documentation/places/web-service/policies) |
| DataForSEO | Start with one bounded Google Ads keyword batch and consider organic SERP or Maps endpoints separately. Use supported AU location/language codes and keep the actual scope of each result. Preserve estimated volume and ads competition separately from organic positions. Review licensed retention, redistribution, export and task pricing. [Search volume](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/) · [Google Maps](https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/) |
| AnswerThePublic | Optional. Verify plan, workspace API entitlement, query/read allowance and display/retention rights before access. Preserve source engine, question category and region. [Public API](https://api.answerthepublic.com/api-docs/public.md) |
| OpenAI | Use bounded structured outputs for interpretation and synthesis over allowed evidence IDs. Keep model and prompt versions, refusal handling, input/output caps and validation. Keep unverified hypotheses distinct. [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) |

Keep credentials server-side. Cap selected areas in the schema, preserve per-user research and job limits, idempotency and bounded retries. Before paid access add an atomic per-operation reservation, user and global cost caps, provider request caps and an emergency kill switch. This fixture uses offline source snapshots and the existing queue, with no paid calls.

## Acceptance checks

Validate location IDs, duplicates, area count and optional budget. Reject mismatched geographic scope, expose missing data and preserve historical reports. Exercise a three-area brief through the browser, refresh and check other-account denial. Exercise the same brief against Sydney PostgreSQL using the existing rollback smoke harness. Hosted browser authentication is a separate integration.

`npm run check:all` passed with 34 regular tests, 10 native PostgreSQL tests, one import test, eight browser tests and the Docker restart persistence check. The new browser case verified three saved areas, the budget, six unavailable indicators, refresh, mobile width and other-account denial. `npm run supabase:preflight -- --verify` passed against Sydney PostgreSQL. The stored comparison was re-read and compared, the second identity was denied, anonymous HTTP returned 401 and the transaction rolled back. The browser case used the local fixture runtime.
