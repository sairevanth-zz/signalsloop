import { WebhookEvent } from './webhooks';
import { getSupabaseServiceRoleClient } from './supabase-client';

interface DiscordIntegration {
  id: string;
  project_id: string;
  guild_id: string;
  guild_name?: string | null;
  channel_id?: string | null;
  channel_name?: string | null;
  webhook_id: string;
  webhook_token: string;
  webhook_url: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: string | null;
  scope?: string | null;
}

interface DiscordMessage {
  content: string;
  embeds?: unknown[];
}

const PRIORITY_LABELS: Record<string, { label: string; emoji: string; color: number }> = {
  must_have: { label: 'Must Have', emoji: '🔴', color: 0xff4757 },
  important: { label: 'Important', emoji: '🟡', color: 0xf1c40f },
  nice_to_have: { label: 'Nice to Have', emoji: '🟢', color: 0x2ed573 },
};

const projectMetaCache = new Map<
  string,
  { slug: string | null; name: string | null }
>();

function getBaseSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

function truncate(text?: string | null, length = 190) {
  if (!text) return '';
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1)}…`;
}

function sanitizeDiscordText(value?: string | null) {
  if (!value) return '';
  return value.replace(/[`*_~|]/g, '\\$&');
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

function buildEmbedBase(
  title: string,
  url: string,
  description?: string | null,
  color = 0x7289da
) {
  return {
    title,
    url,
    description: description ? truncate(description, 200) : undefined,
    color,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'SignalsLoop',
    },
  };
}

function formatPriorityMeta(priority?: string | null) {
  if (!priority) return null;
  const meta = PRIORITY_LABELS[priority.toLowerCase()];
  return meta ?? null;
}

async function buildDiscordMessage(
  projectId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<DiscordMessage | null> {
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
      const embed = buildEmbedBase(
        post.title,
        postUrl,
        post.description,
        0x6c5ce7
      );

      const fields = [];
      if (post.author_name || post.author_email) {
        fields.push({
          name: 'Submitted by',
          value: sanitizeDiscordText(post.author_name || post.author_email || 'Community member'),
          inline: true,
        });
      }
      fields.push({
        name: 'Category',
        value: sanitizeDiscordText(post.category || 'Uncategorized'),
        inline: true,
      });

      return {
        content: `✨ New feedback submitted${meta.name ? ` for **${sanitizeDiscordText(meta.name)}**` : ''}`,
        embeds: [
          {
            ...embed,
            fields,
          },
        ],
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
      const embed = buildEmbedBase(
        post.title,
        postUrl,
        post.description,
        0xf39c12
      );

      embed['fields'] = [
        {
          name: 'Status Update',
          value: `\`${post.old_status}\` → \`${post.new_status}\``,
          inline: false,
        },
      ];

      return {
        content: `🚦 Feedback status updated in **${sanitizeDiscordText(meta.name || 'SignalsLoop')}**`,
        embeds: [embed],
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
      const embed = buildEmbedBase(
        `Comment on ${post.title}`,
        postUrl,
        comment.content,
        0x1abc9c
      );

      embed['fields'] = [
        {
          name: 'Comment by',
          value: sanitizeDiscordText(comment.author_name || 'Community member'),
          inline: true,
        },
      ];

      return {
        content: `💬 New comment on **${sanitizeDiscordText(post.title)}**`,
        embeds: [embed],
      };
    }

    case 'vote.created': {
      const vote = payload.vote as {
        post_id: string;
        vote_count?: number;
        priority?: string | null;
      };
      const post = payload.post as { id: string; title: string };

      if (!post?.id) return null;

      const postUrl = buildProjectLink(meta.slug, `/post/${post.id}`);
      const priorityMeta = formatPriorityMeta(vote?.priority);
      return {
        content: priorityMeta
          ? `🗳️ New ${priorityMeta.emoji} **${priorityMeta.label}** vote on **${sanitizeDiscordText(
              post.title
            )}** · Total votes: ${vote?.vote_count ?? 0}\n${postUrl}`
          : `🗳️ New vote on **${sanitizeDiscordText(
              post.title
            )}** · Total votes: ${vote?.vote_count ?? 0}\n${postUrl}`,
      };
    }

    default:
      return null;
  }
}

export async function triggerDiscordNotification(
  projectId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      console.error('Discord notifier: Supabase client unavailable');
      return;
    }

    const { data: integration } = await supabase
      .from('discord_integrations')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (!integration) {
      return;
    }

    const message = await buildDiscordMessage(projectId, event, payload);

    if (!message) {
      return;
    }

    const webhookUrl =
      integration.webhook_url ||
      `https://discord.com/api/webhooks/${integration.webhook_id}/${integration.webhook_token}`;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message.content,
        embeds: message.embeds ?? [],
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(
        `Discord webhook error (${response.status}) for project ${projectId}:`,
        errorBody
      );
    }

    await supabase
      .from('discord_integrations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', (integration as DiscordIntegration).id);
  } catch (error) {
    console.error('Discord notification error:', error);
  }
}
