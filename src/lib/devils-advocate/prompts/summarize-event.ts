/**
 * GPT-4o Prompt for Competitor Event Summarization
 */

import OpenAI from 'openai';
import type { CompetitorEventSchema } from '@/types/devils-advocate';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SUMMARIZATION_SYSTEM_PROMPT = `You are a competitive intelligence analyst extracting structured information from competitor updates.

Your job is to analyze competitor news, changelog entries, and announcements to identify strategic implications for product teams.

Focus on:
1. Classify the type of event accurately
2. Extract the most important details
3. Assess the potential impact on competing products
4. Identify specific threats or opportunities`;

const SUMMARIZATION_USER_PROMPT = (
  competitorName: string,
  sourceUrl: string,
  rawContent: string
) => `Analyze this competitor update and extract structured information.

COMPETITOR: ${competitorName}
SOURCE URL: ${sourceUrl}
RAW CONTENT:
${rawContent}

Extract and respond with JSON matching this schema:
{
  "event_type": "feature_launch|pricing_change|funding|acquisition|partnership|executive_change|product_sunset|expansion",
  "event_title": "Brief title (max 100 chars)",
  "event_summary": "2-3 sentence summary of what happened and why it matters",
  "event_date": "YYYY-MM-DD (best estimate from content)",
  "source_type": "changelog|press_release|news|social|sec_filing|job_posting",
  "impact_assessment": "critical|high|medium|low|informational",
  "strategic_implications": {
    "threat_to_features": ["list of features potentially threatened"],
    "opportunity": "any opportunity this creates for competitors",
    "recommended_response": "what competing products should consider doing"
  }
}

Rules:
- event_title must be concise and descriptive
- event_summary should explain the "what" and the "why it matters"
- impact_assessment should reflect potential business impact
- threat_to_features should be specific (e.g., "mobile app offline mode", not just "mobile features")
- recommended_response should be actionable

Respond with valid JSON only, no additional text.`;

export async function summarizeCompetitorEvent(
  competitorName: string,
  sourceUrl: string,
  rawContent: string
): Promise<z.infer<typeof CompetitorEventSchema>> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SUMMARIZATION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: SUMMARIZATION_USER_PROMPT(competitorName, sourceUrl, rawContent),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for consistent extraction
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from GPT-4o');
    }

    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.error('[summarizeCompetitorEvent] Error:', error);
    throw error;
  }
}
