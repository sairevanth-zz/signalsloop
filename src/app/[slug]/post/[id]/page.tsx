import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import PublicPostDetails from '@/components/PublicPostDetails';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

interface PublicPostPageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: PublicPostPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  
  try {
    // Get project and post details for SEO
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, slug, custom_domain, is_private')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      return {
        title: 'Post Not Found',
        description: 'The requested feedback post could not be found.',
      };
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('title, description, category, vote_count, created_at')
      .eq('id', id)
      .eq('project_id', project.id)
      .single();

    if (postError || !post) {
      return {
        title: 'Post Not Found',
        description: 'The requested feedback post could not be found.',
      };
    }

    const siteName = 'SignalsLoop';
    const title = `${post.title} - ${project.name} Feedback`;
    const description = post.description?.substring(0, 160) || `Feedback post: ${post.title}`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName,
        type: 'article',
        locale: 'en_US',
        publishedTime: post.created_at,
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
        canonical: `https://signalsloop.com/${slug}/post/${id}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Feedback Post',
      description: 'View feedback and suggestions.',
    };
  }
}

export default async function PublicPostPage({ params }: PublicPostPageProps) {
  const { slug, id } = await params;
  
  try {
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        slug,
        custom_domain,
        is_private,
        plan,
        created_at
      `)
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
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
                href={`/login?redirect=${encodeURIComponent(`/${slug}/post/${id}`)}`}
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

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        category,
        vote_count,
        created_at,
        author_email,
        status,
        project_id
      `)
      .eq('id', id)
      .eq('project_id', project.id)
      .single();

    if (postError || !post) {
      notFound();
    }

    // Get related posts (same category, recent)
    const { data: relatedPosts, error: relatedError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        category,
        vote_count,
        created_at,
        author_email
      `)
      .eq('project_id', project.id)
      .eq('status', 'open')
      .eq('category', post.category)
      .neq('id', post.id)
      .order('created_at', { ascending: false })
      .limit(5);

    return (
      <PublicPostDetails 
        project={project}
        post={post}
        relatedPosts={relatedPosts || []}
      />
    );
  } catch (error) {
    console.error('Error loading public post:', error);
    notFound();
  }
}