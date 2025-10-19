import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import PublicPostDetails from '@/components/PublicPostDetails';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      .select('title, description, created_at')
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
      console.error('Project fetch error', projectError, 'slug', slug);
      notFound();
    }

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('project_id', project.id)
      .single();

    if (postError || !post) {
      console.error('Post fetch error', postError, 'id', id, 'project', project?.id);
      notFound();
    }
    const { data: voteRows, error: votesError } = await supabase
      .from('votes')
      .select('priority')
      .eq('post_id', post.id);

    const priorityCounts = (voteRows || []).reduce(
      (acc, row) => {
        const priority = (row as { priority?: string | null })?.priority?.toLowerCase();
        if (priority === 'must_have') {
          acc.mustHave += 1;
        } else if (priority === 'important') {
          acc.important += 1;
        } else if (priority === 'nice_to_have') {
          acc.niceToHave += 1;
        }
        acc.total += 1;
        return acc;
      },
      { mustHave: 0, important: 0, niceToHave: 0, total: 0 }
    );

    if (votesError) {
      console.error('Vote stats fetch error', votesError, 'post', post.id);
    }

    const fallbackPriorityScore =
      priorityCounts.mustHave * 3 +
      priorityCounts.important * 2 +
      priorityCounts.niceToHave;

    const enrichedPost = {
      ...post,
      vote_count: post.vote_count ?? priorityCounts.total,
      must_have_votes: post.must_have_votes ?? priorityCounts.mustHave,
      important_votes: post.important_votes ?? priorityCounts.important,
      nice_to_have_votes: post.nice_to_have_votes ?? priorityCounts.niceToHave,
      total_priority_score: post.total_priority_score ?? fallbackPriorityScore,
    };

    // Get related posts
    const { data: relatedPosts, error: relatedPostsError } = await supabase
      .from('posts')
      .select('*')
      .eq('project_id', project.id)
      .eq('status', 'open')
      .neq('id', post.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (relatedPostsError) {
      console.error('Related posts fetch error', relatedPostsError, 'post', post.id);
    }

    let enrichedRelated = relatedPosts || [];

    if (enrichedRelated.length > 0) {
      const { data: relatedVotes, error: relatedVotesError } = await supabase
        .from('votes')
        .select('post_id, priority')
        .in(
          'post_id',
          enrichedRelated.map((rp) => rp.id)
        );

      if (relatedVotesError) {
        console.error('Related vote stats fetch error', relatedVotesError);
      } else {
        const voteMap = new Map<
          string,
          { total: number; mustHave: number; important: number; niceToHave: number }
        >();

        (relatedVotes || []).forEach((vote) => {
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

        enrichedRelated = enrichedRelated.map((rp) => {
          const stats = voteMap.get(rp.id);
          const fallbackScore = stats
            ? stats.mustHave * 3 + stats.important * 2 + stats.niceToHave
            : 0;
          return {
            ...rp,
            vote_count: rp.vote_count ?? stats?.total ?? 0,
            must_have_votes: rp.must_have_votes ?? stats?.mustHave ?? 0,
            important_votes: rp.important_votes ?? stats?.important ?? 0,
            nice_to_have_votes: rp.nice_to_have_votes ?? stats?.niceToHave ?? 0,
            total_priority_score: rp.total_priority_score ?? fallbackScore,
          };
        });
      }
    }

    const { data: mergedDuplicates, error: mergedDuplicatesError } = await supabase
      .from('posts')
      .select('id, title, status, vote_count, created_at')
      .eq('duplicate_of', post.id)
      .order('created_at', { ascending: false });

    if (mergedDuplicatesError) {
      console.error('Merged duplicates fetch error', mergedDuplicatesError, 'post', post.id);
    }

    let canonicalPost: {
      id: string;
      title: string;
      status: string;
      vote_count: number | null;
      created_at: string;
    } | null = null;

    if (post.duplicate_of) {
      const { data: canonicalData, error: canonicalError } = await supabase
        .from('posts')
        .select('id, title, status, vote_count, created_at')
        .eq('id', post.duplicate_of)
        .single();

      if (canonicalError) {
        console.error('Canonical post fetch error', canonicalError, 'canonical', post.duplicate_of);
      } else {
        canonicalPost = canonicalData ?? null;
      }
    }

    return (
      <PublicPostDetails 
        project={project}
        post={enrichedPost}
        relatedPosts={enrichedRelated}
        mergedDuplicates={mergedDuplicates || []}
        canonicalPost={canonicalPost}
      />
    );
  } catch (error) {
    console.error('Error loading public post:', error);
    notFound();
  }
}
