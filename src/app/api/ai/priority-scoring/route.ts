import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { checkAIUsageLimit, incrementAIUsage } from '@/lib/ai-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to analyze urgency keywords in text
function analyzeUrgency(text: string): number {
  const urgencyKeywords = [
    'critical', 'urgent', 'emergency', 'broken', 'not working', 'error',
    'bug', 'crash', 'down', 'failed', 'issue', 'problem', 'fix',
    'asap', 'immediately', 'priority', 'important', 'blocking'
  ];
  
  const textLower = text.toLowerCase();
  let urgencyScore = 0;
  
  urgencyKeywords.forEach(keyword => {
    if (textLower.includes(keyword)) {
      urgencyScore += 1;
    }
  });
  
  // Normalize to 0-1 scale
  return Math.min(urgencyScore / 5, 1);
}

// Function to analyze impact keywords in text
function analyzeImpact(text: string): number {
  const impactKeywords = [
    'all users', 'everyone', 'affects many', 'widespread', 'major',
    'significant', 'revenue', 'business', 'customer', 'user experience',
    'performance', 'scalability', 'security', 'data loss', 'privacy'
  ];
  
  const textLower = text.toLowerCase();
  let impactScore = 0;
  
  impactKeywords.forEach(keyword => {
    if (textLower.includes(keyword)) {
      impactScore += 1;
    }
  });
  
  // Normalize to 0-1 scale
  return Math.min(impactScore / 3, 1);
}

// Function to get AI analysis of priority factors
async function getAIPriorityAnalysis(post: any, engagement: any): Promise<{
  urgencyScore: number;
  impactScore: number;
  reasoning: string;
}> {
  try {
    const prompt = `Analyze this feedback post and provide priority scoring:

Title: "${post.title}"
Description: "${post.description}"
Vote Count: ${engagement.voteCount}
Comment Count: ${engagement.commentCount}
Author: ${post.author_name || 'Anonymous'}

Please analyze:
1. Urgency level (0-10): How urgent is this request?
2. Impact level (0-10): How much impact would implementing this have?
3. Brief reasoning (max 100 chars): Why this score?

Respond in JSON format:
{
  "urgencyScore": number,
  "impactScore": number,
  "reasoning": "string"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const analysis = JSON.parse(content);
    
    return {
      urgencyScore: Math.max(0, Math.min(10, analysis.urgencyScore || 5)),
      impactScore: Math.max(0, Math.min(10, analysis.impactScore || 5)),
      reasoning: analysis.reasoning || 'AI analysis completed'
    };
  } catch (error) {
    console.error('Error in AI priority analysis:', error);
    
    // Fallback to keyword-based analysis
    const text = `${post.title} ${post.description}`;
    return {
      urgencyScore: analyzeUrgency(text) * 10,
      impactScore: analyzeImpact(text) * 10,
      reasoning: 'Keyword-based analysis'
    };
  }
}

// Function to calculate final priority score
function calculatePriorityScore(
  urgencyScore: number,
  impactScore: number,
  voteCount: number,
  commentCount: number,
  maxVotes: number = 100
): number {
  // Weighted scoring system
  const urgencyWeight = 0.3;
  const impactWeight = 0.3;
  const engagementWeight = 0.4;
  
  // Normalize engagement metrics
  const normalizedVotes = Math.min(voteCount / maxVotes, 1);
  const normalizedComments = Math.min(commentCount / 20, 1);
  const engagementScore = (normalizedVotes * 0.7 + normalizedComments * 0.3) * 10;
  
  // Calculate final score
  const finalScore = (
    urgencyScore * urgencyWeight +
    impactScore * impactWeight +
    engagementScore * engagementWeight
  );
  
  return Math.round(finalScore * 10) / 10; // Round to 1 decimal place
}

// Function to get priority level from score
function getPriorityLevel(score: number): string {
  if (score >= 9) return 'Critical';
  if (score >= 7) return 'High';
  if (score >= 5) return 'Medium';
  if (score >= 3) return 'Low';
  return 'Very Low';
}

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const body = await request.json();
    const { postId, projectId, title, description, voteCount } = body;

    if (!postId || !projectId) {
      return NextResponse.json(
        { error: 'Post ID and Project ID are required' },
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
    const usageCheck = await checkAIUsageLimit(projectId, 'priority_scoring');

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You've reached your monthly limit of ${usageCheck.limit} AI priority scoring uses. ${
            usageCheck.isPro ? 'Please try again next month.' : 'Upgrade to Pro for 10,000 priority scorings per month!'
          }`,
          current: usageCheck.current,
          limit: usageCheck.limit,
          remaining: usageCheck.remaining,
          isPro: usageCheck.isPro
        },
        { status: 429 }
      );
    }

    // Get the post with engagement metrics
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        author_name,
        vote_count,
        comment_count,
        created_at
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Get AI analysis
    const aiAnalysis = await getAIPriorityAnalysis(post, {
      voteCount: post.vote_count || 0,
      commentCount: post.comment_count || 0
    });

    // Calculate final priority score
    const priorityScore = calculatePriorityScore(
      aiAnalysis.urgencyScore,
      aiAnalysis.impactScore,
      post.vote_count || 0,
      post.comment_count || 0
    );

    const priorityLevel = getPriorityLevel(priorityScore);

    // Update post with priority score
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        priority_score: priorityScore,
        priority_reason: aiAnalysis.reasoning,
        ai_analyzed_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating priority score:', updateError);
      // Continue even if update fails
    }

    // Increment usage after successful analysis
    await incrementAIUsage(projectId, 'priority_scoring');

    // Get updated usage info
    const usage = await checkAIUsageLimit(projectId, 'priority_scoring');
    const usageInfo = {
      current: usage.current + 1,
      limit: usage.limit,
      remaining: usage.remaining - 1,
      isPro: usage.isPro
    };

    return NextResponse.json({
      success: true,
      priority: {
        score: priorityScore,
        level: priorityLevel,
        urgencyScore: aiAnalysis.urgencyScore,
        impactScore: aiAnalysis.impactScore,
        reasoning: aiAnalysis.reasoning,
        voteCount: post.vote_count || 0,
        commentCount: post.comment_count || 0,
        analyzedAt: new Date().toISOString()
      },
      usage: usageInfo
    });

  } catch (error) {
    console.error('Error in priority scoring:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch priority scores for multiple posts
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
          error: 'AI priority scoring is a Pro feature',
          upgrade_required: true,
          feature: 'ai_priority_scoring'
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData || projectData.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get posts with priority scores
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        priority_score,
        priority_reason,
        vote_count,
        comment_count,
        ai_analyzed_at,
        created_at
      `)
      .eq('project_id', projectId)
      .not('priority_score', 'is', null)
      .order('priority_score', { ascending: false })
      .limit(limit);

    if (postsError) {
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    const formattedPosts = posts?.map(post => ({
      id: post.id,
      title: post.title,
      description: post.description,
      priorityScore: post.priority_score,
      priorityLevel: getPriorityLevel(post.priority_score || 0),
      priorityReason: post.priority_reason,
      voteCount: post.vote_count || 0,
      commentCount: post.comment_count || 0,
      analyzedAt: post.ai_analyzed_at,
      createdAt: post.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      total: formattedPosts.length
    });

  } catch (error) {
    console.error('Error fetching priority scores:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
