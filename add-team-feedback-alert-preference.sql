-- Adds team feedback alert preference flag and updates should_send_email helper
-- Run this script in Supabase SQL editor

begin;

alter table public.email_preferences
  add column if not exists team_feedback_alert_emails boolean default true;

create or replace function public.should_send_email(
  p_email varchar(255),
  p_user_id uuid,
  p_email_type varchar(50)
)
returns boolean as $$
declare
  prefs record;
  can_send boolean := false;
begin
  select * into prefs
  from email_preferences
  where (user_id = p_user_id or email = p_email)
  and unsubscribed_at is null;

  if not found then
    return true;
  end if;

  case p_email_type
    when 'status_change' then can_send := prefs.status_change_emails;
    when 'comment' then can_send := prefs.comment_reply_emails;
    when 'vote_milestone' then can_send := prefs.vote_milestone_emails;
    when 'team_feedback_alert' then can_send := prefs.team_feedback_alert_emails;
    when 'mention' then can_send := prefs.mention_emails;
    when 'weekly_digest' then can_send := prefs.weekly_digest;
    else can_send := true;
  end case;

  return coalesce(can_send, true);
end;
$$ language plpgsql security definer;

commit;
