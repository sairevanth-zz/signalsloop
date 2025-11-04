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
      .select('name, slug')
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
      .select('id, name, slug, plan, created_at')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      notFound();
    }

    // Get board for this project
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .eq('project_id', project.id)
      .single();

    if (boardError || !board) {
      notFound();
    }

    // Get posts organized by status for roadmap (only existing columns)
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, status, created_at, author_email, author_name, category, ai_categorized')
      .eq('board_id', board.id)
      .is('duplicate_of', null)
      .in('status', ['open', 'in_progress', 'planned', 'done'])
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return notFound();
    }

    // Get vote counts for each post
    const postsWithVotes = await Promise.all((posts || []).map(async (post) => {
      const { count } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      return {
        ...post,
        description: post.title, // Use title as description if no description column
        vote_count: count || 0
      };
    }));

    // Organize posts by status
    const roadmapData = {
      planned: postsWithVotes.filter(post => post.status === 'planned'),
      in_progress: postsWithVotes.filter(post => post.status === 'in_progress'),
      completed: postsWithVotes.filter(post => post.status === 'done'),
      open: postsWithVotes.filter(post => post.status === 'open'),
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