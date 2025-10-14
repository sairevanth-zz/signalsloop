import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import PublicBoardHomepage from '@/components/PublicBoardHomepage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

interface PublicBoardPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PublicBoardPageProps): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    // Get project details for SEO
    const { data: project, error } = await supabase
      .from('projects')
      .select('name, description, slug, custom_domain')
      .eq('slug', slug)
      .single();

    if (error || !project) {
      return {
        title: 'Board Not Found',
        description: 'The requested feedback board could not be found.',
      };
    }

    const siteName = 'SignalsLoop';
    const title = `${project.name} - Feedback Board`;
    const description = project.description || `Share your feedback and suggestions for ${project.name}. Help us improve by voting on existing ideas or submitting your own.`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName,
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        site: '@signalsloop',
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      alternates: {
        canonical: `https://signalsloop.com/${slug}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Feedback Board',
      description: 'Share your feedback and suggestions.',
    };
  }
}

export default async function PublicBoardPage({ params }: PublicBoardPageProps) {
  const { slug } = await params;
  
  try {
    // Get project details
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        slug,
        custom_domain,
        is_private,
        plan,
        created_at,
        settings
      `)
      .eq('slug', slug)
      .single();

    if (error || !project) {
      notFound();
    }

    // Check if board is private
    if (project.is_private) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Private Board</h1>
            <p className="text-gray-600 mb-6">
              This feedback board is private and requires authentication to access.
            </p>
            <div className="space-y-3">
              <Link
                href={`/login?redirect=${encodeURIComponent(`/${slug}`)}`}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
              >
                Sign In
              </Link>
              <Link
                href="/"
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors inline-block"
              >
                Create Your Own Board
              </Link>
            </div>
          </div>
        </div>
      );
    }

    // Get board configuration for submissions
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .eq('project_id', project.id)
      .single();

    if (boardError) {
      console.error('Error fetching board configuration:', boardError);
    }

    // Get recent posts for the board
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('project_id', project.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
    }

    let processedPosts = posts || [];

    if (processedPosts.length > 0) {
      const { data: voteRows, error: voteRowsError } = await supabase
        .from('votes')
        .select('post_id, priority')
        .in(
          'post_id',
          processedPosts.map((post) => post.id)
        );

      if (voteRowsError) {
        console.error('Error fetching vote stats:', voteRowsError);
      } else {
        const voteMap = new Map<
          string,
          { total: number; mustHave: number; important: number; niceToHave: number }
        >();

        (voteRows || []).forEach((vote) => {
          const postId = (vote as { post_id: string }).post_id;
          const priority = (vote as { priority?: string | null }).priority?.toLowerCase();
          if (!voteMap.has(postId)) {
            voteMap.set(postId, { total: 0, mustHave: 0, important: 0, niceToHave: 0 });
          }
          const stats = voteMap.get(postId)!;
          stats.total += 1;
          if (priority === 'must_have') {
            stats.mustHave += 1;
          } else if (priority === 'important') {
            stats.important += 1;
          } else if (priority === 'nice_to_have') {
            stats.niceToHave += 1;
          }
        });

        processedPosts = processedPosts.map((post) => {
          const stats = voteMap.get(post.id);
          const fallbackScore = stats
            ? stats.mustHave * 3 + stats.important * 2 + stats.niceToHave
            : 0;
          return {
            ...post,
            vote_count: post.vote_count ?? stats?.total ?? 0,
            must_have_votes: post.must_have_votes ?? stats?.mustHave ?? 0,
            important_votes: post.important_votes ?? stats?.important ?? 0,
            nice_to_have_votes: post.nice_to_have_votes ?? stats?.niceToHave ?? 0,
            total_priority_score: post.total_priority_score ?? fallbackScore,
          };
        });
      }
    }

    const resolvedBoardId = board?.id ?? processedPosts?.[0]?.board_id ?? null;

    return (
      <PublicBoardHomepage 
        project={project}
        posts={processedPosts}
        boardId={resolvedBoardId}
      />
    );
  } catch (error) {
    console.error('Error loading public board:', error);
    notFound();
  }
}
