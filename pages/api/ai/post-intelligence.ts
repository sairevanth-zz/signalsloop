import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Sentiment = 'positive' | 'neutral' | 'negative' | 'mixed';

interface PostIntelligence {
  sentiment: Sentiment;
  sentimentScore: number; // 0-100 (0 = very negative, 100 = very positive)
  primaryEmotion: string;
  impactScore: number; // 0-100
  urgency: number; // 0-100
  businessValue: number; // 0-100
  userPain: number; // 0-100
  summary: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { title, description, postType } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const intelligence = await analyzePost(title, description || '', postType || 'general');

    return res.status(200).json({
      success: true,
      intelligence,
    });

  } catch (error) {
    console.error('Post intelligence error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function analyzePost(title: string, description: string, postType: string): Promise<PostIntelligence> {
  const systemPrompt = `You are an AI analyst that evaluates user feedback and feature requests. Analyze the sentiment and impact of posts to help product teams prioritize effectively.

Your analysis should consider:
1. User sentiment and emotion
2. Urgency and importance
3. Business value and impact
4. User pain or frustration level

Return a JSON object with the following structure:
{
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "sentimentScore": 0-100 (0=very negative, 50=neutral, 100=very positive),
  "primaryEmotion": "excited" | "frustrated" | "hopeful" | "concerned" | "neutral" | "urgent" | "appreciative",
  "impactScore": 0-100 (overall impact considering all factors),
  "urgency": 0-100 (how urgent/critical is this),
  "businessValue": 0-100 (potential business/product value),
  "userPain": 0-100 (level of user pain/frustration),
  "summary": "1-2 sentence AI recommendation or insight"
}

Be objective and data-driven. Consider context clues in the language used.`;

  const userPrompt = `Analyze this ${postType} post:

Title: "${title}"
Description: "${description || 'No description provided'}"

Provide comprehensive intelligence analysis.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const intelligence = JSON.parse(response);
    
    // Validate response structure
    if (!intelligence.sentiment || typeof intelligence.sentimentScore !== 'number') {
      throw new Error('Invalid response format');
    }

    return intelligence;

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback analysis
    return {
      sentiment: 'neutral',
      sentimentScore: 50,
      primaryEmotion: 'neutral',
      impactScore: 50,
      urgency: 50,
      businessValue: 50,
      userPain: 50,
      summary: 'Unable to analyze at this time. Manual review recommended.'
    };
  }
}

