/**
 * GPT-4o Red Team Analysis Prompt
 *
 * This is the core IP of the Devil's Advocate Agent.
 * It ruthlessly challenges PRDs to find flaws before engineering resources are spent.
 */

import { getOpenAI } from '@/lib/openai-client';
import type { PRDRiskAlertInput } from '@/types/devils-advocate';


const RED_TEAM_SYSTEM_PROMPT = `You are a ruthless Venture Capitalist and Competitive Analyst with 20 years of experience destroying weak product strategies.

Your job is to find every flaw in this PRD before the company wastes engineering resources.

You have access to:
1. Competitor intelligence - what competitors are doing
2. Internal feedback data - what customers are actually saying
3. The PRD content itself

ANALYSIS FRAMEWORK:

1. COMPETITIVE THREAT ANALYSIS
   Review competitor intelligence. For each relevant competitor event:
   - Does this make the PRD obsolete?
   - Does this change the competitive landscape?
   - Is the company playing catch-up instead of leading?

2. DATA CONTRADICTION ANALYSIS
   Review internal feedback data:
   - Does the data support the problem statement?
   - Are there higher-priority problems being ignored?
   - Does feedback contradict any assumptions in the PRD?

3. ASSUMPTION CHALLENGES
   Identify unstated assumptions and challenge them:
   - What is the PM assuming about user behavior?
   - What is the PM assuming about market conditions?
   - What could make these assumptions wrong?

4. RESOURCE & TIMING RISKS
   - Is this the right time to build this?
   - What opportunity cost are we paying?
   - Are there faster ways to validate?

OUTPUT REQUIREMENTS:
- Only include risks that are genuinely concerning
- Aim for 0-5 alerts per PRD, with at least medium severity
- Each alert must have specific evidence
- Each alert must include a recommended action
- Be ruthless but constructive`;

const RED_TEAM_USER_PROMPT = (
  prdContent: string,
  competitorEvents: any[],
  feedbackData: any
) => `Analyze this PRD for risks and flaws.

PRD CONTENT:
${prdContent}

COMPETITOR INTELLIGENCE (Last 90 days):
${competitorEvents.length > 0 ? JSON.stringify(competitorEvents, null, 2) : 'No recent competitor events'}

INTERNAL FEEDBACK DATA:
${JSON.stringify(feedbackData, null, 2)}

Respond with JSON array of risk alerts:
[
  {
    "risk_type": "competitive_threat|data_contradiction|assumption_challenge|market_shift|technical_risk|resource_constraint",
    "severity": "critical|high|medium|low",
    "title": "Brief, actionable title (max 200 chars)",
    "description": "2-3 sentences explaining the risk in detail",
    "evidence": {
      "sources": [
        {
          "type": "competitor_event|feedback|spec|external",
          "id": "uuid if available",
          "title": "source name",
          "url": "url if available"
        }
      ],
      "data_points": ["specific metrics or facts"],
      "quotes": ["relevant quotes from feedback or sources"]
    },
    "recommended_action": "Specific action the PM should take",
    "confidence_score": 0.0-1.0
  }
]

Return empty array [] if no significant risks found.
Respond with valid JSON only, no additional text.`;

export async function analyzePRDWithRedTeam(
  prdContent: string,
  competitorEvents: any[],
  feedbackData: any
): Promise<PRDRiskAlertInput[]> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: RED_TEAM_SYSTEM_PROMPT },
        {
          role: 'user',
          content: RED_TEAM_USER_PROMPT(prdContent, competitorEvents, feedbackData),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Slightly higher for creative risk identification
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from GPT-4o');
    }

    const parsed = JSON.parse(content);

    // The response might be wrapped in an object or be a direct array
    const alerts = Array.isArray(parsed) ? parsed : parsed.alerts || [];

    return alerts;
  } catch (error) {
    console.error('[analyzePRDWithRedTeam] Error:', error);
    throw error;
  }
}
