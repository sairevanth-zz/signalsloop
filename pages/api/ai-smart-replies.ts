import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SmartReply = {
  reply_text: string;
  reply_type: string;
};

type SuccessResponse = {
  success: boolean;
  replies: SmartReply[];
  message: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method === 'GET') {
    // Return empty array for GET requests
    return res.status(200).json({ success: true, replies: [], message: 'No replies yet' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { postId, title, description } = req.body;
    
    if (!postId || !title) {
      return res.status(400).json({ error: 'Post ID and title are required' });
    }

    // Generate smart replies using OpenAI
    const smartReplies = await generateSmartReplies(title, description || '');

    return res.status(200).json({ 
      success: true, 
      replies: smartReplies,
      message: 'Smart replies generated successfully' 
    });

  } catch (error) {
    console.error('Smart replies generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function generateSmartReplies(title: string, description: string): Promise<SmartReply[]> {
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

    return replies.map((reply: any, index: number) => ({
      reply_text: reply.text || reply.question || reply,
      reply_type: reply.type || (index === 0 ? 'follow_up' : index === 1 ? 'clarification' : 'details')
    })).slice(0, 3); // Limit to 3 replies

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback replies if AI fails
    return [
      {
        reply_text: "Could you provide more specific examples of how this would work in your use case?",
        reply_type: "clarification"
      },
      {
        reply_text: "What would be the expected outcome or benefit if this feature was implemented?",
        reply_type: "follow_up"
      },
      {
        reply_text: "Are there any specific requirements or constraints we should consider?",
        reply_type: "details"
      }
    ];
  }
}
