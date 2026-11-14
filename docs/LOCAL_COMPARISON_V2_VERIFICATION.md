# Local Comparison v2 verification

## Scope and observations

The existing fixture project, confirmed profile, durable worker, immutable report and regional population chart are reused. The original Sydney development smoke passed before changes. The new worker adds two allowlisted flows; reports still use the existing private route.

| NSW statistical locality | Population, people | Median weekly household income, AUD | Residents aged 20–24 | Residents aged 25–29 |
| --- | ---: | ---: | ---: | ---: |
| Haymarket (11884) | 8,305 | 1,931 | 1,449 | 1,918 |
| Burwood (10716) | 18,224 | 1,671 | 2,711 | 2,863 |
| Chatswood (10891) | 25,553 | 2,158 | 1,588 | 2,046 |

All values are 2021 Census observations. Both added flows and their DSDs resolved at version 1.0.0. The live CSV responses returned coded, non-negative integers with no status column. Validation fixtures exercise missing and non-accepted status values. Historic values can be compared at the same SAL geography; they do not describe current demand, students, commuter flows or repair spending. G04 counts usual residents and applies confidentiality adjustments. G02 covers eligible occupied private dwellings, excluding specified households with absent members, missing income, visitors only or unclassifiable household type.

- [G01 population](https://data.api.abs.gov.au/rest/data/ABS,C21_G01_SAL,1.0.0/3.P_1.10716+10891+11884.SAL.1?startPeriod=2021&endPeriod=2021&format=csv)
- [G02 weekly household income](https://data.api.abs.gov.au/rest/data/ABS,C21_G02_SAL,1.0.0/4.10716+10891+11884.SAL.1?startPeriod=2021&endPeriod=2021&format=csv)
- [G04 resident age groups](https://data.api.abs.gov.au/rest/data/ABS,C21_G04_SAL,1.0.0/20_24+25_29.3.10716+10891+11884.SAL.1?startPeriod=2021&endPeriod=2021&format=csv)

## Implementation and verification

- `packages/adapters/src/abs-provider.ts` validates metadata, coded CSV and the conditions for a cache hit. A flow may return usable evidence, missing observations, suppressed or non-accepted observations, unsupported geography, timeout, HTTP or network errors, invalid responses or cache errors.
- `packages/application/src/runner.ts` and `local-opportunity.ts` attach source and failure metadata to the existing report. `packages/contracts/src/index.ts` binds each flow to its unit and measure while accepting older population-only evidence.
- `apps/web/app/report-view.tsx` shows a bilingual side-by-side comparison, separate from the existing demand and competitor gaps. The evidence details retain dates, statuses, dataflow and source metadata.
- `supabase/migrations/202611140001_abs_regional_indicators.sql` widens allowlists while preserving RLS and old checksums. The Sydney development migration committed once. Its rollback smoke wrote and reopened 12 verified observations using six live HTTP requests. The reordered area query reused all three snapshots with zero additional HTTP requests. The smoke expired each snapshot, verified misses, checked cross-tenant report access and anonymous denial, then rolled back sample rows and role grants.
- Native PostgreSQL tests passed (10 tests). Live Sydney results and captured or mocked test scenarios are independent checks.
- `npm run check` passed lint, type checking, 49 tests, secret scanning and the production build. The live-enabled Chromium suite passed all eight tests on rerun, including the new table, report reopening and owner isolation. The first browser run failed an exact-text assertion because the same cell also contained the source link.

The comparison covers three verified Sydney SALs only. Production use still requires review of the ABS dataflow annotations and terms. Demand, competitor coverage and pilot costs remain open evidence gaps.

## Competitor discovery pilot

Compare one query per area and cap total requests at three. Use the same query language and category. Identify each search scope as an area or search centre, since map results can include nearby businesses outside the intended SAL. Deduplicate results and manually check actual repair services, prices and turnaround on first-party sources. Search results are ranked samples and can omit unlisted operators.

| Provider | Input and useful fields | Budget and quota | Rights and retention |
| --- | --- | --- | --- |
| Google Places API (New) | Nearby Search uses a centre and radius, and place types. Text Search supports a repair-specific query with a geographic restriction. Field masks select IDs, names, locations, business status and other supported fields. | Nearby Search Pro first paid tier is USD 32 per 1,000 requests. Three calls at that price are USD 0.096 excluding free usage and higher-tier fields. Project quotas apply per method. Verify the deployed project's quotas before enabling. | Google imposes field-specific storage limits and display attribution. Place IDs have a storage exception. Check product terms before saving report snapshots. |
| DataForSEO Google Maps Live Advanced | Query with location name/code or coordinates and zoom. Returns ranked map observations with business title, address, coordinates and supported listing details. | Three base Live queries at USD 0.002 each are USD 0.006 before add-ons. Keep depth at 20, cap requests per job and verify limits on the chosen account. | Confirm written report display, caching, export, deletion and attribution rights before use. Do not infer downstream rights from endpoint access. |

Recommend DataForSEO for the bounded Sydney discovery pilot, contingent on confirmed licence and geographic coverage. Google Places is an alternative for live lookup if its storage and display requirements fit the product. No paid provider was activated.

[Google Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search) · [Google pricing](https://developers.google.com/maps/billing-and-pricing/pricing) · [Google attribution and storage](https://developers.google.com/maps/documentation/places/web-service/policies) · [DataForSEO endpoint](https://docs.dataforseo.com/v3/serp-maps-live-advanced/) · [DataForSEO pricing](https://dataforseo.com/pricing/google-serp/google-maps-serp-api)
