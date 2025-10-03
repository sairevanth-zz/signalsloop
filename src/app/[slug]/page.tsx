import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
              <a
                href={`/login?redirect=${encodeURIComponent(`/${slug}`)}`}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
              >
                Sign In
              </a>
              <a
                href="/"
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors inline-block"
              >
                Create Your Own Board
              </a>
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

    const boardId = board?.id ?? null;

    // Get recent posts for the board
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        category,
        vote_count,
        created_at,
        author_email,
        status
      `)
      .eq('project_id', project.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
    }

    return (
      <PublicBoardHomepage 
        project={project}
        posts={posts || []}
        boardId={boardId}
      />
    );
  } catch (error) {
    console.error('Error loading public board:', error);
    notFound();
  }
}
