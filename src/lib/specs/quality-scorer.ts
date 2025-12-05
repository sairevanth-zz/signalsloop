/**
 * Spec Quality Scorer
 * AI-powered quality evaluation and improvement suggestions for specs
 */

import OpenAI from 'openai';
import { TEMPLATES, validateSpecContent } from './templates';
import type { SpecTemplate } from '@/types/specs';

export interface QualityDimension {
  name: string;
  score: number; // 0-100
  weight: number;
  feedback: string;
  improvements: string[];
}

export interface QualityIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  category: string;
  title: string;
  description: string;
  location?: string;
  autoFixAvailable: boolean;
  suggestedFix?: string;
}

export interface SpecQualityResult {
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: QualityDimension[];
  issues: QualityIssue[];
  strengths: string[];
  summary: string;
  readabilityScore: number;
  engineerReadinessScore: number;
  estimatedReworkRisk: 'low' | 'medium' | 'high';
  autoFixableIssues: number;
}

export interface AutoFixResult {
  issueId: string;
  originalContent: string;
  fixedContent: string;
  explanation: string;
}

// Quality dimensions with weights
const QUALITY_DIMENSIONS = [
  { name: 'Completeness', weight: 0.20, key: 'completeness' },
  { name: 'Clarity', weight: 0.20, key: 'clarity' },
  { name: 'Acceptance Criteria', weight: 0.20, key: 'acceptanceCriteria' },
  { name: 'Edge Cases', weight: 0.15, key: 'edgeCases' },
  { name: 'Technical Detail', weight: 0.10, key: 'technicalDetail' },
  { name: 'Success Metrics', weight: 0.15, key: 'successMetrics' },
];

export class SpecQualityScorer {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  /**
   * Evaluate spec quality
   */
  async evaluateSpec(
    specContent: string,
    template: SpecTemplate = 'standard',
    specTitle: string = 'Untitled Spec'
  ): Promise<SpecQualityResult> {
    // First, do basic validation
    const basicValidation = validateSpecContent(specContent, template);
    
    // Then, do AI-powered deep analysis
    const aiAnalysis = await this.aiAnalyzeSpec(specContent, template, specTitle);
    
    // Combine results
    const dimensions = this.calculateDimensions(aiAnalysis, basicValidation);
    const overallScore = this.calculateOverallScore(dimensions);
    const grade = this.scoreToGrade(overallScore);
    const issues = this.extractIssues(aiAnalysis, basicValidation);
    
    return {
      overallScore,
      grade,
      dimensions,
      issues,
      strengths: aiAnalysis.strengths || [],
      summary: aiAnalysis.summary || '',
      readabilityScore: aiAnalysis.readabilityScore || 70,
      engineerReadinessScore: aiAnalysis.engineerReadinessScore || 60,
      estimatedReworkRisk: this.calculateReworkRisk(overallScore, issues),
      autoFixableIssues: issues.filter(i => i.autoFixAvailable).length,
    };
  }
  
  /**
   * AI-powered spec analysis
   */
  private async aiAnalyzeSpec(
    content: string,
    template: SpecTemplate,
    title: string
  ): Promise<any> {
    const templateDef = TEMPLATES[template];
    const requiredSections = templateDef.sections
      .filter(s => s.required)
      .map(s => s.title);
    
    const systemPrompt = `You are an expert product manager and technical writer. Your job is to evaluate the quality of product specifications (PRDs) and provide actionable feedback.

Evaluate the spec based on these criteria:
1. **Completeness** - Are all required sections present and adequately filled?
2. **Clarity** - Is the language clear and unambiguous? Would an engineer understand exactly what to build?
3. **Acceptance Criteria** - Are acceptance criteria specific, measurable, and in proper Given/When/Then format?
4. **Edge Cases** - Are edge cases and error scenarios adequately covered?
5. **Technical Detail** - Is there enough technical context without being overly prescriptive?
6. **Success Metrics** - Are success metrics defined, measurable, and achievable?

Required sections for this template: ${requiredSections.join(', ')}

Return a JSON object with:
{
  "scores": {
    "completeness": 0-100,
    "clarity": 0-100,
    "acceptanceCriteria": 0-100,
    "edgeCases": 0-100,
    "technicalDetail": 0-100,
    "successMetrics": 0-100
  },
  "feedback": {
    "completeness": "brief feedback",
    "clarity": "brief feedback",
    "acceptanceCriteria": "brief feedback",
    "edgeCases": "brief feedback",
    "technicalDetail": "brief feedback",
    "successMetrics": "brief feedback"
  },
  "improvements": {
    "completeness": ["improvement 1", "improvement 2"],
    "clarity": ["improvement 1"],
    "acceptanceCriteria": ["improvement 1", "improvement 2"],
    "edgeCases": ["improvement 1"],
    "technicalDetail": ["improvement 1"],
    "successMetrics": ["improvement 1"]
  },
  "issues": [
    {
      "severity": "critical|major|minor|suggestion",
      "category": "category name",
      "title": "issue title",
      "description": "detailed description",
      "location": "section or line reference",
      "autoFixAvailable": true/false,
      "suggestedFix": "the specific fix if available"
    }
  ],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "summary": "2-3 sentence overall assessment",
  "readabilityScore": 0-100,
  "engineerReadinessScore": 0-100
}`;

    const userPrompt = `Evaluate this spec titled "${title}":

${content}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('[SpecQualityScorer] AI analysis failed:', error);
      // Return default scores on error
      return {
        scores: {
          completeness: 50,
          clarity: 50,
          acceptanceCriteria: 50,
          edgeCases: 50,
          technicalDetail: 50,
          successMetrics: 50,
        },
        feedback: {},
        improvements: {},
        issues: [],
        strengths: [],
        summary: 'Unable to analyze spec at this time.',
        readabilityScore: 50,
        engineerReadinessScore: 50,
      };
    }
  }
  
  /**
   * Calculate dimension scores
   */
  private calculateDimensions(
    aiAnalysis: any,
    basicValidation: any
  ): QualityDimension[] {
    return QUALITY_DIMENSIONS.map(dim => {
      const score = aiAnalysis.scores?.[dim.key] || 50;
      const feedback = aiAnalysis.feedback?.[dim.key] || '';
      const improvements = aiAnalysis.improvements?.[dim.key] || [];
      
      // Penalize for missing required sections
      let adjustedScore = score;
      if (dim.key === 'completeness' && basicValidation.missingRequiredSections.length > 0) {
        const penalty = basicValidation.missingRequiredSections.length * 10;
        adjustedScore = Math.max(0, score - penalty);
      }
      
      return {
        name: dim.name,
        score: adjustedScore,
        weight: dim.weight,
        feedback,
        improvements,
      };
    });
  }
  
  /**
   * Calculate overall score
   */
  private calculateOverallScore(dimensions: QualityDimension[]): number {
    const weightedSum = dimensions.reduce(
      (sum, dim) => sum + dim.score * dim.weight,
      0
    );
    return Math.round(weightedSum);
  }
  
  /**
   * Convert score to letter grade
   */
  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  /**
   * Extract and format issues
   */
  private extractIssues(aiAnalysis: any, basicValidation: any): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // Add issues from AI analysis
    if (aiAnalysis.issues) {
      aiAnalysis.issues.forEach((issue: any, idx: number) => {
        issues.push({
          id: `ai-${idx}`,
          severity: issue.severity || 'minor',
          category: issue.category || 'General',
          title: issue.title || 'Issue',
          description: issue.description || '',
          location: issue.location,
          autoFixAvailable: issue.autoFixAvailable || false,
          suggestedFix: issue.suggestedFix,
        });
      });
    }
    
    // Add issues from basic validation
    basicValidation.missingRequiredSections.forEach((section: string, idx: number) => {
      issues.push({
        id: `missing-${idx}`,
        severity: 'critical',
        category: 'Completeness',
        title: `Missing Required Section: ${section}`,
        description: `The "${section}" section is required but missing from the spec.`,
        autoFixAvailable: true,
        suggestedFix: `Add a "${section}" section with appropriate content.`,
      });
    });
    
    basicValidation.warnings.forEach((warning: string, idx: number) => {
      issues.push({
        id: `warning-${idx}`,
        severity: 'minor',
        category: 'Best Practices',
        title: 'Style Warning',
        description: warning,
        autoFixAvailable: false,
      });
    });
    
    // Sort by severity
    const severityOrder = { critical: 0, major: 1, minor: 2, suggestion: 3 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    return issues;
  }
  
  /**
   * Calculate rework risk
   */
  private calculateReworkRisk(
    score: number,
    issues: QualityIssue[]
  ): 'low' | 'medium' | 'high' {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const majorCount = issues.filter(i => i.severity === 'major').length;
    
    if (criticalCount > 0 || score < 60) return 'high';
    if (majorCount > 2 || score < 75) return 'medium';
    return 'low';
  }
  
  /**
   * Auto-fix an issue in the spec
   */
  async autoFix(
    specContent: string,
    issue: QualityIssue,
    template: SpecTemplate = 'standard'
  ): Promise<AutoFixResult> {
    const systemPrompt = `You are an expert product manager helping to improve a product specification.
Your task is to fix a specific issue in the spec while maintaining the existing structure and style.

Issue to fix:
- Title: ${issue.title}
- Description: ${issue.description}
- Suggested fix: ${issue.suggestedFix || 'Not specified'}
- Location: ${issue.location || 'Not specified'}

Return a JSON object with:
{
  "originalSection": "the original text that needs to be changed (exact match)",
  "fixedSection": "the improved/fixed text",
  "explanation": "brief explanation of what was changed and why"
}

If the fix requires adding a new section, return:
{
  "originalSection": "",
  "fixedSection": "the new section content",
  "insertAfter": "section header to insert after",
  "explanation": "brief explanation"
}`;

    const userPrompt = `Spec content:
${specContent}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      let fixedContent = specContent;
      
      if (result.originalSection) {
        // Replace existing section
        fixedContent = specContent.replace(result.originalSection, result.fixedSection);
      } else if (result.insertAfter) {
        // Insert new section after specified header
        const insertPattern = new RegExp(`(## ${result.insertAfter}[\\s\\S]*?)(\\n## |$)`);
        fixedContent = specContent.replace(insertPattern, `$1\n\n${result.fixedSection}\n\n$2`);
      } else {
        // Append to end
        fixedContent = specContent + '\n\n' + result.fixedSection;
      }
      
      return {
        issueId: issue.id,
        originalContent: specContent,
        fixedContent,
        explanation: result.explanation || 'Issue fixed',
      };
    } catch (error) {
      console.error('[SpecQualityScorer] Auto-fix failed:', error);
      return {
        issueId: issue.id,
        originalContent: specContent,
        fixedContent: specContent,
        explanation: 'Auto-fix failed. Please fix manually.',
      };
    }
  }
  
  /**
   * Generate improvement suggestions
   */
  async generateImprovements(
    specContent: string,
    template: SpecTemplate = 'standard'
  ): Promise<string> {
    const systemPrompt = `You are an expert product manager. Rewrite the following spec to be clearer, more complete, and more actionable.

Maintain the same structure but:
1. Expand on vague sections
2. Add specific acceptance criteria in Given/When/Then format
3. Add edge cases that are missing
4. Make success metrics measurable
5. Clarify any ambiguous language

Return only the improved spec content, no explanations.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: specContent },
        ],
        temperature: 0.4,
      });

      return response.choices[0].message.content || specContent;
    } catch (error) {
      console.error('[SpecQualityScorer] Improvement generation failed:', error);
      return specContent;
    }
  }
}

// Export singleton instance
export const specQualityScorer = new SpecQualityScorer();
