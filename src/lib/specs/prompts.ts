/**
 * AI Prompts for Spec Generation
 */

import type {
  FeedbackContext,
  PastSpecContext,
  PersonaContext,
  CompetitorContext,
  SpecTemplate,
  FeedbackSynthesis,
} from '@/types/specs';

// ============================================================================
// System Prompts
// ============================================================================

export const SPEC_GENERATION_SYSTEM_PROMPT = `You are an expert Product Manager AI assistant specializing in writing comprehensive Product Requirements Documents (PRDs).

Your task is to transform a feature idea into a detailed, actionable PRD that engineering teams can immediately work from.

## Your Capabilities:
- Synthesize user feedback into clear problem statements
- Write user stories in standard format (As a... I want... So that...)
- Define precise acceptance criteria using Given/When/Then format
- Identify edge cases and error scenarios
- Suggest measurable success metrics
- Consider technical implications and constraints

## Your Style:
- Be specific and actionable, not vague
- Use bullet points and tables for clarity
- Include concrete examples where helpful
- Write for an audience of engineers and designers
- Maintain a professional but approachable tone
- Focus on the "why" as much as the "what"

## Output Format:
Always output valid Markdown following the provided template structure.
Be thorough but concise. Aim for clarity and completeness.`;

// ============================================================================
// Template-Based Prompts
// ============================================================================

export function getSpecGenerationPrompt(params: {
  idea: string;
  template: SpecTemplate;
  feedback?: FeedbackContext[];
  pastSpecs?: PastSpecContext[];
  personas?: PersonaContext[];
  competitors?: CompetitorContext[];
  customContext?: string;
}): string {
  const { idea, template, feedback, pastSpecs, personas, competitors, customContext } = params;

  let prompt = `# Feature Idea\n${idea}\n\n`;

  prompt += `# Template to Use\n${getTemplateStructure(template)}\n\n`;

  if (feedback && feedback.length > 0) {
    prompt += `# User Feedback to Address\n`;
    prompt += `${feedback
      .map(
        (f) =>
          `- "${f.content}" (${f.votes} votes${f.segment ? `, ${f.segment} segment` : ''})`
      )
      .join('\n')}\n\n`;
  }

  if (pastSpecs && pastSpecs.length > 0) {
    prompt += `# Similar Past Specs (for reference)\n`;
    prompt += `${pastSpecs
      .map((s) => `## ${s.title}\n${s.preview}...\n(Relevance: ${(s.relevanceScore * 100).toFixed(0)}%)`)
      .join('\n\n')}\n\n`;
  }

  if (personas && personas.length > 0) {
    prompt += `# Target User Personas\n`;
    prompt += `${personas.map((p) => `- **${p.name}**: ${p.description}`).join('\n')}\n\n`;
  }

  if (competitors && competitors.length > 0) {
    prompt += `# Competitive Context\n`;
    prompt += `${competitors
      .map((c) => `- **${c.name}** - ${c.feature}: ${c.description}`)
      .join('\n')}\n\n`;
  }

  if (customContext) {
    prompt += `# Additional Context\n${customContext}\n\n`;
  }

  prompt += `# Instructions\n`;
  prompt += `Now generate a complete PRD following the ${getTemplateInfo(template).name} template structure.\n`;
  prompt += `Be specific, actionable, and thorough. Include concrete examples where appropriate.\n`;
  prompt += `Make sure to:\n`;
  prompt += `- Write clear problem statements that explain the "why"\n`;
  prompt += `- Create user stories for each persona mentioned\n`;
  prompt += `- Define testable acceptance criteria using Given/When/Then\n`;
  prompt += `- Identify edge cases and error scenarios\n`;
  prompt += `- Suggest measurable success metrics\n`;
  prompt += `- Consider technical constraints and dependencies\n`;

  return prompt;
}

function getTemplateStructure(template: SpecTemplate): string {
  switch (template) {
    case 'standard':
      return `Standard PRD Template with sections:
1. Problem Statement
2. User Stories
3. Acceptance Criteria (Must Have, Should Have, Nice to Have)
4. Edge Cases & Error Handling
5. Technical Considerations
6. Success Metrics
7. Out of Scope
8. Open Questions
9. Appendix (Linked Feedback, Competitive Analysis, Context Sources)`;

    case 'feature-launch':
      return `Feature Launch Template with sections:
1. Executive Summary
2. Problem Statement & Opportunity
3. Target Users & Personas
4. User Stories
5. Feature Requirements
6. User Experience Flow
7. Acceptance Criteria
8. Technical Architecture
9. Launch Plan & Rollout Strategy
10. Success Metrics & KPIs
11. Risk Assessment
12. Timeline & Milestones`;

    case 'bug-fix':
      return `Bug Fix Template with sections:
1. Bug Description
2. Impact Analysis
3. Root Cause
4. Reproduction Steps
5. Proposed Solution
6. Acceptance Criteria
7. Testing Strategy
8. Regression Risk
9. Success Metrics`;

    case 'api-spec':
      return `API Specification Template with sections:
1. API Overview
2. Use Cases
3. Endpoints
4. Request/Response Formats
5. Authentication & Authorization
6. Error Handling
7. Rate Limiting
8. Versioning Strategy
9. Documentation Requirements
10. Success Metrics`;
  }
}

function getTemplateInfo(template: SpecTemplate): { name: string } {
  switch (template) {
    case 'standard':
      return { name: 'Standard PRD' };
    case 'feature-launch':
      return { name: 'Feature Launch' };
    case 'bug-fix':
      return { name: 'Bug Fix' };
    case 'api-spec':
      return { name: 'API Specification' };
  }
}

// ============================================================================
// Feedback Synthesis Prompt
// ============================================================================

export function getFeedbackSynthesisPrompt(
  feedbackItems: Array<{ id: string; content: string; votes: number }>
): string {
  return `Analyze these feedback items and synthesize them into a cohesive feature idea.

## Feedback Items
${feedbackItems.map((f, i) => `${i + 1}. "${f.content}" (${f.votes} votes)`).join('\n')}

## Your Task
Provide a JSON response with the following structure:
{
  "suggestedTitle": "string - A concise title for the feature (max 100 chars)",
  "commonTheme": "string - The common theme or pattern across feedback",
  "userSegments": ["string"] - Array of user segments represented (e.g., "enterprise", "mobile users"),
  "priorityScore": number - Priority from 1-10 based on vote count and urgency,
  "synthesizedProblem": "string - A clear problem statement synthesizing all feedback"
}

Be specific and actionable. The synthesizedProblem should clearly articulate what users need and why.`;
}

// ============================================================================
// Section Expansion Prompt
// ============================================================================

export function getExpandSectionPrompt(
  sectionName: string,
  currentContent: string,
  fullSpecContext: string
): string {
  return `You are helping expand a section of a PRD.

## Section to Expand
${sectionName}

## Current Content
${currentContent}

## Full Spec Context (for reference)
${fullSpecContext}

## Your Task
Expand this section with more detail, examples, or additional items as appropriate.
Maintain the same style and format as the rest of the document.
Be specific and actionable.`;
}

// ============================================================================
// AI Quick Action Prompts
// ============================================================================

export function getAddUserStoriesPrompt(currentSpec: string, personas?: PersonaContext[]): string {
  return `Add more user stories to this PRD based on the content and personas mentioned.

## Current PRD
${currentSpec}

${personas && personas.length > 0 ? `## Available Personas\n${personas.map((p) => `- **${p.name}**: ${p.description}`).join('\n')}\n` : ''}

## Your Task
Generate 2-3 additional user stories in the format:
- As a **[persona]**, I want **[action]** so that **[benefit]**.

Make sure they are relevant to the feature and not duplicates of existing stories.`;
}

export function getAddAcceptanceCriteriaPrompt(currentSpec: string): string {
  return `Add more acceptance criteria to this PRD.

## Current PRD
${currentSpec}

## Your Task
Generate 3-5 additional acceptance criteria in the format:
- Given **[context]**, when **[action]**, then **[expected result]**

Focus on edge cases and scenarios not yet covered in the existing criteria.`;
}

export function getAddTechnicalNotesPrompt(currentSpec: string): string {
  return `Add technical considerations to this PRD.

## Current PRD
${currentSpec}

## Your Task
Generate a list of technical notes covering:
- Dependencies and integrations
- Performance considerations
- Security implications
- Scalability concerns
- Infrastructure requirements

Be specific and actionable.`;
}

export function getSuggestMetricsPrompt(currentSpec: string): string {
  return `Suggest success metrics for this PRD.

## Current PRD
${currentSpec}

## Your Task
Generate a table of success metrics in this format:

| Metric | Current (Baseline) | Target | Measurement Method |
|--------|-------------------|--------|-------------------|
| [metric 1] | [baseline value] | [target value] | [how to measure] |
| [metric 2] | [baseline value] | [target value] | [how to measure] |

Include both quantitative (e.g., usage, performance) and qualitative (e.g., satisfaction) metrics.`;
}

export function getRegenerateSectionPrompt(
  sectionName: string,
  currentContent: string,
  fullSpecContext: string,
  userFeedback?: string
): string {
  return `Regenerate a section of this PRD.

## Section to Regenerate
${sectionName}

## Current Content (for reference)
${currentContent}

## Full Spec Context
${fullSpecContext}

${userFeedback ? `## User Feedback\n${userFeedback}\n` : ''}

## Your Task
Completely rewrite this section to improve clarity, completeness, and actionability.
${userFeedback ? 'Take into account the user feedback provided.' : ''}
Maintain consistency with the rest of the document.`;
}

// ============================================================================
// Context Retrieval Query Generation
// ============================================================================

export function getContextQueryFromIdea(idea: string): string {
  // For vector search, we want to expand the idea slightly for better retrieval
  return `${idea}

Related concepts: feature requirements, user needs, product specification`;
}

export function getContextQueryFromFeedback(
  synthesis: FeedbackSynthesis
): string {
  return `${synthesis.suggestedTitle}

Problem: ${synthesis.synthesizedProblem}
Theme: ${synthesis.commonTheme}
User segments: ${synthesis.userSegments.join(', ')}`;
}
