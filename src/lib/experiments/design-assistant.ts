/**
 * Experiment Design Assistant
 * AI-powered experiment design generator with hypothesis formulation, metrics suggestion, and sample size calculation
 * Part of Phase 3: Stakeholder Management & Experimentation Intelligence
 */

import { getOpenAI } from '@/lib/openai-client';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';

// Initialize OpenAI

// Types
export interface ExperimentDesign {
  hypothesis: string;
  expectedOutcome: string;
  primaryMetric: string;
  secondaryMetrics: string[];
  successCriteria: string;
  controlDescription: string;
  treatmentDescription: string;
  sampleSizeTarget: number;
  minimumDetectableEffect: number;
  estimatedDuration: string;
  risks: string[];
  implementation: string;
  variants?: Array<{ name: string; description: string }>;
}

interface ExperimentContext {
  pastExperiments: string;
  feedbackThemes: string;
  similarFeatures: string;
}

/**
 * Main function to generate experiment design from a feature idea
 */
export async function generateExperimentDesign(
  featureIdea: string,
  projectId: string
): Promise<ExperimentDesign> {
  console.log(`[Experiment Design] Generating design for: "${featureIdea}"`);

  try {
    // 1. Get relevant context
    const context = await getExperimentContext(featureIdea, projectId);

    // 2. Generate design with GPT-4
    const design = await generateDesignWithAI(featureIdea, context);

    // 3. Refine sample size calculation
    design.sampleSizeTarget = calculateSampleSize(
      design.minimumDetectableEffect,
      0.8, // statistical power
      0.05 // alpha (significance level)
    );

    console.log('[Experiment Design] Design generated successfully');
    return design;
  } catch (error) {
    console.error('[Experiment Design] Error generating design:', error);
    throw error;
  }
}

/**
 * Generate experiment design using AI
 */
async function generateDesignWithAI(
  featureIdea: string,
  context: ExperimentContext
): Promise<ExperimentDesign> {
  const prompt = `You are an expert product experimentation specialist. Design a rigorous A/B test for this feature idea:

Feature Idea: ${featureIdea}

Context:
- Past experiments: ${context.pastExperiments}
- Related feedback: ${context.feedbackThemes}
- Similar features: ${context.similarFeatures}

Generate a comprehensive experiment design including:

1. **Hypothesis**: A clear If/Then statement (e.g., "If we add dark mode, then user engagement will increase by 15%")

2. **Expected Outcome**: What specific result you expect to see

3. **Primary Metric**: Single, most important metric to track (e.g., "Daily Active Users", "Conversion Rate", "Time on Page")

4. **Secondary Metrics**: 2-3 supporting metrics that provide additional context

5. **Success Criteria**: Clear definition of what constitutes success (e.g., "Ship if primary metric improves >10% with p<0.05")

6. **Control Description**: Detailed description of the current state (what users see now)

7. **Treatment Description**: Detailed description of the proposed change (what users will see in the experiment)

8. **Minimum Detectable Effect**: Smallest improvement worth detecting (as percentage, e.g., 5%)

9. **Estimated Duration**: How long the experiment should run (e.g., "2 weeks" or "until 10,000 users per variant")

10. **Potential Risks**: List 2-3 potential risks or concerns

11. **Implementation Notes**: High-level technical considerations

Return ONLY a valid JSON object with these exact keys (camelCase):
{
  "hypothesis": "...",
  "expectedOutcome": "...",
  "primaryMetric": "...",
  "secondaryMetrics": ["...", "..."],
  "successCriteria": "...",
  "controlDescription": "...",
  "treatmentDescription": "...",
  "minimumDetectableEffect": 5.0,
  "estimatedDuration": "...",
  "risks": ["...", "..."],
  "implementation": "..."
}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at designing product experiments with statistical rigor. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content || '{}';
    const design = JSON.parse(content);

    // Validate required fields
    const requiredFields = [
      'hypothesis',
      'expectedOutcome',
      'primaryMetric',
      'secondaryMetrics',
      'successCriteria',
      'controlDescription',
      'treatmentDescription',
      'minimumDetectableEffect',
      'estimatedDuration',
      'risks',
      'implementation'
    ];

    for (const field of requiredFields) {
      if (!(field in design)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return {
      ...design,
      sampleSizeTarget: 0, // Will be calculated separately
    };
  } catch (error) {
    console.error('[Experiment Design] Error calling OpenAI:', error);
    throw error;
  }
}

/**
 * Get context for experiment design
 */
async function getExperimentContext(
  featureIdea: string,
  projectId: string
): Promise<ExperimentContext> {
  console.log('[Experiment Design] Gathering context...');

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return {
      pastExperiments: 'None',
      feedbackThemes: 'None',
      similarFeatures: 'None',
    };
  }

  try {
    // Get past experiments (if table exists and has data)
    let pastExperiments = 'None';
    try {
      const { data: experimentsData } = await supabase
        .from('experiments')
        .select('name, hypothesis, status')
        .eq('project_id', projectId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(3);

      if (experimentsData && experimentsData.length > 0) {
        pastExperiments = experimentsData
          .map(e => `- ${e.name}: ${e.hypothesis}`)
          .join('\n');
      }
    } catch (error) {
      console.log('[Experiment Design] Experiments table not available yet');
    }

    // Get related feedback themes
    let feedbackThemes = 'None';
    try {
      const { data: themesData } = await supabase
        .from('themes')
        .select('theme_name, frequency')
        .eq('project_id', projectId)
        .order('frequency', { ascending: false })
        .limit(5);

      if (themesData && themesData.length > 0) {
        feedbackThemes = themesData
          .map(t => `- ${t.theme_name} (${t.frequency} mentions)`)
          .join('\n');
      }
    } catch (error) {
      console.log('[Experiment Design] Could not fetch themes');
    }

    // Get similar roadmap items
    let similarFeatures = 'None';
    try {
      const { data: roadmapData } = await supabase
        .from('roadmap_items')
        .select('title, status')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (roadmapData && roadmapData.length > 0) {
        similarFeatures = roadmapData
          .map(r => `- ${r.title} (${r.status})`)
          .join('\n');
      }
    } catch (error) {
      console.log('[Experiment Design] Could not fetch roadmap items');
    }

    return {
      pastExperiments,
      feedbackThemes,
      similarFeatures,
    };
  } catch (error) {
    console.error('[Experiment Design] Error gathering context:', error);
    return {
      pastExperiments: 'None',
      feedbackThemes: 'None',
      similarFeatures: 'None',
    };
  }
}

/**
 * Calculate required sample size for experiment
 * Based on minimum detectable effect, statistical power, and significance level
 */
export function calculateSampleSize(
  mde: number, // minimum detectable effect (as percentage, e.g., 5 for 5%)
  power: number = 0.8, // probability of detecting true effect (typically 0.8)
  alpha: number = 0.05 // significance level (typically 0.05)
): number {
  // Z-scores for standard normal distribution
  const z_alpha = getZScore(1 - alpha / 2); // Two-tailed test
  const z_beta = getZScore(power);

  // Assumed baseline conversion rate (conservative estimate)
  const p1 = 0.1; // 10% baseline
  const p2 = p1 * (1 + mde / 100);

  // Pooled probability
  const pooled_p = (p1 + p2) / 2;

  // Sample size per variant (formula for two-proportion z-test)
  const n = Math.ceil(
    2 * Math.pow(z_alpha + z_beta, 2) * pooled_p * (1 - pooled_p) / Math.pow(p2 - p1, 2)
  );

  // Return reasonable bounds (min 100, max 1,000,000)
  return Math.max(100, Math.min(1000000, n));
}

/**
 * Get Z-score for given probability
 * Approximation for common values
 */
function getZScore(probability: number): number {
  // Common z-scores
  const zTable: Record<string, number> = {
    '0.50': 0,
    '0.80': 0.84,
    '0.90': 1.28,
    '0.95': 1.645,
    '0.975': 1.96,
    '0.99': 2.33,
    '0.995': 2.576,
  };

  // Find closest match
  const key = Object.keys(zTable).find(k => Math.abs(parseFloat(k) - probability) < 0.01);
  return key ? zTable[key] : 1.96; // Default to 95% if not found
}

/**
 * Save experiment design to database
 */
export async function saveExperimentDesign(
  projectId: string,
  design: ExperimentDesign,
  featureIdea: string,
  createdBy?: string
): Promise<string> {
  console.log('[Experiment Design] Saving design to database...');

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  try {
    const { data, error } = await supabase
      .from('experiments')
      .insert({
        project_id: projectId,
        name: extractExperimentName(design.hypothesis),
        description: `Experiment to test: ${featureIdea}`,
        hypothesis: design.hypothesis,
        expected_outcome: design.expectedOutcome,
        experiment_type: 'ab_test',
        control_description: design.controlDescription,
        treatment_description: design.treatmentDescription,
        primary_metric: design.primaryMetric,
        secondary_metrics: design.secondaryMetrics,
        success_criteria: design.successCriteria,
        sample_size_target: design.sampleSizeTarget,
        minimum_detectable_effect: design.minimumDetectableEffect / 100, // Convert to decimal
        statistical_power: 0.8,
        confidence_level: 0.95,
        status: 'draft',
        ai_generated: true,
        design_prompt: featureIdea,
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('[Experiment Design] Design saved successfully:', data.id);
    return data.id;
  } catch (error) {
    console.error('[Experiment Design] Error saving design:', error);
    throw error;
  }
}

/**
 * Extract a concise experiment name from hypothesis
 */
function extractExperimentName(hypothesis: string): string {
  // Try to extract the main action/feature from hypothesis
  // e.g., "If we add dark mode, then..." -> "Dark Mode Experiment"

  // Remove "If" and "then" parts
  const parts = hypothesis.split(/,?\s+then\s+/i);
  const ifPart = parts[0].replace(/^if\s+/i, '').trim();

  // Take first 50 characters and add "Experiment"
  const name = ifPart.substring(0, 50).trim();

  return name.charAt(0).toUpperCase() + name.slice(1) + ' - Experiment';
}

/**
 * Generate multiple variant experiment (multivariate)
 */
export async function generateMultivariateDesign(
  featureIdea: string,
  variantCount: number,
  projectId: string
): Promise<ExperimentDesign> {
  console.log(`[Experiment Design] Generating ${variantCount}-variant experiment`);

  const context = await getExperimentContext(featureIdea, projectId);

  const prompt = `Design a multivariate experiment with ${variantCount} variants for: ${featureIdea}

Context:
${JSON.stringify(context, null, 2)}

Generate:
1. Hypothesis for testing multiple variants
2. Description of each variant (beyond control)
3. All standard experiment parameters

Return JSON with standard fields PLUS:
{
  ...,
  "variants": [
    { "name": "variant_a", "description": "..." },
    { "name": "variant_b", "description": "..." }
  ]
}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at designing multivariate product experiments. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2500
    });

    const design = JSON.parse(response.choices[0].message.content || '{}');

    // Calculate sample size (needs more samples for multivariate)
    design.sampleSizeTarget = calculateSampleSize(
      design.minimumDetectableEffect,
      0.8,
      0.05
    ) * variantCount; // Multiply by variant count

    return design;
  } catch (error) {
    console.error('[Experiment Design] Error generating multivariate design:', error);
    throw error;
  }
}

/**
 * Validate experiment design before running
 */
export function validateExperimentDesign(design: ExperimentDesign): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!design.hypothesis || design.hypothesis.length < 10) {
    errors.push('Hypothesis must be at least 10 characters');
  }

  if (!design.primaryMetric) {
    errors.push('Primary metric is required');
  }

  if (!design.controlDescription || design.controlDescription.length < 20) {
    errors.push('Control description must be detailed (at least 20 characters)');
  }

  if (!design.treatmentDescription || design.treatmentDescription.length < 20) {
    errors.push('Treatment description must be detailed (at least 20 characters)');
  }

  // Sample size validation
  if (design.sampleSizeTarget < 100) {
    warnings.push('Sample size is very small (<100), results may not be reliable');
  }

  if (design.sampleSizeTarget > 100000) {
    warnings.push('Sample size is very large (>100k), experiment will take a long time');
  }

  // MDE validation
  if (design.minimumDetectableEffect < 1) {
    warnings.push('MDE <1% is very small and will require large sample size');
  }

  if (design.minimumDetectableEffect > 50) {
    warnings.push('MDE >50% is very large, you may be missing smaller important effects');
  }

  // Metrics validation
  if (design.secondaryMetrics.length === 0) {
    warnings.push('No secondary metrics defined - consider adding guardrail metrics');
  }

  if (design.secondaryMetrics.length > 5) {
    warnings.push('Too many secondary metrics (>5) may lead to multiple comparison problems');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
