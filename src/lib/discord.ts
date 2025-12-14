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

    case 'briefing.generated': {
      const briefing = payload.briefing as {
        date: string;
        sentiment_score?: number;
        critical_count?: number;
        warning_count?: number;
      };

      const dashboardUrl = buildProjectLink(meta.slug, '/dashboard');
      const emoji = (briefing.critical_count ?? 0) > 0 ? '🚨' : '📋';

      return {
        content: `${emoji} **Daily Briefing Generated** for **${sanitizeDiscordText(meta.name || 'your project')}**`,
        embeds: [{
          ...buildEmbedBase('Mission Control Briefing', dashboardUrl, null, 0x3498db),
          fields: [
            { name: 'Sentiment', value: `${briefing.sentiment_score ?? 50}%`, inline: true },
            { name: 'Critical Items', value: `${briefing.critical_count ?? 0}`, inline: true },
            { name: 'Warnings', value: `${briefing.warning_count ?? 0}`, inline: true },
          ],
        }],
      };
    }

    case 'health.threshold_crossed': {
      const health = payload.health as {
        old_score: number;
        new_score: number;
        old_grade: string;
        new_grade: string;
        direction: 'improved' | 'degraded';
      };

      const dashboardUrl = buildProjectLink(meta.slug, '/dashboard');
      const emoji = health.direction === 'improved' ? '📈' : '📉';
      const color = health.direction === 'improved' ? 0x2ed573 : 0xff4757;

      return {
        content: `${emoji} **Product Health ${health.direction === 'improved' ? 'Improved' : 'Degraded'}**`,
        embeds: [{
          ...buildEmbedBase('Health Score Update', dashboardUrl, null, color),
          fields: [
            { name: 'Previous', value: `${health.old_score}/100 (${health.old_grade})`, inline: true },
            { name: 'Current', value: `${health.new_score}/100 (${health.new_grade})`, inline: true },
          ],
        }],
      };
    }

    case 'anomaly.detected': {
      const anomaly = payload.anomaly as {
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
      };

      const dashboardUrl = buildProjectLink(meta.slug, '/dashboard');
      const emoji = anomaly.severity === 'high' ? '🔴' : anomaly.severity === 'medium' ? '🟡' : '🟢';
      const color = anomaly.severity === 'high' ? 0xff4757 : anomaly.severity === 'medium' ? 0xf1c40f : 0x2ed573;

      return {
        content: `${emoji} **Anomaly Detected** - ${anomaly.type}`,
        embeds: [{
          ...buildEmbedBase('Anomaly Alert', dashboardUrl, anomaly.description, color),
          fields: [
            { name: 'Severity', value: anomaly.severity.toUpperCase(), inline: true },
          ],
        }],
      };
    }

    case 'theme.emerging': {
      const theme = payload.theme as {
        name: string;
        frequency: number;
        growth_rate?: number;
      };

      const dashboardUrl = buildProjectLink(meta.slug, '/dashboard');

      return {
        content: `🔥 **Emerging Theme**: "${sanitizeDiscordText(theme.name)}"`,
        embeds: [{
          ...buildEmbedBase('New Trending Theme', dashboardUrl, null, 0xe74c3c),
          fields: [
            { name: 'Mentions', value: `${theme.frequency}`, inline: true },
            { name: 'Growth', value: theme.growth_rate ? `+${theme.growth_rate}%` : 'New', inline: true },
          ],
        }],
      };
    }

    case 'sentiment.shift': {
      const sentiment = payload.sentiment as {
        old_score: number;
        new_score: number;
        direction: 'positive' | 'negative';
        change: number;
      };

      const dashboardUrl = buildProjectLink(meta.slug, '/dashboard');
      const emoji = sentiment.direction === 'positive' ? '😊' : '😟';
      const color = sentiment.direction === 'positive' ? 0x2ed573 : 0xff4757;

      return {
        content: `${emoji} **Significant Sentiment ${sentiment.direction === 'positive' ? 'Improvement' : 'Decline'}**`,
        embeds: [{
          ...buildEmbedBase('Sentiment Shift Detected', dashboardUrl, null, color),
          fields: [
            { name: 'Change', value: `${sentiment.change > 0 ? '+' : ''}${sentiment.change}%`, inline: true },
            { name: 'Current', value: `${sentiment.new_score}%`, inline: true },
          ],
        }],
      };
    }

    case 'priority.escalated': {
      const post = payload.post as {
        id: string;
        title: string;
        priority_score: number;
        priority_level: string;
      };

      const postUrl = buildProjectLink(meta.slug, `/post/${post.id}`);

      return {
        content: `🚀 **Priority Escalated** - "${sanitizeDiscordText(post.title)}" is now **${post.priority_level}**`,
        embeds: [{
          ...buildEmbedBase(post.title, postUrl, null, 0xff4757),
          fields: [
            { name: 'Priority Score', value: `${post.priority_score}/10`, inline: true },
            { name: 'Level', value: post.priority_level, inline: true },
          ],
        }],
      };
    }

    case 'duplicate.merged': {
      const merge = payload.merge as {
        primary_id: string;
        primary_title: string;
        duplicate_count: number;
      };

      const postUrl = buildProjectLink(meta.slug, `/post/${merge.primary_id}`);

      return {
        content: `🔗 **Duplicates Merged** - ${merge.duplicate_count} post(s) merged into "${sanitizeDiscordText(merge.primary_title)}"`,
        embeds: [{
          ...buildEmbedBase(merge.primary_title, postUrl, null, 0x9b59b6),
        }],
      };
    }

    case 'spec.generated': {
      const spec = payload.spec as {
        id: string;
        title: string;
        feedback_count?: number;
      };

      const specUrl = buildProjectLink(meta.slug, `/specs/${spec.id}`);

      return {
        content: `📄 **Product Spec Generated** - "${sanitizeDiscordText(spec.title)}"`,
        embeds: [{
          ...buildEmbedBase(spec.title, specUrl, null, 0x3498db),
          fields: spec.feedback_count ? [
            { name: 'Based on', value: `${spec.feedback_count} feedback item(s)`, inline: true },
          ] : [],
        }],
      };
    }

    case 'post.deleted':
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

      if (response.status === 401 || response.status === 404) {
        await supabase
          .from('discord_integrations')
          .update({
            access_token: null,
            refresh_token: null,
            expires_at: null,
            scope: 'invalid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', (integration as DiscordIntegration).id);
      }
    }

    await supabase
      .from('discord_integrations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', (integration as DiscordIntegration).id);
  } catch (error) {
    console.error('Discord notification error:', error);
  }
}
