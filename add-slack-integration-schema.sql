-- Slack integration schema
-- Creates tables for storing Slack OAuth credentials and state

create table if not exists public.slack_integrations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  team_id text not null,
  team_name text,
  access_token text not null,
  bot_user_id text,
  authed_user_id text,
  scope text,
  webhook_url text not null,
  channel_id text,
  channel_name text,
  configuration_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists slack_integrations_project_id_idx
  on public.slack_integrations(project_id);

create table if not exists public.slack_integration_states (
  state text primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid,
  redirect_to text,
  created_at timestamptz not null default now()
);

create index if not exists slack_integration_states_project_id_idx
  on public.slack_integration_states(project_id);
