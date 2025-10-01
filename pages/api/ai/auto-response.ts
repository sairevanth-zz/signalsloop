import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AutoResponseRequest {
  postId: string;
  title: string;
  description?: string;
  postType: string;
  authorName?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { postId, title, description, postType, authorName }: AutoResponseRequest = req.body;

    if (!postId || !title || !postType) {
      return res.status(400).json({ error: 'Post ID, title, and type are required' });
    }

    const response = await generateAutoResponse(title, description || '', postType, authorName);

    return res.status(200).json({
      success: true,
      response,
      posted: false, // Will be true when we auto-post
    });

  } catch (error) {
    console.error('Auto-response generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function generateAutoResponse(
  title: string, 
  description: string, 
  postType: string,
  authorName?: string
): Promise<string> {
  
  const typePrompts: Record<string, string> = {
    bug: `You're responding to a bug report. Be empathetic about the issue, acknowledge the problem, and ask for specific details that would help debug (steps to reproduce, browser/device, screenshots, error messages).`,
    
    feature: `You're responding to a feature request. Show enthusiasm for the idea, explain how it could fit the roadmap, and ask clarifying questions about use cases, expected behavior, and priority.`,
    
    improvement: `You're responding to an improvement suggestion. Appreciate the feedback, acknowledge the current state, and ask for more context about their workflow and what success would look like.`,
    
    general: `You're responding to general feedback. Thank them for sharing, ask follow-up questions to better understand their needs, and show that their input matters.`
  };

  const baseType = postType.toLowerCase();
  const promptType = ['bug', 'feature', 'improvement'].includes(baseType) ? baseType : 'general';

  const systemPrompt = `You are a friendly, professional product manager responding to user feedback. 

Your goals:
1. Make the user feel heard and valued immediately
2. Show genuine interest in their feedback
3. Ask 2-3 specific, relevant follow-up questions
4. Be conversational but professional
5. Keep it concise (2-3 short paragraphs max)
6. Don't make promises about timelines or implementation
7. Use the user's name if provided

${typePrompts[promptType]}

Tone: Warm, professional, curious, appreciative
Length: 100-150 words
Format: Plain text, no markdown needed`;

  const userPrompt = `Generate an initial response to this feedback:

Type: ${postType}
Title: "${title}"
Description: "${description || 'No additional description provided'}"
${authorName ? `Author: ${authorName}` : ''}

Write a thoughtful, personalized response.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return response;

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback response based on type
    const fallbackResponses: Record<string, string> = {
      bug: `Thanks for reporting this issue! We take bugs seriously and will investigate. Could you help us by sharing: 1) What steps led to this? 2) What browser/device are you using? 3) Any error messages you saw? This will help us fix it faster!`,
      
      feature: `Great feature idea! We're always looking to improve. To help us evaluate this: 1) What problem would this solve for you? 2) How often would you use it? 3) Are there any specific workflows where this would help? Your input helps us prioritize!`,
      
      improvement: `Thanks for the suggestion! We're constantly improving the product. Could you share more about: 1) What's your current workflow? 2) What would the ideal experience look like? 3) How critical is this to your daily use? Appreciate your feedback!`,
      
      general: `Thanks for sharing your feedback! We really value hearing from our users. Could you tell us more about: 1) What you're trying to accomplish? 2) What's working well for you? 3) Where you see room for improvement? Your insights help us build better!`
    };

    return fallbackResponses[promptType] || fallbackResponses['general'];
  }
}

