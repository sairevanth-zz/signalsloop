import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { postId, title, description } = await request.json();
    
    if (!postId || !title) {
      return NextResponse.json({ error: 'Post ID and title are required' }, { status: 400 });
    }

    // Generate smart replies using OpenAI
    const smartReplies = await generateSmartReplies(title, description || '');

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

async function generateSmartReplies(title: string, description: string) {
  const systemPrompt = `You are an AI assistant that generates helpful follow-up questions for user feedback posts. Your goal is to help collect more detailed information from users to improve their feedback.

Guidelines:
1. Generate 2-3 thoughtful follow-up questions
2. Questions should be specific and actionable
3. Avoid generic questions like "Can you provide more details?"
4. Focus on gathering information that would help prioritize and implement the feedback
5. Be friendly and professional
6. Consider the post content when crafting questions

Reply types:
- "follow_up": General follow-up questions
- "clarification": Questions seeking clarification on specific points
- "details": Questions asking for more technical or specific details

Return your response as a JSON array of objects with "text" and "type" fields.`;

  const userPrompt = `Post Title: ${title}
Post Description: ${description || 'No description provided'}

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

// GET endpoint to fetch existing smart replies (simplified)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // For now, return empty array since we're not using database
    return NextResponse.json({ replies: [] });

  } catch (error) {
    console.error('Fetch smart replies error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
