import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import EnhancedPublicRoadmap from '@/components/EnhancedPublicRoadmap';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

interface PublicRoadmapPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PublicRoadmapPageProps): Promise<Metadata> {
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
    // Get project details with roadmap settings
    const { data: project, error: projectError } = await supabase
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
        roadmap_brand_color,
        roadmap_show_progress,
        roadmap_show_effort,
        roadmap_show_timeline,
        roadmap_allow_anonymous_votes,
        roadmap_subscribe_emails
      `)
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      notFound();
    }

    // Note: Privacy check removed since is_private column doesn't exist yet
    // All roadmaps are currently public

    // Get posts organized by status for roadmap with enhanced fields
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
        status,
        priority,
        effort_estimate,
        progress_percentage,
        estimated_timeline,
        completion_date,
        tags,
        last_updated
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
      <EnhancedPublicRoadmap 
        project={project}
        roadmapData={roadmapData}
      />
    );
  } catch (error) {
    console.error('Error loading public roadmap:', error);
    notFound();
  }
}