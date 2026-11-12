begin;

create table kyb_private.abs_observation_cache (
  cache_key text primary key check (cache_key like 'abs:census_total_persons:%' and length(cache_key) <= 240),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  collected_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > collected_at)
);

revoke all on kyb_private.abs_observation_cache from public;
grant usage on schema kyb_private to kyb_worker;
grant select, insert, update on kyb_private.abs_observation_cache to kyb_worker;
alter table kyb_private.abs_observation_cache enable row level security;
alter table kyb_private.abs_observation_cache force row level security;
create policy abs_cache_worker on kyb_private.abs_observation_cache to kyb_worker using (true) with check (true);

alter table public.evidence_records drop constraint evidence_records_payload_check;
alter table public.evidence_records add constraint evidence_records_payload_check check (
  (case payload->>'provider'
    when 'fixture' then payload->'synthetic' = 'true'::jsonb and not (payload ? 'abs')
    when 'abs' then payload->'synthetic' = 'false'::jsonb and payload->>'licenseId' = 'abs-census-cc-by-4'
      and jsonb_typeof(payload->'abs') = 'object' and payload->'abs'->>'dataflowId' = 'C21_G01_SAL'
    else false end) is true
);

commit;
