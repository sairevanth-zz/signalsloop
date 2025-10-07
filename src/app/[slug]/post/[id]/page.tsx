import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import PublicPostDetails from '@/components/PublicPostDetails';

interface PublicPostPageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: PublicPostPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  
  try {
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      return { title: 'Post Not Found' };
    }

    // Get project and post details for SEO
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name, slug')
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
      .select('title, created_at')
      .eq('id', id)
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
    const supabase = getSupabaseServiceRoleClient();
    if (!supabase) {
      notFound();
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, slug, plan, created_at, owner_id')
      .eq('slug', slug)
      .single();

    if (projectError || !project) {
      notFound();
    }

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        author_email,
        author_name,
        project_id,
        category,
        vote_count,
        must_have_votes,
        important_votes,
        nice_to_have_votes,
        total_priority_score
      `)
      .eq('id', id)
      .eq('project_id', project.id)
      .single();

    if (postError || !post) {
      notFound();
    }
    const enrichedPost = {
      ...post,
      vote_count: post.vote_count ?? 0,
      must_have_votes: post.must_have_votes ?? 0,
      important_votes: post.important_votes ?? 0,
      nice_to_have_votes: post.nice_to_have_votes ?? 0,
      total_priority_score: post.total_priority_score ?? 0,
    };

    // Get related posts
    const { data: relatedPosts } = await supabase
      .from('posts')
      .select('id, title, description, status, created_at, author_email, author_name, category')
      .eq('project_id', project.id)
      .eq('status', 'open')
      .neq('id', post.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const enrichedRelated = await Promise.all((relatedPosts || []).map(async (rp) => {
      const { count } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', rp.id);
      return {
        ...rp,
        vote_count: count || 0
      };
    }));

    return (
      <PublicPostDetails 
        project={project}
        post={enrichedPost}
        relatedPosts={enrichedRelated}
      />
    );
  } catch (error) {
    console.error('Error loading public post:', error);
    notFound();
  }
}
