import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
}

// Function to get text embeddings from OpenAI
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error getting embedding:', error);
    throw new Error('Failed to get text embedding');
  }
}

// Function to analyze similarity reason using AI
async function analyzeSimilarityReason(post1: any, post2: any): Promise<string> {
  try {
    const prompt = `Analyze these two feedback posts and explain why they might be similar or duplicates:

Post 1: "${post1.title}"
Description: "${post1.description}"

Post 2: "${post2.title}"
Description: "${post2.description}"

Provide a brief reason for the similarity (max 100 characters):`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() || 'Similar content detected';
  } catch (error) {
    console.error('Error analyzing similarity:', error);
    return 'Similar content detected';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    
    // Get request body first to check project ownership
    const body = await request.json();
    const { projectId, postId, title, description } = body;
    
    if (!projectId || !postId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if project has Pro plan
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, plan')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check rate limit (both free and pro)
    const usageCheck = await checkAIUsageLimit(projectId, 'duplicate_detection');

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You've reached your monthly limit of ${usageCheck.limit} AI duplicate detection uses. ${
            usageCheck.isPro ? 'Please try again next month.' : 'Upgrade to Pro for 10,000 duplicate checks per month!'
          }`,
          current: usageCheck.current,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          isPro: usageCheck.isPro
        },
        { status: 429 }
      );
    }

    // Get the current post
    const { data: currentPost, error: postError } = await supabase
      .from('posts')
      .select('id, title, description, project_id')
      .eq('id', postId)
      .single();

    if (postError || !currentPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Get all other posts in the same project (excluding current post)
    const { data: otherPosts, error: otherPostsError } = await supabase
      .from('posts')
      .select('id, title, description, created_at')
      .eq('project_id', projectId)
      .neq('id', postId)
      .order('created_at', { ascending: false });

    if (otherPostsError) {
      return NextResponse.json(
        { error: 'Failed to fetch other posts' },
        { status: 500 }
      );
    }

    if (!otherPosts || otherPosts.length === 0) {
      return NextResponse.json({
        duplicates: [],
        message: 'No other posts to compare against'
      });
    }

    // Get embedding for current post
    const currentPostText = `${currentPost.title} ${currentPost.description}`;
    const currentEmbedding = await getEmbedding(currentPostText);

    // Compare with other posts
    const duplicates = [];
    const SIMILARITY_THRESHOLD = 0.75; // 75% similarity threshold

    for (const otherPost of otherPosts) {
      const otherPostText = `${otherPost.title} ${otherPost.description}`;
      const otherEmbedding = await getEmbedding(otherPostText);
      
      const similarity = cosineSimilarity(currentEmbedding, otherEmbedding);
      
      if (similarity >= SIMILARITY_THRESHOLD) {
        // Check if similarity already exists
        const { data: existingSimilarity } = await supabase
          .from('post_similarities')
          .select('id')
          .eq('post_id', postId)
          .eq('similar_post_id', otherPost.id)
          .single();

        if (!existingSimilarity) {
          // Analyze similarity reason
          const reason = await analyzeSimilarityReason(currentPost, otherPost);
          
          // Save similarity to database
          const { data: newSimilarity, error: similarityError } = await supabase
            .from('post_similarities')
            .insert({
              post_id: postId,
              similar_post_id: otherPost.id,
              similarity_score: similarity,
              similarity_reason: reason,
              status: 'detected'
            })
            .select()
            .single();

          if (!similarityError && newSimilarity) {
            duplicates.push({
              id: newSimilarity.id,
              postId: otherPost.id,
              title: otherPost.title,
              description: otherPost.description,
              similarity: Math.round(similarity * 100),
              reason: reason,
              createdAt: otherPost.created_at
            });
          }
        }
      }
    }

    // Increment usage after successful analysis
    await incrementAIUsage(projectId, 'duplicate_detection');

    // Get updated usage info
    const usage = await checkAIUsageLimit(projectId, 'duplicate_detection');
    const usageInfo = {
      current: usage.current + 1,
      limit: usage.limit,
      remaining: usage.remaining - 1,
      isPro: usage.isPro
    };

    return NextResponse.json({
      success: true,
      duplicates: duplicates,
      analyzed: true,
      totalPosts: otherPosts.length,
      usage: usageInfo
    });

  } catch (error) {
    console.error('Error in duplicate detection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch existing similarities for a post
export async function GET(request: NextRequest) {
  try {
    // Check authentication and plan
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Check if user has Pro plan
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.plan !== 'pro') {
      return NextResponse.json(
        { 
          error: 'AI duplicate detection is a Pro feature',
          upgrade_required: true,
          feature: 'ai_duplicate_detection'
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Get similarities for the post
    const { data: similarities, error: similaritiesError } = await supabase
      .from('post_similarities')
      .select(`
        id,
        similarity_score,
        similarity_reason,
        status,
        similar_post_id,
        posts!post_similarities_similar_post_id_fkey (
          id,
          title,
          description,
          created_at
        )
      `)
      .eq('post_id', postId)
      .eq('status', 'detected')
      .order('similarity_score', { ascending: false });

    if (similaritiesError) {
      return NextResponse.json(
        { error: 'Failed to fetch similarities' },
        { status: 500 }
      );
    }

    const formattedSimilarities = similarities?.map(sim => ({
      id: sim.id,
      postId: sim.similar_post_id,
      title: sim.posts.title,
      description: sim.posts.description,
      similarity: Math.round(sim.similarity_score * 100),
      reason: sim.similarity_reason,
      status: sim.status,
      createdAt: sim.posts.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      similarities: formattedSimilarities
    });

  } catch (error) {
    console.error('Error fetching similarities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
