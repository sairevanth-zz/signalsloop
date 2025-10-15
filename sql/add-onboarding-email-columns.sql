-- Adds tracking columns for onboarding/pro/cancellation emails.
-- Run in Supabase SQL editor (production).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS pro_welcome_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_email_sent_at TIMESTAMPTZ;
