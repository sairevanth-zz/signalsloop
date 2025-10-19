-- Project notification recipients (team alerts + digests)
-- Run in Supabase SQL editor

begin;

create table if not exists public.project_notification_recipients (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  email varchar(255) not null,
  name varchar(255),
  receive_weekly_digest boolean default false,
  receive_team_alerts boolean default true,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, email)
);

create index if not exists idx_project_notification_recipients_project_id
  on public.project_notification_recipients(project_id);

create index if not exists idx_project_notification_recipients_email
  on public.project_notification_recipients(email);

-- Trigger to maintain updated_at
create or replace function public.update_project_notification_recipients_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_project_notification_recipients_updated_at
  on public.project_notification_recipients;

create trigger trg_project_notification_recipients_updated_at
  before update on public.project_notification_recipients
  for each row execute procedure public.update_project_notification_recipients_updated_at();

-- RLS
alter table public.project_notification_recipients enable row level security;

drop policy if exists "Service role full access to project_notification_recipients"
  on public.project_notification_recipients;

create policy "Service role full access to project_notification_recipients"
  on public.project_notification_recipients
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Project owners manage notification recipients"
  on public.project_notification_recipients;

create policy "Project owners manage notification recipients"
  on public.project_notification_recipients
  for all using (
    exists (
      select 1
      from public.projects p
      where p.id = project_notification_recipients.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = project_notification_recipients.project_id
        and p.owner_id = auth.uid()
    )
  );

commit;
