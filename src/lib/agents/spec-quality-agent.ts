/**
 * Spec Quality Agent (Phase 3)
 *
 * Listens to: spec.auto_drafted
 * Actions: Reviews auto-drafted specs for completeness and quality
 * Triggers: No events (adds quality scores to spec metadata)
 *
 * This agent ensures auto-drafted specs meet quality standards
 */

import { DomainEvent } from '@/lib/events/types';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Quality criteria for specs
const QUALITY_CRITERIA = {
  hasProblemStatement: { weight: 0.20, name: 'Problem Statement' },
  hasUserStories: { weight: 0.15, name: 'User Stories' },
  hasAcceptanceCriteria: { weight: 0.15, name: 'Acceptance Criteria' },
  hasTechnicalConsiderations: { weight: 0.10, name: 'Technical Details' },
  hasSuccessMetrics: { weight: 0.10, name: 'Success Metrics' },
  hasTimeline: { weight: 0.05, name: 'Timeline' },
  clarity: { weight: 0.15, name: 'Clarity & Readability' },
  completeness: { weight: 0.10, name: 'Overall Completeness' },
};

/**
 * Handle spec.auto_drafted event
 * Review spec quality and provide improvement suggestions
 */
export async function handleSpecQualityReview(event: DomainEvent): Promise<void> {
  const startTime = Date.now();
  const { payload, metadata } = event;

  console.log(`[SPEC QUALITY AGENT] 📨 Reviewing auto-drafted spec: ${payload.title}`);

  try {
    const supabase = getServiceRoleClient();

    // Get full spec content
    const { data: spec } = await supabase
      .from('specs')
      .select('id, title, content, project_id')
      .eq('id', event.aggregate_id)
      .single();

    if (!spec) {
      console.log('[SPEC QUALITY AGENT] ⏭️  Spec not found');
      return;
    }

    // Analyze spec quality
    console.log('[SPEC QUALITY AGENT] 🤖 Analyzing spec quality...');
    const qualityAnalysis = await analyzeSpecQuality(spec.title, spec.content);

    // Calculate overall quality score
    const overallScore = calculateOverallScore(qualityAnalysis.scores);

    // Determine quality level
    const qualityLevel = overallScore >= 0.8 ? 'excellent' :
                        overallScore >= 0.6 ? 'good' :
                        overallScore >= 0.4 ? 'fair' : 'needs_improvement';

    console.log(`[SPEC QUALITY AGENT] 📊 Quality score: ${(overallScore * 100).toFixed(0)}% (${qualityLevel})`);

    // Store quality analysis as metadata
    await supabase
      .from('specs')
      .update({
        context_sources: [
          ...(spec.context_sources || []),
          {
            type: 'quality_review',
            quality_score: overallScore,
            quality_level: qualityLevel,
            scores: qualityAnalysis.scores,
            suggestions: qualityAnalysis.suggestions,
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'spec_quality_agent',
          },
        ],
      })
      .eq('id', spec.id);

    // If quality is low, add improvement suggestions to spec
    if (qualityLevel === 'needs_improvement' || qualityLevel === 'fair') {
      await addQualityImprovements(spec.id, qualityAnalysis.suggestions);
    }

    // Notify if quality is poor
    if (qualityLevel === 'needs_improvement') {
      console.log(`[SPEC QUALITY AGENT] ⚠️  Low quality spec detected - PM should review carefully`);

      // Could send notification here
      // await notifyPM(spec.project_id, spec.id, 'Low quality spec needs attention');
    }

    const duration = Date.now() - startTime;
    console.log(`[SPEC QUALITY AGENT] ✅ Review complete in ${duration}ms`, {
      score: (overallScore * 100).toFixed(0) + '%',
      level: qualityLevel,
      suggestions: qualityAnalysis.suggestions.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[SPEC QUALITY AGENT] ❌ Error after ${duration}ms:`, error);
  }
}

/**
 * Analyze spec quality using AI
 */
async function analyzeSpecQuality(
  title: string,
  content: string
): Promise<{
  scores: Record<string, number>;
  suggestions: string[];
}> {
  const prompt = `Review this product spec for quality and completeness.

Title: ${title}

Content:
${content.substring(0, 4000)}

Evaluate the spec on these criteria (score 0-1):
1. Problem Statement - Does it clearly define the problem?
2. User Stories - Are there clear user stories?
3. Acceptance Criteria - Are there specific acceptance criteria?
4. Technical Considerations - Does it address technical details?
5. Success Metrics - Are there measurable success metrics?
6. Timeline - Is there a timeline or phases?
7. Clarity - Is it clear and well-written?
8. Completeness - Is it comprehensive?

Also provide 3-5 specific suggestions for improvement.

Return ONLY a JSON object (no markdown, no extra text):
{
  "scores": {
    "hasProblemStatement": 0.9,
    "hasUserStories": 0.7,
    "hasAcceptanceCriteria": 0.8,
    "hasTechnicalConsiderations": 0.6,
    "hasSuccessMetrics": 0.5,
    "hasTimeline": 0.4,
    "clarity": 0.8,
    "completeness": 0.7
  },
  "suggestions": [
    "Add specific success metrics",
    "Include technical architecture diagram",
    "Define user personas"
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert product manager who reviews spec quality. Be thorough but fair in your assessment.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Validate scores are in 0-1 range
    Object.keys(result.scores || {}).forEach(key => {
      result.scores[key] = Math.max(0, Math.min(1, result.scores[key]));
    });

    return {
      scores: result.scores || {},
      suggestions: result.suggestions || [],
    };
  } catch (error) {
    console.error('[SPEC QUALITY AGENT] AI analysis failed:', error);

    // Return fallback scores
    return {
      scores: {
        hasProblemStatement: 0.5,
        hasUserStories: 0.5,
        hasAcceptanceCriteria: 0.5,
        hasTechnicalConsiderations: 0.5,
        hasSuccessMetrics: 0.5,
        hasTimeline: 0.5,
        clarity: 0.5,
        completeness: 0.5,
      },
      suggestions: ['Unable to analyze - manual review recommended'],
    };
  }
}

/**
 * Calculate weighted overall quality score
 */
function calculateOverallScore(scores: Record<string, number>): number {
  let totalScore = 0;
  let totalWeight = 0;

  Object.entries(QUALITY_CRITERIA).forEach(([key, criteria]) => {
    const score = scores[key] || 0;
    totalScore += score * criteria.weight;
    totalWeight += criteria.weight;
  });

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Add quality improvement suggestions to spec
 */
async function addQualityImprovements(
  specId: string,
  suggestions: string[]
): Promise<void> {
  const supabase = getServiceRoleClient();

  // Add suggestions as comments or notes
  // For now, just log them
  console.log('[SPEC QUALITY AGENT] 💡 Improvement suggestions:', suggestions);

  // In a full implementation, you might:
  // 1. Add suggestions as inline comments in the spec
  // 2. Create a "quality checklist" for the PM
  // 3. Auto-generate improvement sections
}

/**
 * Get spec quality summary for a project
 */
export async function getSpecQualitySummary(projectId: string): Promise<{
  totalSpecs: number;
  excellentSpecs: number;
  goodSpecs: number;
  fairSpecs: number;
  needsImprovementSpecs: number;
  averageQualityScore: number;
}> {
  const supabase = getServiceRoleClient();

  const { data: specs } = await supabase
    .from('specs')
    .select('id, context_sources')
    .eq('project_id', projectId)
    .eq('auto_generated', true);

  if (!specs || specs.length === 0) {
    return {
      totalSpecs: 0,
      excellentSpecs: 0,
      goodSpecs: 0,
      fairSpecs: 0,
      needsImprovementSpecs: 0,
      averageQualityScore: 0,
    };
  }

  let excellentCount = 0;
  let goodCount = 0;
  let fairCount = 0;
  let needsImprovementCount = 0;
  let totalScore = 0;
  let scoredSpecs = 0;

  specs.forEach((spec: any) => {
    const qualityReview = spec.context_sources?.find(
      (source: any) => source.type === 'quality_review'
    );

    if (qualityReview) {
      const score = qualityReview.quality_score || 0;
      totalScore += score;
      scoredSpecs++;

      if (score >= 0.8) excellentCount++;
      else if (score >= 0.6) goodCount++;
      else if (score >= 0.4) fairCount++;
      else needsImprovementCount++;
    }
  });

  return {
    totalSpecs: specs.length,
    excellentSpecs: excellentCount,
    goodSpecs: goodCount,
    fairSpecs: fairCount,
    needsImprovementSpecs: needsImprovementCount,
    averageQualityScore: scoredSpecs > 0 ? totalScore / scoredSpecs : 0,
  };
}
