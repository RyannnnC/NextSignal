-- Reap a job that crashed after its final allowed attempt rather than leaving it running forever.
begin;
create or replace function public.claim_fixture_job() returns table(id uuid, workspace_id uuid, user_id uuid, run_id uuid, lease_token uuid, attempts integer)
language plpgsql security definer set search_path='' as $$
declare expired record;
begin
  for expired in
    select j.id as job_id,r.id as research_id,r.workspace_id,r.project_id,r.status as previous_status
    from public.jobs j join public.research_runs r on r.id=j.run_id
    where j.status='running' and j.lease_until<now() and j.attempts>=2
    for update of j,r skip locked
  loop
    update public.jobs set status='dead',lease_token=null,lease_until=null where public.jobs.id=expired.job_id;
    if expired.previous_status not in ('completed','partial','failed','cancelled') then
      update public.research_runs set status='failed',error_code='retry_exhausted' where public.research_runs.id=expired.research_id;
      insert into public.run_events(workspace_id,project_id,run_id,from_status,to_status,code)
        values(expired.workspace_id,expired.project_id,expired.research_id,expired.previous_status,'failed','retry_exhausted');
    end if;
  end loop;
  return query
  with candidate as (
    select j.id from public.jobs j join public.research_runs r on r.id=j.run_id
    where ((j.status='queued' and j.available_at<=now()) or (j.status='running' and j.lease_until<now()))
      and j.attempts<2 and r.status not in ('completed','partial','failed','cancelled')
    order by j.created_at for update of j skip locked limit 1
  ), claimed as (
    update public.jobs j set status='running',attempts=j.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '30 seconds'
    from candidate c where j.id=c.id returning j.*
  ) select c.id,c.workspace_id,w.owner_id,c.run_id,c.lease_token,c.attempts from claimed c join public.workspaces w on w.id=c.workspace_id;
end;
$$;
commit;
