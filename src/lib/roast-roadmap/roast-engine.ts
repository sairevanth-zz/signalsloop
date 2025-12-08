
import { getOpenAI } from '@/lib/openai-client';
import { ParsedRoadmap } from './parse-roadmap';


export interface RoastResult {
  confidence_score: number;
  verdict: string;
  one_liner: string;
  score_breakdown: {
    base: number;
    adjustments: { reason: string; points: number }[];
  };
  blind_spots: {
    gap: string;
    why_it_matters: string;
    severity: 'critical' | 'high' | 'medium';
    suggestion: string;
  }[];
  demand_questions: {
    feature: string;
    concern: string;
    question: string;
    validation_idea: string;
  }[];
  assumption_challenges: {
    assumption: string;
    risk: string;
    test: string;
  }[];
  prioritization_notes: {
    observation: string;
    suggestion: string;
  }[];
  quick_wins: string[];
  whats_good: string[];
}

export interface RoastContext {
  industry?: string;
  companyStage?: string;
  teamSize?: string;
}

export async function generateRoast(roadmap: ParsedRoadmap, context: RoastContext = {}): Promise<RoastResult> {
  const prompt = `
You are a battle-tested Chief Product Officer reviewing a roadmap.
Your job is to find weaknesses BEFORE the team wastes engineering resources.
Be direct, specific, and constructive. Generic advice is useless.

ROADMAP TO ROAST:
${JSON.stringify(roadmap, null, 2)}

CONTEXT:
- Industry: ${context.industry || 'Unknown'}
- Company Stage: ${context.companyStage || 'Unknown'}
- Team Size: ${context.teamSize || 'Unknown'}

ANALYSIS RULES:
1. CHECK THE METRICS: If features have 'votes' or 'comments' in the data, use them!
   - High votes = Validated demand. Do NOT say "no evidence of demand" if it has 50+ votes.
   - Low votes on "In Progress" items = Roast them for building what nobody wants.
   - No votes on "Done" items = Roast them for shipping features nobody asked for.
2. RESPECT THE LEGEND: If the metadata contains legend definitions (e.g. "Black = Mobile"), DO NOT complain about missing mobile strategy if black cards exist.
3. LOOK FOR CLUSTERS: Are they building too much in one area (e.g. only platform features) and ignoring others (e.g. user-facing)?

ANALYSIS FRAMEWORK:
1. BLIND SPOTS (What's conspicuously missing?)
2. DEMAND QUESTIONS (Which items lack validation?)
3. ASSUMPTION CHALLENGES (What critical assumptions are being made?)
4. PRIORITIZATION QUESTIONS (Does the order make sense?)

5. CONFIDENCE SCORE (0-100)
   Base: 65 points
   Deductions:
   - Critical blind spot: -10 to -15 pts (max 2)
   - Questionable demand: -3 to -8 pts (max 3)
   - Major assumption risk: -5 to -10 pts (max 2)
   - Poor prioritization: -5 to -10 pts
   - No clear timelines/priorities: -5 pts each
   Additions:
   - Clear framework: +5 to +10 pts
   - Evidence of research: +5 pts
   - Realistic scope: +5 pts
   - Quick wins vs Big bets balance: +5 pts
   Floor: 20, Ceiling: 90

Respond with JSON:
{
  "confidence_score": 0-100,
  "verdict": "Strong/Solid/Needs Work/Risky/Weak",
  "one_liner": "One brutal but fair sentence summary",
  
  "score_breakdown": {
    "base": 65,
    "adjustments": [
      { "reason": "Missing mobile strategy", "points": -12 },
      { "reason": "Clear quarterly prioritization", "points": +8 }
    ]
  },
  
  "blind_spots": [
    {
      "gap": "What's missing",
      "why_it_matters": "Impact",
      "severity": "critical/high/medium",
      "suggestion": "Suggestion"
    }
  ],
  
  "demand_questions": [
    {
      "feature": "Feature Name",
      "concern": "Why questionable",
      "question": "Question to ask",
      "validation_idea": "Validation idea"
    }
  ],
  
  "assumption_challenges": [
    {
      "assumption": "Assumption made",
      "risk": "Risk",
      "test": "Test"
    }
  ],
  
  "prioritization_notes": [
    {
      "observation": "Observation",
      "suggestion": "Suggestion"
    }
  ],
  
  "quick_wins": [
    "Actionable improvement 1"
  ],
  
  "whats_good": [
    "Positive observation 1"
  ]
}
`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a critical CPO. Output ONLY valid JSON.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('Failed to generate roast');

  return JSON.parse(content);
}
