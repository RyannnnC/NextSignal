begin;

alter table kyb_private.abs_observation_cache drop constraint abs_observation_cache_cache_key_check;
alter table kyb_private.abs_observation_cache add constraint abs_observation_cache_cache_key_check
  check (cache_key ~ '^abs:(census_total_persons:C21_G01_SAL|census_household_income:C21_G02_SAL|census_age_groups:C21_G04_SAL):' and length(cache_key) <= 240);

alter table public.evidence_records drop constraint evidence_records_payload_check;
alter table public.evidence_records add constraint evidence_records_payload_check check (
  (case payload->>'provider'
    when 'fixture' then payload->'synthetic' = 'true'::jsonb and not (payload ? 'abs')
    when 'abs' then payload->'synthetic' = 'false'::jsonb and payload->>'licenseId' = 'abs-census-cc-by-4'
      and jsonb_typeof(payload->'abs') = 'object' and case payload->'abs'->>'dataflowId'
        when 'C21_G01_SAL' then payload->>'metric' = 'market_context' and payload->>'unit' = 'people'
        when 'C21_G02_SAL' then payload->>'metric' = 'household_income' and payload->>'unit' = 'AUD/week'
        when 'C21_G04_SAL' then payload->>'metric' = 'resident_age_group' and payload->>'unit' = 'people'
          and payload->'abs'->>'measure' in ('20_24', '25_29')
        else false end
    else false end) is true
);

commit;
