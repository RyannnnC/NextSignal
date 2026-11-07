# Local PostgreSQL public schema

Generated from the running Docker PostgreSQL metadata. No customer rows or credentials are included. JSON document keys are defined separately in packages/contracts/src/index.ts.

## public.action_items

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | — |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| run_id | uuid | NO | — |
| finding_id | uuid | NO | — |
| payload | jsonb | NO | — |

## public.audit_events

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | — |
| action | text | NO | — |
| subject_id | uuid | YES | — |
| created_at | timestamp with time zone | NO | now() |

## public.consent_events

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| notice_version | text | NO | — |
| processing_consent | boolean | NO | — |
| marketing_opt_in | boolean | NO | false |
| created_at | timestamp with time zone | NO | now() |

## public.deletion_requests

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| status | text | NO | — |
| completed_at | timestamp with time zone | NO | now() |

## public.evidence_records

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | — |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| run_id | uuid | NO | — |
| payload | jsonb | NO | — |

## public.finding_evidence_links

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| run_id | uuid | NO | — |
| finding_id | uuid | NO | — |
| evidence_id | uuid | NO | — |
| relation | text | NO | — |

## public.findings

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | — |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| run_id | uuid | NO | — |
| payload | jsonb | NO | — |

## public.jobs

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| run_id | uuid | NO | — |
| status | text | NO | 'queued'::text |
| lease_token | uuid | YES | — |
| lease_until | timestamp with time zone | YES | — |
| attempts | integer | NO | 0 |
| available_at | timestamp with time zone | NO | now() |
| created_at | timestamp with time zone | NO | now() |

## public.profile_versions

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| version | integer | NO | — |
| content | jsonb | NO | — |
| status | text | NO | — |
| request_key | uuid | NO | — |
| request_hash | text | NO | — |
| confirmed_at | timestamp with time zone | YES | — |
| created_at | timestamp with time zone | NO | now() |

## public.projects

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | — |
| stage | text | NO | 'idea'::text |
| idea | text | NO | — |
| scenario | text | NO | — |
| request_key | uuid | NO | — |
| request_hash | text | NO | — |
| created_at | timestamp with time zone | NO | now() |

## public.provider_calls

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| run_id | uuid | NO | — |
| provider | text | NO | — |
| attempt | integer | NO | — |
| status | text | NO | — |
| cost_minor | bigint | NO | 0 |
| currency | text | NO | 'AUD'::text |
| created_at | timestamp with time zone | NO | now() |

## public.provider_licenses

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | text | NO | — |
| provider | text | NO | — |
| decision | text | NO | — |
| allowed_uses | jsonb | NO | — |
| approval_ref | text | YES | — |
| reviewed_at | timestamp with time zone | YES | — |

## public.report_versions

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | — |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| run_id | uuid | NO | — |
| payload | jsonb | NO | — |
| created_at | timestamp with time zone | NO | now() |

## public.research_runs

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| profile_id | uuid | NO | — |
| tier | text | NO | 'fixture_snapshot'::text |
| status | text | NO | 'queued'::text |
| request_key | uuid | NO | — |
| request_hash | text | NO | — |
| error_code | text | YES | — |
| prompt_version | text | NO | 'fixture-template-v1'::text |
| model_config | jsonb | NO | '{"version": "deterministic-v1", "provider": "none", "maxTokens": 0}'::jsonb |
| plan | jsonb | NO | '{"maxCalls": 2, "provider": "fixture", "externalCalls": 0}'::jsonb |
| max_calls | integer | NO | — |
| calls_used | integer | NO | 0 |
| created_at | timestamp with time zone | NO | now() |

## public.run_events

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| workspace_id | uuid | NO | — |
| project_id | uuid | NO | — |
| run_id | uuid | NO | — |
| from_status | text | YES | — |
| to_status | text | NO | — |
| code | text | YES | — |
| created_at | timestamp with time zone | NO | now() |

## public.workspaces

| Column | PostgreSQL type | Nullable | Default |
| --- | --- | --- | --- |
| id | uuid | NO | gen_random_uuid() |
| owner_id | uuid | NO | — |
| created_at | timestamp with time zone | NO | now() |
