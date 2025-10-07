'use server';

import { WebhookEvent } from './webhooks';
import { getSupabaseServiceRoleClient } from './supabase-client';

interface SlackIntegration {
  id: string;
  project_id: string;
  team_id: string;
  team_name?: string | null;
  access_token: string;
  bot_user_id?: string | null;
  authed_user_id?: string | null;
  scope?: string | null;
  webhook_url: string;
  channel_id?: string | null;
  channel_name?: string | null;
  configuration_url?: string | null;
}

interface SlackMessage {
  text: string;
  blocks?: unknown[];
}

const projectMetaCache = new Map<
  string,
  { slug: string | null; name: string | null }
>();

function getBaseSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

function truncate(text?: string | null, length = 160) {
  if (!text) return '';
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1)}…`;
}

function formatSlackText(value?: string | null) {
  if (!value) return '';
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function getProjectMeta(projectId: string) {
  if (projectMetaCache.has(projectId)) {
    return projectMetaCache.get(projectId)!;
  }

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return { slug: null, name: null };

  const { data } = await supabase
    .from('projects')
    .select('slug, name')
    .eq('id', projectId)
    .single();

  const meta = {
    slug: data?.slug ?? null,
    name: data?.name ?? null,
  };

  projectMetaCache.set(projectId, meta);
  return meta;
}

function buildProjectLink(projectSlug: string | null, path: string) {
  const baseUrl = getBaseSiteUrl();
  if (!projectSlug) {
    return `${baseUrl}${path}`;
  }
  return `${baseUrl}/${projectSlug}${path}`;
}

async function buildSlackMessage(
  projectId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<SlackMessage | null> {
  const meta = await getProjectMeta(projectId);

  switch (event) {
    case 'post.created': {
      const post = payload.post as {
        id: string;
        title: string;
        description?: string | null;
        author_name?: string | null;
        author_email?: string | null;
        category?: string | null;
      };

      if (!post?.id) return null;

      const postUrl = buildProjectLink(meta.slug, `/post/${post.id}`);
      const intro = `New feedback submitted${meta.name ? ` for *${formatSlackText(meta.name)}*` : ''}`;

      return {
        text: `${intro}: ${formatSlackText(post.title)}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:sparkles: *${intro}*\n*<${postUrl}|${formatSlackText(post.title)}>*`,
            },
          },
          post.description
            ? {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: formatSlackText(truncate(post.description, 300)),
                },
              }
            : undefined,
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: post.author_name
                  ? `Submitted by *${formatSlackText(post.author_name)}*`
                  : 'Submitted by community member',
              },
              {
                type: 'mrkdwn',
                text: `Category: *${formatSlackText(post.category || 'Uncategorized')}*`,
              },
            ],
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Feedback',
                  emoji: true,
                },
                url: postUrl,
              },
            ],
          },
        ].filter(Boolean),
      };
    }

    case 'post.status_changed': {
      const post = payload.post as {
        id: string;
        title: string;
        old_status: string;
        new_status: string;
        description?: string | null;
      };

      if (!post?.id) return null;

      const postUrl = buildProjectLink(meta.slug, `/post/${post.id}`);
      const statusTransition = `${post.old_status} → ${post.new_status}`;

      return {
        text: `Status updated to ${post.new_status}: ${formatSlackText(post.title)}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:vertical_traffic_light: Feedback status updated in *${formatSlackText(meta.name || 'SignalsLoop')}*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*<${postUrl}|${formatSlackText(post.title)}>*\nStatus: *${statusTransition}*`,
            },
          },
          post.description
            ? {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: formatSlackText(truncate(post.description, 200)),
                  },
                ],
              }
            : undefined,
        ].filter(Boolean),
      };
    }

    case 'comment.created': {
      const comment = payload.comment as {
        id: string;
        content: string;
        author_name?: string | null;
      };
      const post = payload.post as { id: string; title: string };

      if (!post?.id || !comment?.id) return null;

      const postUrl = buildProjectLink(meta.slug, `/post/${post.id}#comment-${comment.id}`);

      return {
        text: `New comment on ${formatSlackText(post.title)}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:speech_balloon: New comment on *<${postUrl}|${formatSlackText(post.title)}>*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: formatSlackText(truncate(comment.content, 280)),
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: comment.author_name
                  ? `Comment by *${formatSlackText(comment.author_name)}*`
                  : 'Comment by community member',
              },
            ],
          },
        ],
      };
    }

    case 'vote.created': {
      const post = payload.post as { id: string; title: string };
      const vote = payload.vote as { vote_count?: number };

      if (!post?.id) return null;

      const postUrl = buildProjectLink(meta.slug, `/post/${post.id}`);
      const total = vote?.vote_count ?? 0;

      return {
        text: `New vote on ${formatSlackText(post.title)}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:ballot_box_with_ballot: *New vote received*\n<${postUrl}|${formatSlackText(post.title)}> now has *${total}* vote${total === 1 ? '' : 's'}.`,
            },
          },
        ],
      };
    }

    default:
      return null;
  }
}

export async function triggerSlackNotification(
  projectId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      console.error('Slack notifier: Supabase client unavailable');
      return;
    }

    const { data: integration } = await supabase
      .from('slack_integrations')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (!integration) {
      return;
    }

    const message = await buildSlackMessage(
      projectId,
      event,
      payload
    );

    if (!message) {
      return;
    }

    const response = await fetch(integration.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message.text,
        blocks: message.blocks,
        unfurl_links: false,
        unfurl_media: false,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(
        `Slack webhook error (${response.status}) for project ${projectId}:`,
        errorBody
      );
    }

    await supabase
      .from('slack_integrations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', (integration as SlackIntegration).id);
  } catch (error) {
    console.error('Slack notification error:', error);
  }
}
