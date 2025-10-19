import 'dotenv/config';

import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendWeeklyDigestEmail } from '@/lib/email';

type ProjectRecord = {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
};

type PostRecord = {
  id: string;
  project_id: string;
  title: string;
  status: string | null;
  vote_count: number | null;
  created_at: string;
};

type VoteRecord = {
  id: string;
  post_id: string;
  created_at: string;
  posts?: {
    id: string;
    project_id: string;
  } | null;
};

type CommentRecord = {
  id: string;
  post_id: string;
  created_at: string;
  posts?: {
    id: string;
    project_id: string;
  } | null;
};

type DigestPost = {
  postId: string;
  title: string;
  status?: string | null;
  createdAt?: string | null;
  totalVotes?: number | null;
  newVotes?: number | null;
  newComments?: number | null;
};

type ProjectActivity = {
  project: ProjectRecord;
  newPosts: DigestPost[];
  voteCounts: Map<string, number>;
  commentCounts: Map<string, number>;
  totalNewVotes: number;
  totalNewComments: number;
};

type OwnerSummary = {
  ownerId: string;
  projects: Map<string, ProjectActivity>;
};

type WeeklyDigestProjectSection = {
  projectId: string;
  projectName: string;
  projectSlug: string;
  totalNewPosts: number;
  totalNewVotes: number;
  totalNewComments: number;
  newPosts: DigestPost[];
  topVotedPosts: DigestPost[];
  topCommentedPosts: DigestPost[];
};

const DAYS_BACK = 7;

async function main() {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    throw new Error('Supabase client is not available');
  }

  const now = new Date();
  const since = new Date(now.getTime() - DAYS_BACK * 24 * 60 * 60 * 1000);
  const timeframeStart = since.toISOString();
  const timeframeEnd = now.toISOString();

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, slug, owner_id')
    .not('owner_id', 'is', null);

  if (projectsError) {
    throw new Error(`Failed to load projects: ${projectsError.message}`);
  }

  if (!projects || projects.length === 0) {
    console.log('No projects with owners found. Aborting weekly digest.');
    return;
  }

  const projectsById = new Map<string, ProjectRecord>();
  projects.forEach((project) => {
    if (project.id) {
      projectsById.set(project.id, project as ProjectRecord);
    }
  });

  const projectIds = projects.map((project) => project.id);

  const { data: newPostsData, error: newPostsError } = await supabase
    .from('posts')
    .select('id, project_id, title, status, vote_count, created_at')
    .in('project_id', projectIds)
    .gte('created_at', timeframeStart);

  if (newPostsError) {
    console.error('Failed to load new posts for weekly digest:', newPostsError);
  }

  const newPosts = (newPostsData ?? []) as PostRecord[];

  const { data: recentVotesData, error: recentVotesError } = await supabase
    .from('votes')
    .select('id, post_id, created_at, posts(id, project_id)')
    .gte('created_at', timeframeStart);

  if (recentVotesError) {
    console.error('Failed to load recent votes for weekly digest:', recentVotesError);
  }

  const recentVotes = (recentVotesData ?? []) as VoteRecord[];

  const { data: recentCommentsData, error: recentCommentsError } = await supabase
    .from('comments')
    .select('id, post_id, created_at, posts(id, project_id)')
    .gte('created_at', timeframeStart);

  if (recentCommentsError) {
    console.error('Failed to load recent comments for weekly digest:', recentCommentsError);
  }

  const recentComments = (recentCommentsData ?? []) as CommentRecord[];

  const postMeta = new Map<
    string,
    {
      postId: string;
      projectId: string;
      title: string;
      status: string | null;
      totalVotes: number;
      createdAt: string | null;
    }
  >();

  newPosts.forEach((post) => {
    postMeta.set(post.id, {
      postId: post.id,
      projectId: post.project_id,
      title: post.title,
      status: post.status,
      totalVotes: post.vote_count ?? 0,
      createdAt: post.created_at,
    });
  });

  const missingPostIds = new Set<string>();

  recentVotes.forEach((vote) => {
    if (!postMeta.has(vote.post_id)) {
      missingPostIds.add(vote.post_id);
    }
  });

  recentComments.forEach((comment) => {
    if (!postMeta.has(comment.post_id)) {
      missingPostIds.add(comment.post_id);
    }
  });

  if (missingPostIds.size > 0) {
    const { data: extraPostsData, error: extraPostsError } = await supabase
      .from('posts')
      .select('id, project_id, title, status, vote_count, created_at')
      .in('id', Array.from(missingPostIds));

    if (extraPostsError) {
      console.error('Failed to load additional posts for weekly digest:', extraPostsError);
    } else if (extraPostsData) {
      (extraPostsData as PostRecord[]).forEach((post) => {
        postMeta.set(post.id, {
          postId: post.id,
          projectId: post.project_id,
          title: post.title,
          status: post.status,
          totalVotes: post.vote_count ?? 0,
          createdAt: post.created_at,
        });
      });
    }
  }

  const owners = new Map<string, OwnerSummary>();

  const ensureOwnerSummary = (projectId: string): ProjectActivity | null => {
    const project = projectsById.get(projectId);
    if (!project || !project.owner_id) {
      return null;
    }

    let ownerSummary = owners.get(project.owner_id);
    if (!ownerSummary) {
      ownerSummary = {
        ownerId: project.owner_id,
        projects: new Map(),
      };
      owners.set(project.owner_id, ownerSummary);
    }

    let activity = ownerSummary.projects.get(projectId);
    if (!activity) {
      activity = {
        project,
        newPosts: [],
        voteCounts: new Map(),
        commentCounts: new Map(),
        totalNewVotes: 0,
        totalNewComments: 0,
      };
      ownerSummary.projects.set(projectId, activity);
    }

    return activity;
  };

  newPosts.forEach((post) => {
    const activity = ensureOwnerSummary(post.project_id);
    if (!activity) {
      return;
    }

    activity.newPosts.push({
      postId: post.id,
      title: post.title,
      status: post.status,
      createdAt: post.created_at,
      totalVotes: post.vote_count ?? 0,
    });
  });

  recentVotes.forEach((vote) => {
    const meta = postMeta.get(vote.post_id);
    const projectId = meta?.projectId || vote.posts?.project_id;
    if (!projectId) {
      return;
    }

    const activity = ensureOwnerSummary(projectId);
    if (!activity) {
      return;
    }

    const current = activity.voteCounts.get(vote.post_id) ?? 0;
    activity.voteCounts.set(vote.post_id, current + 1);
    activity.totalNewVotes += 1;
  });

  recentComments.forEach((comment) => {
    const meta = postMeta.get(comment.post_id);
    const projectId = meta?.projectId || comment.posts?.project_id;
    if (!projectId) {
      return;
    }

    const activity = ensureOwnerSummary(projectId);
    if (!activity) {
      return;
    }

    const current = activity.commentCounts.get(comment.post_id) ?? 0;
    activity.commentCounts.set(comment.post_id, current + 1);
    activity.totalNewComments += 1;
  });

  const { data: recipientRows, error: recipientError } = await supabase
    .from('project_notification_recipients')
    .select('project_id, email, name, receive_weekly_digest');

  if (recipientError) {
    console.error('Failed to load project notification recipients:', recipientError);
  }

  const projectRecipientState = new Map<
    string,
    { configured: boolean; recipients: Map<string, { email: string; name: string | null }> }
  >();

  (recipientRows ?? []).forEach((row) => {
    if (!row?.project_id || !row?.email) {
      return;
    }
    const normalized = row.email.trim().toLowerCase();
    if (!normalized) {
      return;
    }
    let state = projectRecipientState.get(row.project_id);
    if (!state) {
      state = { configured: false, recipients: new Map() };
      projectRecipientState.set(row.project_id, state);
    }
    state.configured = true;
    if (row.receive_weekly_digest) {
      if (!state.recipients.has(normalized)) {
        state.recipients.set(normalized, {
          email: normalized,
          name: row.name ?? null,
        });
      }
    }
  });

  if (owners.size === 0) {
    console.log('No qualifying activity for weekly digest window.');
    return;
  }

  const ownerUserCache = new Map<string, { email: string | null; name: string | null }>();

  const getOwnerContact = async (ownerId: string | null) => {
    if (!ownerId) {
      return null;
    }
    if (ownerUserCache.has(ownerId)) {
      const cached = ownerUserCache.get(ownerId)!;
      if (!cached.email) {
        return null;
      }
      return cached;
    }

    const { data, error } = await supabase.auth.admin.getUserById(ownerId);
    if (error) {
      console.error(`Failed to load owner ${ownerId} for weekly digest:`, error);
      ownerUserCache.set(ownerId, { email: null, name: null });
      return null;
    }

    const user = data?.user;
    if (!user?.email) {
      console.warn(`Owner ${ownerId} has no email. Skipping digest fallback.`);
      ownerUserCache.set(ownerId, { email: null, name: null });
      return null;
    }

    const contact = {
      email: user.email,
      name:
        typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
    };
    ownerUserCache.set(ownerId, contact);
    return contact;
  };

  const buildProjectSection = (activity: ProjectActivity): WeeklyDigestProjectSection | null => {
    const newPostsList = activity.newPosts
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      )
      .slice(0, 5);

    const voteHighlights = Array.from(activity.voteCounts.entries())
      .map(([postId, newVotes]) => ({
        postId,
        newVotes,
      }))
      .sort((a, b) => (b.newVotes ?? 0) - (a.newVotes ?? 0))
      .slice(0, 5)
      .map(({ postId, newVotes }) => {
        const meta = postMeta.get(postId);
        return {
          postId,
          title: meta?.title ?? 'Feedback',
          totalVotes: meta?.totalVotes ?? 0,
          newVotes,
        };
      });

    const commentHighlights = Array.from(activity.commentCounts.entries())
      .map(([postId, newComments]) => ({
        postId,
        newComments,
      }))
      .sort((a, b) => (b.newComments ?? 0) - (a.newComments ?? 0))
      .slice(0, 5)
      .map(({ postId, newComments }) => {
        const meta = postMeta.get(postId);
        return {
          postId,
          title: meta?.title ?? 'Feedback',
          newComments,
        };
      });

    const hasActivity =
      newPostsList.length > 0 ||
      voteHighlights.length > 0 ||
      commentHighlights.length > 0 ||
      activity.totalNewComments > 0 ||
      activity.totalNewVotes > 0;

    if (!hasActivity) {
      return null;
    }

    return {
      projectId: activity.project.id,
      projectName: activity.project.name,
      projectSlug: activity.project.slug,
      totalNewPosts: activity.newPosts.length,
      totalNewVotes: activity.totalNewVotes,
      totalNewComments: activity.totalNewComments,
      newPosts: newPostsList,
      topVotedPosts: voteHighlights,
      topCommentedPosts: commentHighlights,
    };
  };

  type RecipientSummary = {
    email: string;
    name: string | null;
    userId: string | null;
    projectSections: Map<string, WeeklyDigestProjectSection>;
  };

  const recipientSummaries = new Map<string, RecipientSummary>();

  const ensureRecipientSummary = (
    email: string,
    name: string | null,
    userId: string | null
  ) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    let summary = recipientSummaries.get(normalized);
    if (!summary) {
      summary = {
        email: normalized,
        name: name ?? null,
        userId: userId ?? null,
        projectSections: new Map(),
      };
      recipientSummaries.set(normalized, summary);
    } else {
      if (!summary.name && name) {
        summary.name = name;
      }
      if (!summary.userId && userId) {
        summary.userId = userId;
      }
    }

    return summary;
  };

  for (const [ownerId, summary] of owners.entries()) {
    for (const activity of summary.projects.values()) {
      const section = buildProjectSection(activity);
      if (!section) {
        continue;
      }

      const state = projectRecipientState.get(activity.project.id);
      const configured = state?.configured ?? false;
      const recipientsForProject = Array.from(state?.recipients.values() ?? []);

      if (recipientsForProject.length === 0 && !configured) {
        const ownerContact = await getOwnerContact(ownerId);
        if (!ownerContact?.email) {
          continue;
        }
        const recipient = ensureRecipientSummary(
          ownerContact.email,
          ownerContact.name,
          ownerId
        );
        if (recipient) {
          recipient.projectSections.set(section.projectId, section);
        }
      } else {
        recipientsForProject.forEach((recipientInfo) => {
          const recipient = ensureRecipientSummary(recipientInfo.email, recipientInfo.name, null);
          if (recipient) {
            recipient.projectSections.set(section.projectId, section);
          }
        });
      }
    }
  }

  if (recipientSummaries.size === 0) {
    console.log('No recipients qualified for weekly digest.');
    return;
  }

  for (const recipient of recipientSummaries.values()) {
    const projectsForRecipient = Array.from(recipient.projectSections.values());
    if (projectsForRecipient.length === 0) {
      continue;
    }

    try {
      const result = await sendWeeklyDigestEmail({
        toEmail: recipient.email,
        toName: recipient.name,
        userId: recipient.userId,
        timeframeStart,
        timeframeEnd,
        projects: projectsForRecipient,
      });

      if (result.success) {
        console.log(`✅ Weekly digest sent to ${recipient.email}`);
      } else {
        console.log(
          `ℹ️ Weekly digest skipped for ${recipient.email} (${result.reason ?? 'unknown reason'})`
        );
      }
    } catch (error) {
      console.error(`Failed to send weekly digest to ${recipient.email}:`, error);
    }
  }
}

main()
  .then(() => {
    console.log('Weekly digest run completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Weekly digest run failed:', error);
    process.exit(1);
  });
