-- Local-only rollback: restores the original claim function. Expired final attempts require manual review.
begin;
create or replace function public.claim_fixture_job() returns table(id uuid, workspace_id uuid, user_id uuid, run_id uuid, lease_token uuid, attempts integer)
language sql security definer set search_path='' as $$
  with candidate as (
    select j.id from public.jobs j join public.research_runs r on r.id=j.run_id
    where ((j.status='queued' and j.available_at<=now()) or (j.status='running' and j.lease_until<now()))
      and j.attempts<2 and r.status not in ('completed','partial','failed','cancelled')
    order by j.created_at for update of j skip locked limit 1
  ), claimed as (
    update public.jobs j set status='running',attempts=j.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '30 seconds'
    from candidate c where j.id=c.id returning j.*
  ) select c.id,c.workspace_id,w.owner_id,c.run_id,c.lease_token,c.attempts from claimed c join public.workspaces w on w.id=c.workspace_id;
$$;
commit;
