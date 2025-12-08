import { getOpenAI } from '@/lib/openai-client';
import { Review } from './types';

export interface CompetitiveAnalysis {
  executive_summary: string;
  sentiment_comparison: Record<string, {
    product: string;
    overall_score: number; // -1 to 1
    positive_pct: number;
    negative_pct: number;
    neutral_pct: number;
    review_count: number;
    data_quality: 'high' | 'medium' | 'low';
  }>;
  top_complaints_by_competitor: Record<string, {
    complaint: string;
    frequency: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    sample_quotes: string[];
    opportunity: string;
  }[]>;
  competitor_strengths: Record<string, {
    strength: string;
    frequency: string;
    threat_level: 'high' | 'medium' | 'low';
    response: string;
  }[]>;
  feature_gaps: {
    feature: string;
    competitors_lacking: string[];
    demand_evidence: string;
    opportunity_size: 'high' | 'medium' | 'low';
  }[];
  strategic_recommendations: {
    action: 'ATTACK' | 'DEFEND' | 'DIFFERENTIATE' | 'IGNORE';
    target: string;
    recommendation: string;
    rationale: string;
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
  }[];
  data_limitations: string[];
}

export async function analyzeCompetitors(
  userProduct: string,
  competitors: string[],
  reviewsByProduct: Record<string, Review[]>
): Promise<CompetitiveAnalysis> {
  const products = [userProduct, ...competitors].filter(Boolean);

  // Prepare data summary for prompt to save tokens
  const reviewsSummary = Object.entries(reviewsByProduct).map(([product, reviews]) => {
    const limitedReviews = reviews.slice(0, 50); // Limit to top 50 recent/relevant reviews per product
    return `
    PRODUCT: ${product}
    TOTAL REVIEWS: ${reviews.length}
    SOURCES: ${[...new Set(reviews.map(r => r.source))].join(', ')}
    SAMPLE REVIEWS:
    ${limitedReviews.map(r => `- [${r.rating ? r.rating + '★' : 'No Rating'}] ${r.text.substring(0, 300)}...`).join('\n')}
    `;
  }).join('\n\n');

  const prompt = `
  You are a competitive intelligence analyst. Analyze reviews for multiple products and generate actionable insights.

  USER'S PRODUCT: ${userProduct}
  COMPETITORS: ${competitors.join(', ')}

  REVIEWS DATA:
  ${reviewsSummary}

  Analyze and respond with JSON matching this structure:
  {
    "executive_summary": "2-3 sentence summary",
    "sentiment_comparison": {
      "ProductName": {
        "product": "ProductName",
        "overall_score": 0.5,
        "positive_pct": 70,
        "negative_pct": 10,
        "neutral_pct": 20,
        "review_count": 50,
        "data_quality": "high"
      }
    },
    "top_complaints_by_competitor": {
      "CompetitorName": [
        { "complaint": "...", "frequency": "...", "severity": "...", "sample_quotes": ["..."], "opportunity": "..." }
      ]
    },
    "competitor_strengths": {
      "CompetitorName": [
         { "strength": "...", "frequency": "...", "threat_level": "...", "response": "..." }
      ]
    },
    "feature_gaps": [
      { "feature": "...", "competitors_lacking": ["..."], "demand_evidence": "...", "opportunity_size": "..." }
    ],
    "strategic_recommendations": [
      { "action": "ATTACK", "target": "...", "recommendation": "...", "rationale": "...", "effort": "...", "impact": "..." }
    ],
    "data_limitations": ["..."]
  }

  RULES:
  - Be specific and actionable.
  - Use real quotes if available.
  - If no data for a product, mention it in data_limitations.
  `;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');
    return analysis as CompetitiveAnalysis;
  } catch (error) {
    console.error('AI Analysis failed:', error);
    throw new Error('Failed to generate competitive analysis');
  }
}
