import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();
    
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    // Get post details
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        category,
        author_name,
        author_email,
        projects!inner(
          id,
          name,
          smart_replies_enabled,
          smart_replies_config
        )
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if smart replies are enabled for this project
    if (!post.projects.smart_replies_enabled) {
      return NextResponse.json({ error: 'Smart replies not enabled for this project' }, { status: 400 });
    }

    // Get existing smart replies to avoid duplicates
    const { data: existingReplies } = await supabase
      .from('smart_replies')
      .select('reply_text')
      .eq('post_id', postId);

    const existingTexts = existingReplies?.map(r => r.reply_text) || [];

    // Generate smart replies using OpenAI
    const smartReplies = await generateSmartReplies(post, existingTexts);

    // Save smart replies to database
    const repliesToInsert = smartReplies.map(reply => ({
      post_id: postId,
      reply_text: reply.text,
      reply_type: reply.type
    }));

    const { error: insertError } = await supabase
      .from('smart_replies')
      .insert(repliesToInsert);

    if (insertError) {
      console.error('Error inserting smart replies:', insertError);
      return NextResponse.json({ error: 'Failed to save smart replies' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      replies: smartReplies,
      message: 'Smart replies generated successfully' 
    });

  } catch (error) {
    console.error('Smart replies generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateSmartReplies(post: any, existingTexts: string[]) {
  const systemPrompt = `You are an AI assistant that generates helpful follow-up questions for user feedback posts. Your goal is to help collect more detailed information from users to improve their feedback.

Guidelines:
1. Generate 2-3 thoughtful follow-up questions
2. Questions should be specific and actionable
3. Avoid generic questions like "Can you provide more details?"
4. Focus on gathering information that would help prioritize and implement the feedback
5. Be friendly and professional
6. Consider the post category and content when crafting questions

Reply types:
- "follow_up": General follow-up questions
- "clarification": Questions seeking clarification on specific points
- "details": Questions asking for more technical or specific details

Return your response as a JSON array of objects with "text" and "type" fields.`;

  const userPrompt = `Post Title: ${post.title}
Post Description: ${post.description || 'No description provided'}
Category: ${post.category || 'General'}
Author: ${post.author_name || 'Anonymous'}

Generate 2-3 smart follow-up questions for this feedback post.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const replies = JSON.parse(response);
    
    // Validate and format the response
    if (!Array.isArray(replies)) {
      throw new Error('Invalid response format');
    }

    return replies.map((reply, index) => ({
      text: reply.text || reply.question || reply,
      type: reply.type || (index === 0 ? 'follow_up' : index === 1 ? 'clarification' : 'details')
    })).slice(0, 3); // Limit to 3 replies

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback replies if AI fails
    return [
      {
        text: "Could you provide more specific examples of how this would work in your use case?",
        type: "clarification"
      },
      {
        text: "What would be the expected outcome or benefit if this feature was implemented?",
        type: "follow_up"
      },
      {
        text: "Are there any specific requirements or constraints we should consider?",
        type: "details"
      }
    ];
  }
}

// GET endpoint to fetch existing smart replies
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const { data: replies, error } = await supabase
      .from('smart_replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching smart replies:', error);
      return NextResponse.json({ error: 'Failed to fetch smart replies' }, { status: 500 });
    }

    return NextResponse.json({ replies });

  } catch (error) {
    console.error('Fetch smart replies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
