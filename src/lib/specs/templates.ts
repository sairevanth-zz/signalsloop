/**
 * PRD Templates
 */

import type { PRDTemplate, SpecTemplate } from '@/types/specs';

// ============================================================================
// Template Definitions
// ============================================================================

export const TEMPLATES: Record<SpecTemplate, PRDTemplate> = {
  standard: {
    id: 'standard',
    name: 'Standard PRD',
    description: 'Comprehensive product requirements document for features and enhancements',
    estimatedTimeMinutes: 2,
    sections: [
      {
        id: 'problem_statement',
        title: 'Problem Statement',
        placeholder: 'Describe the problem this feature solves and why it matters...',
        required: true,
        order: 1,
      },
      {
        id: 'user_stories',
        title: 'User Stories',
        placeholder: 'As a [persona], I want [action] so that [benefit]...',
        required: true,
        order: 2,
      },
      {
        id: 'acceptance_criteria',
        title: 'Acceptance Criteria',
        placeholder:
          'Must Have (P0), Should Have (P1), Nice to Have (P2) - Given/When/Then format...',
        required: true,
        order: 3,
      },
      {
        id: 'edge_cases',
        title: 'Edge Cases & Error Handling',
        placeholder: 'Identify potential edge cases and how to handle them...',
        required: false,
        order: 4,
      },
      {
        id: 'technical_considerations',
        title: 'Technical Considerations',
        placeholder: 'Dependencies, constraints, performance, security...',
        required: false,
        order: 5,
      },
      {
        id: 'success_metrics',
        title: 'Success Metrics',
        placeholder: 'How will we measure success? What are the KPIs?',
        required: true,
        order: 6,
      },
      {
        id: 'out_of_scope',
        title: 'Out of Scope',
        placeholder: 'What are we NOT building in this iteration?',
        required: false,
        order: 7,
      },
      {
        id: 'open_questions',
        title: 'Open Questions',
        placeholder: 'Questions that need to be resolved before implementation...',
        required: false,
        order: 8,
      },
      {
        id: 'appendix',
        title: 'Appendix',
        placeholder: 'Linked feedback, competitive analysis, context sources...',
        required: false,
        order: 9,
      },
    ],
  },

  'feature-launch': {
    id: 'feature-launch',
    name: 'Feature Launch',
    description: 'Detailed specification for major feature launches with go-to-market planning',
    estimatedTimeMinutes: 3,
    sections: [
      {
        id: 'executive_summary',
        title: 'Executive Summary',
        placeholder: 'Brief overview of the feature, value proposition, and impact...',
        required: true,
        order: 1,
      },
      {
        id: 'problem_opportunity',
        title: 'Problem Statement & Opportunity',
        placeholder: 'What problem are we solving? What opportunity are we capturing?',
        required: true,
        order: 2,
      },
      {
        id: 'target_users',
        title: 'Target Users & Personas',
        placeholder: 'Who is this feature for? Describe user segments and personas...',
        required: true,
        order: 3,
      },
      {
        id: 'user_stories',
        title: 'User Stories',
        placeholder: 'As a [persona], I want [action] so that [benefit]...',
        required: true,
        order: 4,
      },
      {
        id: 'feature_requirements',
        title: 'Feature Requirements',
        placeholder: 'Detailed requirements for the feature...',
        required: true,
        order: 5,
      },
      {
        id: 'user_experience',
        title: 'User Experience Flow',
        placeholder: 'Describe the user journey and key interactions...',
        required: true,
        order: 6,
      },
      {
        id: 'acceptance_criteria',
        title: 'Acceptance Criteria',
        placeholder: 'Given/When/Then format with priorities...',
        required: true,
        order: 7,
      },
      {
        id: 'technical_architecture',
        title: 'Technical Architecture',
        placeholder: 'High-level architecture, dependencies, integrations...',
        required: false,
        order: 8,
      },
      {
        id: 'launch_plan',
        title: 'Launch Plan & Rollout Strategy',
        placeholder: 'Phased rollout, beta testing, feature flags...',
        required: true,
        order: 9,
      },
      {
        id: 'success_metrics',
        title: 'Success Metrics & KPIs',
        placeholder: 'How will we measure launch success?',
        required: true,
        order: 10,
      },
      {
        id: 'risk_assessment',
        title: 'Risk Assessment',
        placeholder: 'Potential risks and mitigation strategies...',
        required: false,
        order: 11,
      },
      {
        id: 'timeline',
        title: 'Timeline & Milestones',
        placeholder: 'Key dates and milestones for the launch...',
        required: true,
        order: 12,
      },
    ],
  },

  'bug-fix': {
    id: 'bug-fix',
    name: 'Bug Fix Specification',
    description: 'Detailed specification for bug fixes and technical improvements',
    estimatedTimeMinutes: 1,
    sections: [
      {
        id: 'bug_description',
        title: 'Bug Description',
        placeholder: 'What is the bug? How does it manifest?',
        required: true,
        order: 1,
      },
      {
        id: 'impact_analysis',
        title: 'Impact Analysis',
        placeholder: 'Who is affected? How severe is the impact?',
        required: true,
        order: 2,
      },
      {
        id: 'root_cause',
        title: 'Root Cause',
        placeholder: 'What is causing this bug?',
        required: true,
        order: 3,
      },
      {
        id: 'reproduction_steps',
        title: 'Reproduction Steps',
        placeholder: 'Step-by-step instructions to reproduce the bug...',
        required: true,
        order: 4,
      },
      {
        id: 'proposed_solution',
        title: 'Proposed Solution',
        placeholder: 'How will we fix this bug?',
        required: true,
        order: 5,
      },
      {
        id: 'acceptance_criteria',
        title: 'Acceptance Criteria',
        placeholder: 'How do we verify the fix works?',
        required: true,
        order: 6,
      },
      {
        id: 'testing_strategy',
        title: 'Testing Strategy',
        placeholder: 'Unit tests, integration tests, manual testing...',
        required: true,
        order: 7,
      },
      {
        id: 'regression_risk',
        title: 'Regression Risk',
        placeholder: 'What could this fix break? How do we mitigate?',
        required: false,
        order: 8,
      },
      {
        id: 'success_metrics',
        title: 'Success Metrics',
        placeholder: 'How will we verify this is fixed in production?',
        required: true,
        order: 9,
      },
    ],
  },

  'api-spec': {
    id: 'api-spec',
    name: 'API Specification',
    description: 'Technical specification for API endpoints and integrations',
    estimatedTimeMinutes: 2,
    sections: [
      {
        id: 'api_overview',
        title: 'API Overview',
        placeholder: 'High-level description of the API purpose and functionality...',
        required: true,
        order: 1,
      },
      {
        id: 'use_cases',
        title: 'Use Cases',
        placeholder: 'Primary use cases for this API...',
        required: true,
        order: 2,
      },
      {
        id: 'endpoints',
        title: 'Endpoints',
        placeholder: 'List all endpoints with methods, paths, and descriptions...',
        required: true,
        order: 3,
      },
      {
        id: 'request_response',
        title: 'Request/Response Formats',
        placeholder: 'Detailed request and response schemas with examples...',
        required: true,
        order: 4,
      },
      {
        id: 'authentication',
        title: 'Authentication & Authorization',
        placeholder: 'How is the API secured? What permissions are required?',
        required: true,
        order: 5,
      },
      {
        id: 'error_handling',
        title: 'Error Handling',
        placeholder: 'Error codes, messages, and handling strategies...',
        required: true,
        order: 6,
      },
      {
        id: 'rate_limiting',
        title: 'Rate Limiting',
        placeholder: 'Rate limits and throttling policies...',
        required: false,
        order: 7,
      },
      {
        id: 'versioning',
        title: 'Versioning Strategy',
        placeholder: 'How will API versions be managed?',
        required: false,
        order: 8,
      },
      {
        id: 'documentation',
        title: 'Documentation Requirements',
        placeholder: 'OpenAPI/Swagger specs, developer guides...',
        required: true,
        order: 9,
      },
      {
        id: 'success_metrics',
        title: 'Success Metrics',
        placeholder: 'API adoption, performance, error rates...',
        required: true,
        order: 10,
      },
    ],
  },
};

// ============================================================================
// Template Helpers
// ============================================================================

export function getTemplate(templateId: SpecTemplate): PRDTemplate {
  return TEMPLATES[templateId];
}

export function getAllTemplates(): PRDTemplate[] {
  return Object.values(TEMPLATES);
}

export function getTemplateById(templateId: string): PRDTemplate | undefined {
  return TEMPLATES[templateId as SpecTemplate];
}

// ============================================================================
// Default Content Generators
// ============================================================================

export function generateDefaultContent(template: SpecTemplate, title: string): string {
  const templateDef = getTemplate(template);

  let content = `# ${title}\n\n`;

  templateDef.sections.forEach((section) => {
    content += `## ${section.title}\n\n`;

    // Add helpful placeholder content based on section
    if (section.id === 'user_stories') {
      content += `### Primary User: [Persona Name]\n`;
      content += `- As a **[persona]**, I want to **[action]** so that **[benefit]**.\n\n`;
      content += `### Secondary User: [Persona Name]\n`;
      content += `- As a **[persona]**, I want to **[action]** so that **[benefit]**.\n\n`;
    } else if (section.id === 'acceptance_criteria') {
      content += `### Must Have (P0)\n`;
      content += `- [ ] Given **[context]**, when **[action]**, then **[expected result]**\n`;
      content += `- [ ] Given **[context]**, when **[action]**, then **[expected result]**\n\n`;
      content += `### Should Have (P1)\n`;
      content += `- [ ] Given **[context]**, when **[action]**, then **[expected result]**\n\n`;
      content += `### Nice to Have (P2)\n`;
      content += `- [ ] Given **[context]**, when **[action]**, then **[expected result]**\n\n`;
    } else if (section.id === 'success_metrics') {
      content += `| Metric | Current | Target | Measurement Method |\n`;
      content += `|--------|---------|--------|-------------------|\n`;
      content += `| [Metric 1] | [baseline] | [target] | [how to measure] |\n`;
      content += `| [Metric 2] | [baseline] | [target] | [how to measure] |\n\n`;
    } else if (section.id === 'edge_cases') {
      content += `1. **[Edge case 1]**: [How to handle]\n`;
      content += `2. **[Edge case 2]**: [How to handle]\n\n`;
    } else if (section.id === 'technical_considerations') {
      content += `- **Dependencies**: [List key dependencies]\n`;
      content += `- **Performance**: [Performance considerations]\n`;
      content += `- **Security**: [Security implications]\n`;
      content += `- **Scalability**: [Scalability concerns]\n\n`;
    } else if (section.id === 'out_of_scope') {
      content += `- [What we're NOT building in this iteration]\n`;
      content += `- [Future considerations]\n\n`;
    } else if (section.id === 'open_questions') {
      content += `- [ ] [Question 1]\n`;
      content += `- [ ] [Question 2]\n\n`;
    } else {
      content += `${section.placeholder}\n\n`;
    }
  });

  return content;
}

// ============================================================================
// Template Validation
// ============================================================================

export function validateSpecContent(content: string, template: SpecTemplate): {
  valid: boolean;
  missingRequiredSections: string[];
  warnings: string[];
} {
  const templateDef = getTemplate(template);
  const requiredSections = templateDef.sections.filter((s) => s.required);

  const missingRequiredSections: string[] = [];
  const warnings: string[] = [];

  // Check for required sections
  requiredSections.forEach((section) => {
    const sectionRegex = new RegExp(`##\\s+${section.title}`, 'i');
    if (!sectionRegex.test(content)) {
      missingRequiredSections.push(section.title);
    }
  });

  // Check for minimal content (not just placeholders)
  if (content.length < 500) {
    warnings.push('Spec content seems too short. Consider adding more detail.');
  }

  // Check for user stories if required
  if (template !== 'bug-fix' && !content.includes('As a')) {
    warnings.push('No user stories found. Consider adding user stories.');
  }

  // Check for acceptance criteria
  if (!content.includes('Given') || !content.includes('When') || !content.includes('Then')) {
    warnings.push(
      'Acceptance criteria may not be in Given/When/Then format. Consider restructuring.'
    );
  }

  return {
    valid: missingRequiredSections.length === 0,
    missingRequiredSections,
    warnings,
  };
}
