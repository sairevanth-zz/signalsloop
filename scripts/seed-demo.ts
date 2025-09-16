import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE:', !!supabaseServiceKey);
  console.error('');
  console.error('Please check your .env.local file and ensure these variables are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Demo data
const demoProject = {
  id: '00000000-0000-0000-0000-000000000001',
  owner_id: '00000000-0000-0000-0000-000000000001', 
  name: 'SignalsLoop Demo',
  slug: 'demo',
  plan: 'free',
  created_at: new Date().toISOString()
};

const demoBoard = {
  id: '00000000-0000-0000-0000-000000000001',
  project_id: demoProject.id,
  name: 'General Feedback',
  description: 'Share your feedback, feature requests, and ideas for our product.'
};

const demoPosts = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    board_id: demoBoard.id,
    title: 'Add dark mode theme',
    description: 'Would love to have a dark mode option for better usability during nighttime coding sessions. This would be great for reducing eye strain.',
    status: 'planned',
    author_email: 'sarah@techstartup.com',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
  },
  {
    id: '00000000-0000-0000-0000-000000000002', 
    board_id: demoBoard.id,
    title: 'API rate limiting issues',
    description: 'Experiencing occasional 429 errors when making rapid API calls. Could we increase the rate limits for paid plans?',
    status: 'in_progress',
    author_email: 'dev@acmecorp.com',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    board_id: demoBoard.id, 
    title: 'Slack integration for notifications',
    description: 'Integration with Slack to get notified when new feedback is submitted or status changes occur.',
    status: 'open',
    author_email: 'product@growthco.io',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() // 4 days ago
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    board_id: demoBoard.id,
    title: 'Keyboard shortcuts for power users', 
    description: 'Add keyboard shortcuts like "C" to create new post, "R" to refresh, etc. This would speed up the workflow significantly.',
    status: 'open',
    author_email: 'alex@productteam.co',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    board_id: demoBoard.id,
    title: 'Export feedback to CSV',
    description: 'Ability to export all feedback data to CSV format for analysis and reporting purposes.',
    status: 'done',
    author_email: 'analytics@datadriven.com', 
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    board_id: demoBoard.id,
    title: 'Mobile app for iOS and Android',
    description: 'Native mobile apps would be amazing for on-the-go feedback management.',
    status: 'declined', 
    author_email: 'mobile@appstudio.com',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() // 12 days ago
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    board_id: demoBoard.id,
    title: 'Better search and filtering',
    description: 'More advanced search with filters by date, status, author, and tags. Current search is too basic.',
    status: 'in_progress',
    author_email: 'ux@designstudio.co',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    board_id: demoBoard.id,
    title: 'Email digest for team members',
    description: 'Weekly email digest with summary of new feedback, trending requests, and status updates.',
    status: 'planned',
    author_email: 'team@remoteco.work',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  },
  {
    id: '00000000-0000-0000-0000-000000000009',
    board_id: demoBoard.id,
    title: 'Custom webhook endpoints',
    description: 'Allow custom webhook URLs for integration with existing tools and workflows.',
    status: 'open',
    author_email: 'devops@automation.tech',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() // 6 days ago
  },
  {
    id: '00000000-0000-0000-0000-000000000010',
    board_id: demoBoard.id,
    title: 'Widget customization options',
    description: 'More customization options for the feedback widget - colors, position, text, and styling to match brand.',
    status: 'done',
    author_email: 'branding@styleco.design',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() // 8 days ago
  }
];

// Generate votes for posts (realistic distribution)
const generateVotes = (postId: string, voteCount: number) => {
  const votes = [];
  for (let i = 0; i < voteCount; i++) {
    votes.push({
      post_id: postId,
      ip_address: `192.168.1.${100 + i}`, // Generate realistic IP addresses
      created_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  return votes;
};

// Demo comments
const demoComments = [
  {
    post_id: demoPosts[0].id, // Dark mode
    author_email: 'designer@uiteam.co',
    content: 'This would be fantastic! Dark mode is essential for developer tools. I\'d love to help with the design if needed.',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    post_id: demoPosts[0].id,
    author_email: 'dev@techcorp.com', 
    content: 'Agreed! My eyes would thank you for this feature 😊',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    post_id: demoPosts[1].id, // API rate limiting
    author_email: 'backend@scaleco.io',
    content: 'We\'re also experiencing this. It would be great to have different limits for different plan tiers.',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    post_id: demoPosts[2].id, // Slack integration
    author_email: 'pm@productco.com',
    content: 'This would save us so much time! We currently have to manually check for new feedback.',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    post_id: demoPosts[4].id, // CSV export (done)
    author_email: 'data@analytics.pro',
    content: 'Just used this feature - works perfectly! Thanks for implementing it so quickly.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Demo changelog entries
const demoChangelog = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    project_id: demoProject.id,
    title: 'CSV Export Feature Released',
    description: 'You can now export all your feedback data to CSV format for analysis. Find the export button in your admin dashboard.',
    type: 'feature',
    published: true
  },
  {
    id: '00000000-0000-0000-0000-000000000002', 
    project_id: demoProject.id,
    title: 'Improved Widget Customization',
    description: 'Enhanced the feedback widget with more color options, position settings, and custom text. Check out the new customization panel in settings.',
    type: 'improvement',
    published: true
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    project_id: demoProject.id,
    title: 'Performance Improvements',
    description: 'Faster page loading, better mobile experience, and improved search functionality. Your feedback boards should feel much snappier now!',
    type: 'improvement',
    published: true
  }
];

export async function seedDemo() {
  try {
    console.log('🌱 Seeding demo data...');

    // Insert demo project
    const { error: projectError } = await supabase
      .from('projects')
      .upsert([demoProject], { onConflict: 'id' });
    
    if (projectError) {
      console.error('Error creating demo project:', projectError);
      return;
    }

    // Insert demo board  
    const { error: boardError } = await supabase
      .from('boards')
      .upsert([demoBoard], { onConflict: 'id' });
      
    if (boardError) {
      console.error('Error creating demo board:', boardError);
      return;
    }

    // Insert demo posts
    const { error: postsError } = await supabase
      .from('posts')
      .upsert(demoPosts, { onConflict: 'id' });
      
    if (postsError) {
      console.error('Error creating demo posts:', postsError);
      return;
    }

    // Insert demo votes with realistic distribution
    const allVotes = [
      ...generateVotes(demoPosts[0].id, 42), // Dark mode - high votes
      ...generateVotes(demoPosts[1].id, 31), // API rate limiting
      ...generateVotes(demoPosts[2].id, 28), // Slack integration 
      ...generateVotes(demoPosts[3].id, 19), // Keyboard shortcuts
      ...generateVotes(demoPosts[4].id, 15), // CSV export (done)
      ...generateVotes(demoPosts[5].id, 8),  // Mobile app (declined)
      ...generateVotes(demoPosts[6].id, 34), // Better search
      ...generateVotes(demoPosts[7].id, 22), // Email digest
      ...generateVotes(demoPosts[8].id, 17), // Webhooks
      ...generateVotes(demoPosts[9].id, 25), // Widget customization (done)
    ];

    const { error: votesError } = await supabase
      .from('votes')
      .upsert(allVotes, { onConflict: 'post_id,ip_address' });
      
    if (votesError) {
      console.error('Error creating demo votes:', votesError);
      return;
    }

    // Insert demo comments
    const { error: commentsError } = await supabase
      .from('comments')
      .upsert(demoComments);
      
    if (commentsError) {
      console.error('Error creating demo comments:', commentsError);
      return;
    }

    // Insert demo changelog
    const { error: changelogError } = await supabase
      .from('changelog_entries')
      .upsert(demoChangelog, { onConflict: 'id' });
      
    if (changelogError) {
      console.error('Error creating demo changelog:', changelogError);
      return;
    }

    console.log('✅ Demo data seeded successfully!');
    console.log('🔗 Visit: /demo/board to see the demo');
    
  } catch (error) {
    console.error('Failed to seed demo data:', error);
  }
}

// Run this if called directly
if (require.main === module) {
  seedDemo().then(() => process.exit(0));
}
