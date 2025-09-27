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
      .select('name, roadmap_description, slug, custom_domain')
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
    const description = project.roadmap_description || `Share your feedback and suggestions for ${project.name}. Help us improve by voting on existing ideas or submitting your own.`;
    
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
        slug,
        custom_domain,
        plan,
        created_at,
        roadmap_title,
        roadmap_description,
        roadmap_logo_url,
        roadmap_brand_color
      `)
      .eq('slug', slug)
      .single();

    if (error || !project) {
      notFound();
    }

    // Note: Privacy check removed since is_private column doesn't exist yet
    // All boards are currently public

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
      />
    );
  } catch (error) {
    console.error('Error loading public board:', error);
    notFound();
  }
}
