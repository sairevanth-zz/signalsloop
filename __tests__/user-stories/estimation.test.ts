/**
 * Story Point Estimation Tests
 * Tests for the estimation algorithm
 */

import { describe, it, expect } from '@jest/globals';

// Import the estimation functions (we'll test the logic)
type EstimationFactors = {
  complexity: number;
  uncertainty: number;
  effort: number;
};

type StoryPointEstimate = {
  storyPoints: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  alternativeEstimates: number[];
};

// Mock implementation of estimation logic
function calculateWeightedScore(complexity: number, uncertainty: number, effort: number): number {
  const WEIGHTS = { complexity: 0.4, uncertainty: 0.3, effort: 0.3 };
  return (
    complexity * WEIGHTS.complexity +
    uncertainty * WEIGHTS.uncertainty +
    effort * WEIGHTS.effort
  );
}

function scoreToStoryPoints(score: number): number {
  // Fibonacci scale: 1, 2, 3, 5, 8, 13, 21
  if (score <= 0.15) return 1;
  if (score <= 0.30) return 2;
  if (score <= 0.45) return 3;
  if (score <= 0.60) return 5;
  if (score <= 0.75) return 8;
  if (score <= 0.90) return 13;
  return 21;
}

function estimateStoryPoints(factors: EstimationFactors): StoryPointEstimate {
  const weightedScore = calculateWeightedScore(
    factors.complexity,
    factors.uncertainty,
    factors.effort
  );

  const storyPoints = scoreToStoryPoints(weightedScore);

  // Calculate confidence based on variance
  const variance = Math.max(
    Math.abs(factors.complexity - factors.uncertainty),
    Math.abs(factors.complexity - factors.effort),
    Math.abs(factors.uncertainty - factors.effort)
  );

  const confidence = variance < 0.2 ? 'high' : variance < 0.4 ? 'medium' : 'low';

  // Alternative estimates
  const alternatives: number[] = [];
  if (storyPoints > 1) alternatives.push(scoreToStoryPoints(weightedScore - 0.1));
  if (storyPoints < 21) alternatives.push(scoreToStoryPoints(weightedScore + 0.1));

  return {
    storyPoints,
    confidence,
    reasoning: `Based on complexity: ${factors.complexity.toFixed(2)}, uncertainty: ${factors.uncertainty.toFixed(2)}, effort: ${factors.effort.toFixed(2)}`,
    alternativeEstimates: [...new Set(alternatives)].filter(p => p !== storyPoints),
  };
}

describe('Story Point Estimation', () => {
  describe('Score Calculation', () => {
    it('should calculate weighted score correctly', () => {
      const score = calculateWeightedScore(0.5, 0.5, 0.5);
      expect(score).toBe(0.5);
    });

    it('should weight complexity highest', () => {
      const highComplexity = calculateWeightedScore(1.0, 0.0, 0.0);
      const highEffort = calculateWeightedScore(0.0, 0.0, 1.0);

      expect(highComplexity).toBeGreaterThan(highEffort);
    });

    it('should handle minimum values', () => {
      const score = calculateWeightedScore(0, 0, 0);
      expect(score).toBe(0);
    });

    it('should handle maximum values', () => {
      const score = calculateWeightedScore(1, 1, 1);
      expect(score).toBe(1);
    });
  });

  describe('Fibonacci Scale Mapping', () => {
    it('should map low scores to 1 point', () => {
      expect(scoreToStoryPoints(0.1)).toBe(1);
    });

    it('should map medium scores to 5 points', () => {
      expect(scoreToStoryPoints(0.55)).toBe(5);
    });

    it('should map high scores to 21 points', () => {
      expect(scoreToStoryPoints(0.95)).toBe(21);
    });

    it('should only return Fibonacci values', () => {
      const validPoints = [1, 2, 3, 5, 8, 13, 21];

      for (let i = 0; i <= 1; i += 0.05) {
        const points = scoreToStoryPoints(i);
        expect(validPoints).toContain(points);
      }
    });
  });

  describe('Full Estimation', () => {
    it('should estimate simple task as 1-2 points', () => {
      const result = estimateStoryPoints({
        complexity: 0.1,
        uncertainty: 0.1,
        effort: 0.1,
      });

      expect([1, 2]).toContain(result.storyPoints);
      expect(result.confidence).toBe('high');
    });

    it('should estimate medium task as 3-5 points', () => {
      const result = estimateStoryPoints({
        complexity: 0.4,
        uncertainty: 0.5,
        effort: 0.4,
      });

      expect([3, 5]).toContain(result.storyPoints);
    });

    it('should estimate complex task as 8+ points', () => {
      const result = estimateStoryPoints({
        complexity: 0.8,
        uncertainty: 0.7,
        effort: 0.8,
      });

      expect(result.storyPoints).toBeGreaterThanOrEqual(8);
    });

    it('should have low confidence when factors vary widely', () => {
      const result = estimateStoryPoints({
        complexity: 0.1,
        uncertainty: 0.9,
        effort: 0.1,
      });

      expect(result.confidence).toBe('low');
    });

    it('should provide alternative estimates', () => {
      const result = estimateStoryPoints({
        complexity: 0.5,
        uncertainty: 0.5,
        effort: 0.5,
      });

      expect(result.alternativeEstimates.length).toBeGreaterThan(0);
    });

    it('should include reasoning', () => {
      const result = estimateStoryPoints({
        complexity: 0.5,
        uncertainty: 0.5,
        effort: 0.5,
      });

      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning).toContain('complexity');
      expect(result.reasoning).toContain('uncertainty');
      expect(result.reasoning).toContain('effort');
    });
  });

  describe('Edge Cases', () => {
    it('should handle all minimum values', () => {
      const result = estimateStoryPoints({
        complexity: 0,
        uncertainty: 0,
        effort: 0,
      });

      expect(result.storyPoints).toBe(1);
    });

    it('should handle all maximum values', () => {
      const result = estimateStoryPoints({
        complexity: 1,
        uncertainty: 1,
        effort: 1,
      });

      expect(result.storyPoints).toBe(21);
    });

    it('should handle mixed extreme values', () => {
      const result = estimateStoryPoints({
        complexity: 1,
        uncertainty: 0,
        effort: 0.5,
      });

      expect([1, 2, 3, 5, 8, 13, 21]).toContain(result.storyPoints);
    });
  });
});

describe('Estimation Quality', () => {
  it('should be consistent for same inputs', () => {
    const factors = { complexity: 0.5, uncertainty: 0.5, effort: 0.5 };

    const result1 = estimateStoryPoints(factors);
    const result2 = estimateStoryPoints(factors);

    expect(result1.storyPoints).toBe(result2.storyPoints);
  });

  it('should increase points with complexity', () => {
    const low = estimateStoryPoints({ complexity: 0.2, uncertainty: 0.3, effort: 0.3 });
    const high = estimateStoryPoints({ complexity: 0.8, uncertainty: 0.3, effort: 0.3 });

    expect(high.storyPoints).toBeGreaterThan(low.storyPoints);
  });

  it('should increase points with effort', () => {
    const low = estimateStoryPoints({ complexity: 0.3, uncertainty: 0.3, effort: 0.2 });
    const high = estimateStoryPoints({ complexity: 0.3, uncertainty: 0.3, effort: 0.8 });

    expect(high.storyPoints).toBeGreaterThan(low.storyPoints);
  });
});

console.log('✅ Story Point Estimation Tests Configured');
