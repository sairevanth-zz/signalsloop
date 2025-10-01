import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import PublicRoadmap from '@/components/PublicRoadmap';

interface PublicRoadmapPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PublicRoadmapPageProps): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return { title: 'Roadmap Not Found' };
    }

    // Get project details for SEO
    const { data: project, error } = await supabase
      .from('projects')
      .select('name, description, slug, custom_domain, is_private')
      .eq('slug', slug)
      .single();

    if (error || !project) {
      return {
        title: 'Roadmap Not Found',
        description: 'The requested roadmap could not be found.',
      };
    }

    const siteName = 'SignalsLoop';
    const title = `${project.name} Roadmap`;
    const description = `View the development roadmap for ${project.name}. See what features are planned, in progress, and completed.`;
    
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
        canonical: `https://signalsloop.com/${slug}/roadmap`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Product Roadmap',
      description: 'View our product development roadmap.',
    };
  }
}

export default async function PublicRoadmapPage({ params }: PublicRoadmapPageProps) {
  const { slug } = await params;
  
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      notFound();
    }

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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Private Roadmap</h1>
            <p className="text-gray-600 mb-6">
              This roadmap is private and requires authentication to access.
            </p>
            <div className="space-y-3">
              <a
                href={`/login?redirect=${encodeURIComponent(`/${slug}/roadmap`)}`}
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

    // Get posts organized by status for roadmap
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
      .in('status', ['open', 'in_progress', 'planned', 'completed'])
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
    }

    // Organize posts by status
    const roadmapData = {
      planned: posts?.filter(post => post.status === 'planned') || [],
      in_progress: posts?.filter(post => post.status === 'in_progress') || [],
      completed: posts?.filter(post => post.status === 'completed') || [],
      open: posts?.filter(post => post.status === 'open') || [],
    };

    return (
      <PublicRoadmap 
        project={project}
        roadmapData={roadmapData}
      />
    );
  } catch (error) {
    console.error('Error loading public roadmap:', error);
    notFound();
  }
}