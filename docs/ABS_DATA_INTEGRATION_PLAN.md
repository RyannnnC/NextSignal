# ABS Data API integration plan

## Regional comparison v2

The development worker now fetches three allowlisted 2021 Census flows. G01 retains its original cache key. G02 uses `MEDAVG=4` for median total household income in AUD per week. G04 selects `AGEINGP=20_24+25_29` with `SEXP=3` for two disjoint usual-resident age bands. All queries use NSW SAL codes and the same Census period. The linked DSD and codelists are validated before querying observations.

The worker allows up to three concurrent flow requests per provider instance and keeps each flow's outcome independent. Each HTTP operation has a five-second timeout and at most one bounded retry. The research runner imposes a 16-second ABS deadline. Shared PostgreSQL snapshots keep the existing seven-day freshness window and segregate observations by flow, versions, filters and region codes.

See [Regional comparison v2 verification](LOCAL_COMPARISON_V2_VERIFICATION.md) for observed results, release limits and the competitor pilot recommendation. The original catalogue below records the v1 discovery state.

## Repository audit

| Capability | Status | Location |
| --- | --- | --- |
| ABS adapter, HTTP abstraction, metadata discovery and SDMX parser | MISSING | `packages/adapters/src/fixture-provider.ts` handles deterministic local scenarios. No ABS transport exists. |
| Research orchestration | WORKING | `packages/application/src/runner.ts` reserves a bounded job attempt, writes immutable results and handles failures. |
| Geography | PARTIAL | `packages/contracts/src/local-opportunity.ts` identifies three Sydney SALs and models unresolved geography. `packages/application/src/local-opportunity.ts` rejects mismatched type, ID and version. No arbitrary geocoding exists. |
| Regional observations | MOCK | `packages/application/src/local-opportunity.ts` assembles an offline reference using recorded QuickStats values, with demand and competitors absent. |
| Shared ABS cache | MISSING | Existing `evidence_records` and `report_versions` are tenant-owned snapshots. |
| Evidence persistence and regional report UI | WORKING | `supabase/migrations/202610270001_m1.sql` stores evidence and immutable report JSON. `apps/web/app/report-view.tsx` renders values, periods, citations and gaps. `scripts/lib/supabase-dev-verify.ts` exercises Sydney RLS in a rollback transaction. Browser auth uses the local runtime. |

## Verified catalogue and coverage

| Domain indicator | Dataflow / DSD | Codes, scope and period | Status and limitation |
| --- | --- | --- | --- |
| `census_total_persons` | `C21_G01_SAL` / `C21_G01_SAL`, currently both `1.0.0` | `SEXP=3` (Persons), `PCHAR=P_1` (Total persons), `REGION_TYPE=SAL`, `STATE=1` (NSW), `REGION=11884/10716/10891`, period 2021. Census snapshot in people. | Allowlisted. The population is historical Census context, distinct from ERP, repair customers or foot traffic. |
| `census_median_household_income` | `C21_G02_SAL` / `C21_G02_SAL`, currently both `1.0.0` | `MEDAVG=4` (Median total household income in AUD per week), `REGION`, `REGION_TYPE=SAL`, `STATE=1`. 2021 Census snapshot. | Metadata verified. Values not fetched. Historical household income cannot establish willingness to pay. |
| `census_age_distribution` | `C21_G04_SAL` / `C21_G04_SAL`, currently both `1.0.0` | `AGEINGP`, `SEXP=3`, `REGION`, `REGION_TYPE=SAL`, `STATE=1`. 2021 Census counts in people, with `_T` total in the age codelist. | Metadata verified. No age counts fetched. Age does not identify student status. |
| Regional estimated resident population | `ABS_ANNUAL_ERP_ASGS2021`, catalogue version `1.2.0` | Catalogue describes SA2 and above, ASGS Edition 3, annual from 2001 onwards. | Listed only. Latest observation, DSD and measure codes are not verified for this pilot. No substitution into SAL fields. |
| Education, work and dwellings | `C21_G15_SAL`, `C21_G43_SAL`, `C21_G02_SAL` | 2021 Census. Candidate metadata names indicate education, labour force and summary medians. | Candidate flows only. Confirm measures, populations and units before use. Consider official DataPacks or Data by Region when API coverage does not match a required indicator. |

`CL_SAL_2021` confirms Haymarket `11884`, Burwood (NSW) `10716` and Chatswood `10891`. The existing QuickStats IDs add a `SAL` prefix. Keep the two identifiers explicit. The selector supplies verified SALs. Unresolved, overlapping and other geography types remain unavailable for this indicator.

Discovery uses `dataflow/ABS?detail=allstubs`. Structure inspection uses `datastructure/ABS/C21_G01_SAL` and `dataflow/ABS/C21_G01_SAL?references=descendants`. The bounded query uses `data/ABS,C21_G01_SAL,1.0.0/3.P_1.10716+10891+11884.SAL.1` with `startPeriod=2021`, `endPeriod=2021`, `lastNObservations=1`, `detail=full`, `dimensionAtObservation=AllDimensions` and `format=csv`. Official CSV returned 18,224, 25,553 and 8,305 respectively, matching the locality IDs independently of response order. [Official API guide](https://www.abs.gov.au/statistics/application-programming-interfaces-apis/data-api-user-guide/using-api) · [Live data query](https://data.api.abs.gov.au/rest/data/ABS,C21_G01_SAL,1.0.0/3.P_1.10716+10891+11884.SAL.1?startPeriod=2021&endPeriod=2021&format=csv)

## Implementation and acceptance

Add a server-only ABS adapter with HTTPS origin/path restrictions, no redirects, timeout, bounded retry and response byte caps. Resolve versions and validate dimensions/codes from linked metadata. Parse the selected coded CSV format and fail closed on unexpected identities, duplicates, invalid values or versions. Preserve null values. The flow and DSD are rechecked on metadata refresh. Keep source metadata and the original unit on each verified report record. The report remains a fixture workflow with separately labelled ABS evidence.

Add one private shared cache migration and reuse the existing PostgreSQL worker role. Cache public observations by versioned query, including indicator, area codes, period and geography edition. The worker reads fresh entries and refreshes expired ones. Source data stays separate from project IDs, budgets and founder descriptions. Metadata is held in process with an expiry. The ABS dataset is enabled explicitly for development. Paid providers remain out of scope.

Use attributed ABS material with the product source and observation period. The public ABS copyright notice specifies CC BY 4.0 with exceptions. Reuse the published counts and exclude third-party material and branding. [ABS copyright and attribution](https://www.abs.gov.au/website-privacy-copyright-and-disclaimer)

Verify the genuine query, cache reuse and expiry behaviour, unavailable and malformed data handling, report persistence and tenant isolation. Run build, lint, typecheck and regression tests. Exercise the Sydney database only with the development migration and rollback smoke harness.

## Development operation

- The ABS flow metadata includes the `NonProductionDataflow` annotation. Check ABS guidance and availability before any public use. The counts are based on usual residence and may contain small confidentiality adjustments.
- To test in a browser, set `NEXTSIGNAL_ABS_ENABLED=1` in the shell running `npm run dev`. The local worker uses its existing Docker PostgreSQL connection.
- To exercise the same runner against Sydney Supabase, set `NEXTSIGNAL_ABS_VERIFY=1` and run `npm run supabase:preflight -- --verify` with the existing development configuration. The transaction rolls back the sample projects and cache changes. A separately configured production worker is out of scope.
- The cache retains an entry as fresh for seven days. Old versions stop matching when the dataflow or DSD changes. The current allowlist bounds the number of region combinations. No deletion schedule is needed for the pilot.
- Migration `supabase/migrations/202611120001_abs_cache.sql` adds a worker-only cache and widens the evidence constraint. Existing migration checksums and tenant policies are preserved. Prefer a forward fix if migration changes are needed after any ABS evidence is persisted.
