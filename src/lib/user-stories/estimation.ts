/**
 * Story Point Estimation Service
 * Intelligent estimation algorithm based on complexity, uncertainty, and effort
 */

import {
  EstimationFactors,
  StoryPointEstimate,
  UserStory,
  AcceptanceCriterion,
  STORY_POINTS,
  StoryPointValue,
} from '@/types/user-stories';

// Configuration
const FIBONACCI_SCALE = [1, 2, 3, 5, 8, 13, 21] as const;

// Weight factors for different aspects
const WEIGHTS = {
  complexity: 0.35,
  uncertainty: 0.30,
  effort: 0.35,
} as const;

/**
 * Calculate complexity score from various factors
 */
export function calculateComplexityScore(factors: {
  technicalDifficulty?: number; // 0-1
  numberOfComponents?: number;
  algorithmicComplexity?: 'low' | 'medium' | 'high';
  hasExternalDependencies?: boolean;
  requiresNewTechnology?: boolean;
  dataComplexity?: 'low' | 'medium' | 'high';
}): number {
  let score = 0;
  let count = 0;

  // Technical difficulty (0-1)
  if (factors.technicalDifficulty !== undefined) {
    score += factors.technicalDifficulty;
    count++;
  }

  // Number of components affected
  if (factors.numberOfComponents !== undefined) {
    // Normalize: 1 component = 0.2, 2 = 0.4, 3 = 0.6, 4 = 0.8, 5+ = 1.0
    score += Math.min(1.0, factors.numberOfComponents * 0.2);
    count++;
  }

  // Algorithmic complexity
  if (factors.algorithmicComplexity) {
    const algorithmMap = { low: 0.2, medium: 0.6, high: 1.0 };
    score += algorithmMap[factors.algorithmicComplexity];
    count++;
  }

  // External dependencies
  if (factors.hasExternalDependencies !== undefined) {
    score += factors.hasExternalDependencies ? 0.8 : 0.2;
    count++;
  }

  // New technology
  if (factors.requiresNewTechnology !== undefined) {
    score += factors.requiresNewTechnology ? 0.9 : 0.1;
    count++;
  }

  // Data complexity
  if (factors.dataComplexity) {
    const dataMap = { low: 0.2, medium: 0.5, high: 0.9 };
    score += dataMap[factors.dataComplexity];
    count++;
  }

  // Return average if we have factors, otherwise default to 0.5
  return count > 0 ? score / count : 0.5;
}

/**
 * Calculate uncertainty score from various factors
 */
export function calculateUncertaintyScore(factors: {
  requirementsClarity?: 'clear' | 'moderate' | 'unclear';
  designApproved?: boolean;
  hasSimilarPastWork?: boolean;
  numberOfUnknowns?: number;
  stakeholderAlignment?: 'high' | 'medium' | 'low';
  apiDocumentation?: 'complete' | 'partial' | 'missing';
}): number {
  let score = 0;
  let count = 0;

  // Requirements clarity
  if (factors.requirementsClarity) {
    const clarityMap = { clear: 0.1, moderate: 0.5, unclear: 0.9 };
    score += clarityMap[factors.requirementsClarity];
    count++;
  }

  // Design approved
  if (factors.designApproved !== undefined) {
    score += factors.designApproved ? 0.2 : 0.7;
    count++;
  }

  // Similar past work
  if (factors.hasSimilarPastWork !== undefined) {
    score += factors.hasSimilarPastWork ? 0.2 : 0.8;
    count++;
  }

  // Number of unknowns
  if (factors.numberOfUnknowns !== undefined) {
    // 0 unknowns = 0.1, 1 = 0.3, 2 = 0.5, 3 = 0.7, 4+ = 0.9
    score += Math.min(0.9, 0.1 + factors.numberOfUnknowns * 0.2);
    count++;
  }

  // Stakeholder alignment
  if (factors.stakeholderAlignment) {
    const alignmentMap = { high: 0.1, medium: 0.5, low: 0.9 };
    score += alignmentMap[factors.stakeholderAlignment];
    count++;
  }

  // API documentation
  if (factors.apiDocumentation) {
    const docsMap = { complete: 0.1, partial: 0.5, missing: 0.9 };
    score += docsMap[factors.apiDocumentation];
    count++;
  }

  return count > 0 ? score / count : 0.5;
}

/**
 * Calculate effort score from various factors
 */
export function calculateEffortScore(factors: {
  linesOfCodeEstimate?: 'small' | 'medium' | 'large' | 'very_large';
  numberOfFiles?: number;
  testingComplexity?: 'simple' | 'moderate' | 'complex';
  requiresDataMigration?: boolean;
  requiresDocumentation?: boolean;
  uiChanges?: 'none' | 'minor' | 'major';
  apiChanges?: 'none' | 'minor' | 'major';
}): number {
  let score = 0;
  let count = 0;

  // Lines of code estimate
  if (factors.linesOfCodeEstimate) {
    const locMap = { small: 0.2, medium: 0.4, large: 0.7, very_large: 1.0 };
    score += locMap[factors.linesOfCodeEstimate];
    count++;
  }

  // Number of files
  if (factors.numberOfFiles !== undefined) {
    // 1-2 files = 0.2, 3-5 = 0.4, 6-10 = 0.6, 11-20 = 0.8, 20+ = 1.0
    if (factors.numberOfFiles <= 2) score += 0.2;
    else if (factors.numberOfFiles <= 5) score += 0.4;
    else if (factors.numberOfFiles <= 10) score += 0.6;
    else if (factors.numberOfFiles <= 20) score += 0.8;
    else score += 1.0;
    count++;
  }

  // Testing complexity
  if (factors.testingComplexity) {
    const testMap = { simple: 0.2, moderate: 0.5, complex: 0.9 };
    score += testMap[factors.testingComplexity];
    count++;
  }

  // Data migration
  if (factors.requiresDataMigration !== undefined) {
    score += factors.requiresDataMigration ? 0.8 : 0.1;
    count++;
  }

  // Documentation
  if (factors.requiresDocumentation !== undefined) {
    score += factors.requiresDocumentation ? 0.6 : 0.2;
    count++;
  }

  // UI changes
  if (factors.uiChanges) {
    const uiMap = { none: 0.1, minor: 0.4, major: 0.8 };
    score += uiMap[factors.uiChanges];
    count++;
  }

  // API changes
  if (factors.apiChanges) {
    const apiMap = { none: 0.1, minor: 0.5, major: 0.9 };
    score += apiMap[factors.apiChanges];
    count++;
  }

  return count > 0 ? score / count : 0.5;
}

/**
 * Calculate overall weighted score from complexity, uncertainty, and effort
 */
export function calculateWeightedScore(
  complexity: number,
  uncertainty: number,
  effort: number
): number {
  return (
    complexity * WEIGHTS.complexity +
    uncertainty * WEIGHTS.uncertainty +
    effort * WEIGHTS.effort
  );
}

/**
 * Map weighted score to Fibonacci story points
 */
export function scoreToStoryPoints(weightedScore: number): StoryPointValue {
  // Map 0-1 score to Fibonacci values
  // 0.0-0.14: 1 point  (very simple)
  // 0.15-0.28: 2 points (simple)
  // 0.29-0.42: 3 points (small)
  // 0.43-0.57: 5 points (medium)
  // 0.58-0.71: 8 points (large)
  // 0.72-0.85: 13 points (very large)
  // 0.86-1.0: 21 points (epic)

  if (weightedScore < 0.15) return 1;
  if (weightedScore < 0.29) return 2;
  if (weightedScore < 0.43) return 3;
  if (weightedScore < 0.58) return 5;
  if (weightedScore < 0.72) return 8;
  if (weightedScore < 0.86) return 13;
  return 21;
}

/**
 * Estimate story points from factors
 */
export function estimateStoryPoints(factors: EstimationFactors): StoryPointEstimate {
  const complexity = factors.complexity;
  const uncertainty = factors.uncertainty;
  const effort = factors.effort;

  const weightedScore = calculateWeightedScore(complexity, uncertainty, effort);
  const storyPoints = scoreToStoryPoints(weightedScore);

  // Calculate confidence based on how well-defined the factors are
  const confidence = calculateEstimationConfidence(factors);

  // Generate reasoning
  const reasoning = generateEstimationReasoning(
    storyPoints,
    complexity,
    uncertainty,
    effort,
    factors
  );

  // Generate alternative estimates
  const alternatives = generateAlternativeEstimates(weightedScore, factors);

  return {
    story_points: storyPoints,
    confidence,
    factors: {
      complexity,
      uncertainty,
      effort,
      dependencies: factors.dependencies,
      risks: factors.risks,
    },
    reasoning,
    alternative_estimates: alternatives,
  };
}

/**
 * Calculate confidence in the estimation
 */
function calculateEstimationConfidence(factors: EstimationFactors): number {
  // Higher confidence when:
  // - Uncertainty is low
  // - Dependencies are known
  // - Risks are identified

  let confidence = 0.7; // Base confidence

  // Adjust based on uncertainty
  confidence -= factors.uncertainty * 0.3;

  // Boost if dependencies are defined
  if (factors.dependencies && factors.dependencies.length > 0) {
    confidence += 0.1;
  }

  // Boost if risks are identified
  if (factors.risks && factors.risks.length > 0) {
    confidence += 0.1;
  }

  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Generate human-readable estimation reasoning
 */
function generateEstimationReasoning(
  storyPoints: number,
  complexity: number,
  uncertainty: number,
  effort: number,
  factors: EstimationFactors
): string {
  const parts: string[] = [];

  // Overall estimate
  parts.push(`Estimated at ${storyPoints} story points.`);

  // Complexity
  if (complexity < 0.3) {
    parts.push('Low technical complexity - straightforward implementation.');
  } else if (complexity < 0.7) {
    parts.push('Moderate complexity - requires careful design and implementation.');
  } else {
    parts.push('High complexity - involves complex algorithms, architecture, or integrations.');
  }

  // Uncertainty
  if (uncertainty < 0.3) {
    parts.push('Requirements are clear with minimal unknowns.');
  } else if (uncertainty < 0.7) {
    parts.push('Some uncertainty exists - may require clarification during implementation.');
  } else {
    parts.push('Significant uncertainty - requirements need refinement before starting work.');
  }

  // Effort
  if (effort < 0.3) {
    parts.push('Minimal development effort required.');
  } else if (effort < 0.7) {
    parts.push('Moderate development effort across multiple components.');
  } else {
    parts.push('Substantial development effort - touches many parts of the system.');
  }

  // Dependencies
  if (factors.dependencies && factors.dependencies.length > 0) {
    parts.push(`Dependencies: ${factors.dependencies.join(', ')}.`);
  }

  // Risks
  if (factors.risks && factors.risks.length > 0) {
    parts.push(`Risks to consider: ${factors.risks.join(', ')}.`);
  }

  return parts.join(' ');
}

/**
 * Generate alternative estimates for different scenarios
 */
function generateAlternativeEstimates(
  weightedScore: number,
  factors: EstimationFactors
): Array<{ points: number; scenario: string }> {
  const alternatives: Array<{ points: number; scenario: string }> = [];

  // Best case scenario (lower uncertainty and complexity)
  const bestCaseScore = weightedScore * 0.7;
  alternatives.push({
    points: scoreToStoryPoints(bestCaseScore),
    scenario: 'Best case: All unknowns resolved quickly, no blockers',
  });

  // Worst case scenario (higher uncertainty and complexity)
  const worstCaseScore = Math.min(1.0, weightedScore * 1.4);
  alternatives.push({
    points: scoreToStoryPoints(worstCaseScore),
    scenario: 'Worst case: Unexpected complexity, dependencies delay work',
  });

  // If there are significant risks, add risk scenario
  if (factors.risks && factors.risks.length > 2) {
    const riskScore = Math.min(1.0, weightedScore * 1.6);
    alternatives.push({
      points: scoreToStoryPoints(riskScore),
      scenario: 'Risk scenario: Multiple risks materialize, requires rework',
    });
  }

  return alternatives;
}

/**
 * Estimate from user story content
 * Analyzes the story to automatically determine estimation factors
 */
export function estimateFromUserStory(story: {
  title: string;
  full_story: string;
  acceptance_criteria: AcceptanceCriterion[];
  technical_notes?: string;
}): StoryPointEstimate {
  // Analyze story content to derive factors
  const complexity = analyzeComplexityFromContent(
    story.title,
    story.full_story,
    story.technical_notes
  );

  const uncertainty = analyzeUncertaintyFromContent(
    story.acceptance_criteria,
    story.technical_notes
  );

  const effort = analyzeEffortFromContent(
    story.acceptance_criteria,
    story.technical_notes
  );

  // Extract dependencies and risks from technical notes
  const dependencies = extractDependencies(story.technical_notes);
  const risks = extractRisks(story.technical_notes);

  return estimateStoryPoints({
    complexity,
    uncertainty,
    effort,
    dependencies,
    risks,
  });
}

/**
 * Analyze complexity from story content
 */
function analyzeComplexityFromContent(
  title: string,
  story: string,
  technicalNotes?: string
): number {
  let score = 0.5; // Start with medium

  const text = `${title} ${story} ${technicalNotes || ''}`.toLowerCase();

  // Complexity indicators (increase score)
  const complexityKeywords = [
    'algorithm', 'performance', 'optimization', 'complex', 'integration',
    'authentication', 'authorization', 'security', 'encryption', 'migration',
    'refactor', 'architecture', 'scalability', 'realtime', 'websocket',
  ];

  // Simplicity indicators (decrease score)
  const simplicityKeywords = [
    'simple', 'basic', 'straightforward', 'minor', 'small', 'quick',
    'text', 'label', 'color', 'copy', 'rename',
  ];

  // Count matches
  const complexMatches = complexityKeywords.filter(kw => text.includes(kw)).length;
  const simpleMatches = simplicityKeywords.filter(kw => text.includes(kw)).length;

  // Adjust score
  score += complexMatches * 0.1;
  score -= simpleMatches * 0.1;

  // Bound between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Analyze uncertainty from story content
 */
function analyzeUncertaintyFromContent(
  acceptanceCriteria: AcceptanceCriterion[],
  technicalNotes?: string
): number {
  let score = 0.5; // Start with medium

  // More acceptance criteria = lower uncertainty (better defined)
  if (acceptanceCriteria.length >= 5) {
    score -= 0.2;
  } else if (acceptanceCriteria.length <= 2) {
    score += 0.2;
  }

  // Check for uncertainty keywords in technical notes
  if (technicalNotes) {
    const uncertaintyKeywords = [
      'unclear', 'unknown', 'tbd', 'to be determined', 'investigate',
      'research', 'explore', 'unsure', 'maybe', 'possibly',
    ];

    const clarityKeywords = [
      'clear', 'defined', 'specified', 'documented', 'approved',
      'confirmed', 'established',
    ];

    const text = technicalNotes.toLowerCase();
    const uncertainMatches = uncertaintyKeywords.filter(kw => text.includes(kw)).length;
    const clarityMatches = clarityKeywords.filter(kw => text.includes(kw)).length;

    score += uncertainMatches * 0.15;
    score -= clarityMatches * 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Analyze effort from story content
 */
function analyzeEffortFromContent(
  acceptanceCriteria: AcceptanceCriterion[],
  technicalNotes?: string
): number {
  let score = 0.5; // Start with medium

  // More acceptance criteria = more effort
  if (acceptanceCriteria.length >= 6) {
    score += 0.2;
  } else if (acceptanceCriteria.length <= 2) {
    score -= 0.1;
  }

  // Check for effort indicators in technical notes
  if (technicalNotes) {
    const highEffortKeywords = [
      'multiple', 'many', 'extensive', 'comprehensive', 'full',
      'database', 'migration', 'testing', 'documentation',
    ];

    const lowEffortKeywords = [
      'single', 'one', 'minimal', 'quick', 'small change',
    ];

    const text = technicalNotes.toLowerCase();
    const highMatches = highEffortKeywords.filter(kw => text.includes(kw)).length;
    const lowMatches = lowEffortKeywords.filter(kw => text.includes(kw)).length;

    score += highMatches * 0.1;
    score -= lowMatches * 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Extract dependencies from technical notes
 */
function extractDependencies(technicalNotes?: string): string[] {
  if (!technicalNotes) return [];

  const dependencies: string[] = [];
  const text = technicalNotes.toLowerCase();

  // Look for dependency patterns
  const patterns = [
    /depends on ([^.,\n]+)/gi,
    /requires ([^.,\n]+)/gi,
    /blocked by ([^.,\n]+)/gi,
    /needs ([^.,\n]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        dependencies.push(match[1].trim());
      }
    }
  }

  return [...new Set(dependencies)]; // Remove duplicates
}

/**
 * Extract risks from technical notes
 */
function extractRisks(technicalNotes?: string): string[] {
  if (!technicalNotes) return [];

  const risks: string[] = [];
  const text = technicalNotes.toLowerCase();

  // Look for risk patterns
  const patterns = [
    /risk: ([^.,\n]+)/gi,
    /concern: ([^.,\n]+)/gi,
    /potential issue: ([^.,\n]+)/gi,
    /may ([^.,\n]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        risks.push(match[1].trim());
      }
    }
  }

  return [...new Set(risks)]; // Remove duplicates
}

/**
 * Re-estimate story points based on actual completion time
 * Useful for improving estimation accuracy over time
 */
export function recalibrateEstimate(
  originalEstimate: number,
  actualPoints: number,
  factors: EstimationFactors
): {
  suggestedEstimate: number;
  learnings: string[];
} {
  const learnings: string[] = [];

  // Calculate variance
  const variance = actualPoints - originalEstimate;
  const variancePercent = (variance / originalEstimate) * 100;

  if (Math.abs(variancePercent) > 40) {
    learnings.push(
      `Significant variance: ${variancePercent.toFixed(0)}% ${variance > 0 ? 'over' : 'under'} estimate`
    );

    if (variance > 0) {
      // Over-estimated (took longer than expected)
      if (factors.complexity < 0.5) {
        learnings.push('Complexity was higher than initially assessed');
      }
      if (factors.uncertainty < 0.5) {
        learnings.push('More unknowns encountered than expected');
      }
    } else {
      // Under-estimated (took less time)
      if (factors.complexity > 0.5) {
        learnings.push('Implementation was simpler than anticipated');
      }
    }
  }

  // Suggest adjusted estimate
  const suggestedEstimate = scoreToStoryPoints(
    calculateWeightedScore(
      Math.min(1, factors.complexity + variance * 0.1),
      factors.uncertainty,
      factors.effort
    )
  );

  return {
    suggestedEstimate,
    learnings,
  };
}
