import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Action = 'improve' | 'expand' | 'clarify' | 'professional';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { text, context, action } = req.body;

    if (!text || !action) {
      return res.status(400).json({ error: 'Text and action are required' });
    }

    const improved = await improveWriting(text, context || '', action);

    return res.status(200).json({
      success: true,
      improved: improved,
      suggestions: action === 'improve' ? [improved] : [],
    });

  } catch (error) {
    console.error('Writing assistant error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function improveWriting(text: string, context: string, action: Action): Promise<string> {
  const actionPrompts: Record<Action, string> = {
    improve: `Improve the following text to make it clearer, more concise, and better structured. Keep the user's original voice and intent, but enhance readability and flow. Don't make it overly formal unless needed.`,
    
    expand: `Take the following brief text and expand it with more details, examples, or context. Help the user express their ideas more completely while maintaining their original intent and tone.`,
    
    clarify: `Rewrite the following text to be clearer and more specific. Remove ambiguity, organize thoughts better, and make the message easier to understand. Keep the user's voice.`,
    
    professional: `Rewrite the following text in a more professional and polished tone, suitable for business communication. Keep the core message but enhance professionalism and clarity.`
  };

  const systemPrompt = `You are a helpful writing assistant that helps users articulate their thoughts better. Your role is to:
1. Preserve the user's original voice and intent
2. Enhance clarity, structure, and flow
3. Keep it authentic - not robotic or overly formal (unless professional tone is requested)
4. Return ONLY the improved text, no explanations or meta-commentary
5. Keep it concise - similar length unless expansion is specifically requested

Context (what they're responding to): "${context}"

${actionPrompts[action]}`;

  const userPrompt = `Original text to improve:
"${text}"

Provide the improved version directly, no explanations.`;

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

    const improved = completion.choices[0]?.message?.content?.trim();
    
    if (!improved) {
      throw new Error('No response from OpenAI');
    }

    // Remove quotes if AI wrapped the response
    return improved.replace(/^["']|["']$/g, '');

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback: return original with minor improvements
    return text.trim();
  }
}

