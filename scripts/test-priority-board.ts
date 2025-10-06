import { calculatePriorityScore } from '../src/lib/enhanced-priority-scoring';

interface SamplePost {
  id: string;
  title: string;
  description: string;
  category?: string;
  status?: string;
  votes: number;
  comments: number;
  uniqueVoters: number;
  percentActive: number;
  similarPosts: number;
  userTier: 'free' | 'pro' | 'enterprise';
}

const POSTS: SamplePost[] = [
  {
    id: 'test-bug',
    title: 'test bug',
    description: 'testing bug category',
    category: 'bug',
    status: 'open',
    votes: 2,
    comments: 0,
    uniqueVoters: 2,
    percentActive: 3,
    similarPosts: 0,
    userTier: 'pro'
  },
  {
    id: 'test-general-feedback',
    title: 'test general feedback',
    description: 'testing general feedback category',
    category: 'general',
    status: 'open',
    votes: 1,
    comments: 0,
    uniqueVoters: 1,
    percentActive: 1,
    similarPosts: 0,
    userTier: 'free'
  },
  {
    id: 'modal-doesnt-open',
    title: 'Modal doesnt open properly',
    description: 'Most of the modals only open partially, making it difficult to interact with the features I need. This disrupts workflow and causes confusion.',
    category: 'bug',
    status: 'open',
    votes: 0,
    comments: 0,
    uniqueVoters: 0,
    percentActive: 0,
    similarPosts: 2,
    userTier: 'pro'
  },
  {
    id: 'great-feature',
    title: 'great feature',
    description: 'good to have. test.',
    category: 'feature',
    status: 'planned',
    votes: 1,
    comments: 0,
    uniqueVoters: 1,
    percentActive: 1,
    similarPosts: 0,
    userTier: 'free'
  },
  {
    id: 'e2e-test-feedback',
    title: 'E2E Test Feedback',
    description: 'This is an end-to-end test to verify the feedback submission functionality works correctly.',
    category: 'testing',
    status: 'open',
    votes: 0,
    comments: 0,
    uniqueVoters: 0,
    percentActive: 0,
    similarPosts: 0,
    userTier: 'free'
  },
  {
    id: 'test-improvement',
    title: 'test improvement',
    description: 'testing improvement category',
    category: 'improvement',
    status: 'open',
    votes: 0,
    comments: 0,
    uniqueVoters: 0,
    percentActive: 0,
    similarPosts: 0,
    userTier: 'free'
  },
  {
    id: 'ai-test-feature',
    title: 'AI Test Feature Request',
    description: "I'd like a new feature that enables users to export their data in various formats for analysis.",
    category: 'feature',
    status: 'open',
    votes: 0,
    comments: 0,
    uniqueVoters: 0,
    percentActive: 0,
    similarPosts: 1,
    userTier: 'free'
  },
  {
    id: 'mobile-layout-bugs',
    title: 'Mobile layout bugs',
    description: 'Lot of bugs in the mobile layout, needs serious attention.',
    category: 'bug',
    status: 'in-progress',
    votes: 0,
    comments: 0,
    uniqueVoters: 0,
    percentActive: 0,
    similarPosts: 1,
    userTier: 'enterprise'
  },
  {
    id: 'this-is-a-test-for-bug',
    title: 'This is a test for bug',
    description: 'Bug testing',
    category: 'bug',
    status: 'done',
    votes: 0,
    comments: 0,
    uniqueVoters: 0,
    percentActive: 0,
    similarPosts: 0,
    userTier: 'free'
  },
  {
    id: 'moderation',
    title: 'Moderation',
    description: 'Need moderation admin rights for content.',
    category: 'admin',
    status: 'open',
    votes: 0,
    comments: 0,
    uniqueVoters: 0,
    percentActive: 0,
    similarPosts: 0,
    userTier: 'pro'
  },
  {
    id: 'debug-analysis',
    title: 'Debug analysis',
    description: 'Need more debug options.',
    category: 'feature',
    status: 'in-progress',
    votes: 0,
    comments: 0,
    uniqueVoters: 0,
    percentActive: 0,
    similarPosts: 1,
    userTier: 'pro'
  },
  {
    id: 'test-feature',
    title: 'test feature',
    description: 'testing feature request category',
    category: 'feature',
    status: 'open',
    votes: 0,
    comments: 0,
    uniqueVoters: 0,
    percentActive: 0,
    similarPosts: 0,
    userTier: 'free'
  },
  {
    id: 'test-feedback-submission',
    title: 'Test feedback submission',
    description: 'This is a test description for the feedback submission to verify the modal works correctly.',
    category: 'testing',
    status: 'open',
    votes: 0,
    comments: 0,
    uniqueVoters: 0,
    percentActive: 0,
    similarPosts: 0,
    userTier: 'free'
  }
];

async function main() {
  console.log('Scoring', POSTS.length, 'posts...');

  const results = [] as Array<{
    id: string;
    title: string;
    score: number;
    level: string;
    justification: string;
    suggestedAction: string;
  }>;

  for (const post of POSTS) {
    const context = {
      post: {
        id: post.id,
        title: post.title,
        description: post.description,
        category: post.category,
        createdAt: new Date('2025-09-01')
      },
      metrics: {
        voteCount: post.votes,
        commentCount: post.comments,
        uniqueVoters: post.uniqueVoters,
        percentageOfActiveUsers: post.percentActive,
        similarPostsCount: post.similarPosts
      },
      user: {
        tier: post.userTier,
        isChampion: post.votes >= 3
      },
      businessContext: {
        currentQuarter: 'Q3',
        companyStrategy: 'growth'
      }
    } satisfies Parameters<typeof calculatePriorityScore>[0];

    const score = await calculatePriorityScore(context);
    results.push({
      id: post.id,
      title: post.title,
      score: Math.round(score.weightedScore * 10),
      level: score.priorityLevel,
      justification: score.businessJustification,
      suggestedAction: score.suggestedAction
    });
  }

  console.table(results, ['title', 'score', 'level', 'suggestedAction']);

  results.forEach(result => {
    console.log('\n---', result.title, '---');
    console.log('Score:', result.score, '| Level:', result.level, '| Suggested:', result.suggestedAction);
    console.log('Reasoning:', result.justification);
  });
}

main().catch(error => {
  console.error('Failed to run scoring sample:', error);
  process.exitCode = 1;
});

