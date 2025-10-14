-- Fix anonymous voting + priority support for votes table
-- Run this script in Supabase SQL editor (production)

begin;

-- Add required columns if missing
alter table public.votes
  add column if not exists anonymous_id text,
  add column if not exists priority varchar(50)
    check (priority in ('must_have', 'important', 'nice_to_have'))
    default 'important';

-- Backfill legacy rows
update public.votes
set priority = coalesce(priority, 'important')
where priority is null;

-- Indexes to prevent duplicate anon votes and speed lookups
create index if not exists idx_votes_anonymous_id on public.votes(anonymous_id);

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'votes'
      and indexname = 'idx_votes_post_anonymous_unique'
  ) then
    execute '
      create unique index idx_votes_post_anonymous_unique
      on public.votes(post_id, anonymous_id)
      where anonymous_id is not null
    ';
  end if;
end;
$$;

-- Refresh Row-Level Security policies to allow anonymous + authenticated voting
drop policy if exists "Allow anonymous voting" on public.votes;
drop policy if exists "Allow authenticated voting" on public.votes;
drop policy if exists "Service role can manage votes" on public.votes;

create policy "Allow anonymous voting" on public.votes
  for all to anon
  using (anonymous_id is not null or ip_address is not null)
  with check (anonymous_id is not null or ip_address is not null);

create policy "Allow authenticated voting" on public.votes
  for all to authenticated
  using (true)
  with check (true);

create policy "Service role can manage votes" on public.votes
  for all to service_role
  using (true)
  with check (true);

-- Updated helper to aggregate priority counts
create or replace function public.update_post_priority_counts(p_post_id uuid)
returns void as $$
declare
  v_must_have integer := 0;
  v_important integer := 0;
  v_nice_to_have integer := 0;
  v_total_score integer := 0;
begin
  select
    coalesce(sum(case when coalesce(v.priority, vm.priority) = 'must_have' then 1 else 0 end), 0),
    coalesce(sum(case when coalesce(v.priority, vm.priority) = 'important' then 1 else 0 end), 0),
    coalesce(sum(case when coalesce(v.priority, vm.priority) = 'nice_to_have' then 1 else 0 end), 0)
  into v_must_have, v_important, v_nice_to_have
  from votes v
  left join vote_metadata vm on vm.vote_id = v.id
  where v.post_id = p_post_id;

  v_total_score := calculate_priority_score(
    coalesce(v_must_have, 0),
    coalesce(v_important, 0),
    coalesce(v_nice_to_have, 0)
  );

  update posts set
    must_have_votes = coalesce(v_must_have, 0),
    important_votes = coalesce(v_important, 0),
    nice_to_have_votes = coalesce(v_nice_to_have, 0),
    total_priority_score = coalesce(v_total_score, 0),
    updated_at = now()
  where id = p_post_id;
end;
$$ language plpgsql security definer;

commit;

-- Optional: recompute priority counts now
-- DO $$
-- DECLARE
--   rec RECORD;
-- BEGIN
--   FOR rec IN SELECT id FROM posts LOOP
--     PERFORM update_post_priority_counts(rec.id);
--   END LOOP;
-- END $$;
