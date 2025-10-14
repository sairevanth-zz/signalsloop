-- Discord integration schema
-- Creates tables for storing Discord OAuth credentials and webhook details

CREATE TABLE IF NOT EXISTS public.discord_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL,
  guild_name TEXT,
  channel_id TEXT,
  channel_name TEXT,
  webhook_id TEXT NOT NULL,
  webhook_token TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  application_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS discord_integrations_project_id_idx
  ON public.discord_integrations(project_id);

CREATE TABLE IF NOT EXISTS public.discord_integration_states (
  state TEXT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID,
  redirect_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discord_integration_states_project_id_idx
  ON public.discord_integration_states(project_id);
