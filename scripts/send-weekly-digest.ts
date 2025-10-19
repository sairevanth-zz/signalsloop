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
    project_id: string;
  } | null;
};

type CommentRecord = {
  id: string;
  post_id: string;
  created_at: string;
  posts?: {
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
    .select('id, post_id, created_at, posts(post_id, project_id)')
    .gte('created_at', timeframeStart);

  if (recentVotesError) {
    console.error('Failed to load recent votes for weekly digest:', recentVotesError);
  }

  const recentVotes = (recentVotesData ?? []) as VoteRecord[];

  const { data: recentCommentsData, error: recentCommentsError } = await supabase
    .from('comments')
    .select('id, post_id, created_at, posts(post_id, project_id)')
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

  if (owners.size === 0) {
    console.log('No qualifying activity for weekly digest window.');
    return;
  }

  for (const [ownerId, summary] of owners.entries()) {
    const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(ownerId);

    if (ownerError) {
      console.error(`Failed to load owner ${ownerId} for weekly digest:`, ownerError);
      continue;
    }

    const ownerUser = ownerData?.user;
    if (!ownerUser?.email) {
      console.warn(`Owner ${ownerId} has no email. Skipping weekly digest.`);
      continue;
    }

    const toEmail = ownerUser.email;
    const toName =
      typeof ownerUser.user_metadata?.full_name === 'string'
        ? ownerUser.user_metadata.full_name
        : null;

    const projectSections = Array.from(summary.projects.values())
      .map((activity) => {
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

        return hasActivity
          ? {
              projectId: activity.project.id,
              projectName: activity.project.name,
              projectSlug: activity.project.slug,
              totalNewPosts: activity.newPosts.length,
              totalNewVotes: activity.totalNewVotes,
              totalNewComments: activity.totalNewComments,
              newPosts: newPostsList,
              topVotedPosts: voteHighlights,
              topCommentedPosts: commentHighlights,
            }
          : null;
      })
      .filter((section): section is NonNullable<typeof section> => !!section);

    if (projectSections.length === 0) {
      console.log(`No digest-worthy activity for ${toEmail}. Skipping.`);
      continue;
    }

    try {
      const result = await sendWeeklyDigestEmail({
        toEmail,
        toName,
        userId: ownerId,
        timeframeStart,
        timeframeEnd,
        projects: projectSections,
      });

      if (result.success) {
        console.log(`✅ Weekly digest sent to ${toEmail}`);
      } else {
        console.log(
          `ℹ️ Weekly digest skipped for ${toEmail} (${result.reason ?? 'unknown reason'})`
        );
      }
    } catch (error) {
      console.error(`Failed to send weekly digest to ${toEmail}:`, error);
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
