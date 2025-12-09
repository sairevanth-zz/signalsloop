/**
 * AI Prompts for Self-Correcting Roadmaps
 * 
 * Contains system and user prompts for:
 * 1. Trigger detection - Analyzing data for adjustment triggers
 * 2. Proposal generation - Creating specific priority change proposals
 */

import type { TriggerDetectionInput, ProposalGenerationInput } from '@/types/roadmap-adjustments';

// ============================================
// TRIGGER DETECTION PROMPTS
// ============================================

export const TRIGGER_DETECTION_SYSTEM_PROMPT = `You are a product strategy AI that monitors for signals indicating roadmap priorities should change.

Given current product data, determine if any roadmap adjustments are warranted.

TRIGGER TYPES:
1. sentiment_shift - Significant change in user sentiment on a theme (>15% change)
2. competitor_move - Competitor launched or announced a feature related to a theme
3. theme_spike - Sudden increase in feedback volume for a theme (>50% increase)
4. churn_signal - Churn risk indicators are correlated with a theme

SEVERITY MAPPING:
- critical: Immediate action needed (>30% sentiment drop, major competitor launch, high churn correlation)
- high: Action within 1 week (20-30% sentiment change, significant theme spike)
- medium: Consider within 2 weeks (10-20% change)
- low: Monitor only (<10% change)

IMPORTANT:
- Only flag triggers that warrant real priority changes
- Be specific about what data points triggered the alert
- Consider the business impact, not just the metrics
- If no significant triggers exist, return an empty triggers array

Return ONLY valid JSON:
{
  "triggers": [
    {
      "type": "sentiment_shift|competitor_move|theme_spike|churn_signal",
      "severity": "low|medium|high|critical",
      "theme_id": "uuid",
      "theme_name": "Theme name",
      "description": "Clear explanation of what changed and why it matters",
      "data_points": ["specific metric 1", "specific metric 2"],
      "recommended_action": "What should change in the roadmap"
    }
  ],
  "overall_assessment": "One sentence summary of roadmap health"
}`;

export function buildTriggerDetectionUserPrompt(data: TriggerDetectionInput): string {
    return `Analyze the following data for roadmap adjustment triggers:

PROJECT: ${data.projectName}

=== SENTIMENT CHANGES (Last 7 days vs Previous 7 days) ===
${data.sentimentChanges.length > 0
            ? data.sentimentChanges.map(s =>
                `- "${s.themeName}": ${s.previousSentiment.toFixed(2)} → ${s.currentSentiment.toFixed(2)} (${s.changePercent > 0 ? '+' : ''}${s.changePercent.toFixed(1)}%)`
            ).join('\n')
            : '(No significant sentiment data)'
        }

=== THEME VELOCITY CHANGES (Feedback volume) ===
${data.themeVelocity.length > 0
            ? data.themeVelocity.map(t =>
                `- "${t.themeName}": ${t.previousMentions} → ${t.currentMentions} mentions (${t.changePercent > 0 ? '+' : ''}${t.changePercent.toFixed(1)}%)`
            ).join('\n')
            : '(No significant velocity changes)'
        }

=== RECENT COMPETITOR ACTIVITY ===
${data.competitorMoves.length > 0
            ? data.competitorMoves.map(c =>
                `- ${c.competitorName}: ${c.activity} (detected ${c.detectedAt})${c.relatedThemes.length > 0 ? `\n  Related themes: ${c.relatedThemes.join(', ')}` : ''}`
            ).join('\n')
            : '(No competitor activity detected)'
        }

=== CHURN SIGNALS ===
${data.churnSignals.length > 0
            ? data.churnSignals.map(c =>
                `- Theme "${c.themeName}": ${c.atRiskUsers} at-risk users mention this (risk score: ${c.churnRiskScore.toFixed(2)})`
            ).join('\n')
            : '(No churn signals detected)'
        }

=== CURRENT ROADMAP PRIORITIES ===
${data.currentPriorities.map(p =>
            `- [${p.priority}] "${p.themeName}" (score: ${p.score.toFixed(1)})`
        ).join('\n')}

Analyze this data and identify any triggers that warrant roadmap adjustment proposals.
Return valid JSON only.`;
}

// ============================================
// PROPOSAL GENERATION PROMPTS
// ============================================

export const PROPOSAL_GENERATION_SYSTEM_PROMPT = `You are a strategic product advisor. Generate specific roadmap adjustment proposals based on detected triggers.

For each affected roadmap item, propose:
1. A clear priority change (e.g., P2 → P1)
2. Specific reasoning tied to the data
3. Expected impact of making this change
4. Risk of NOT making this change

PRIORITY LEVELS:
- P0 (Critical): Score >= 75, immediate action required
- P1 (High): Score 60-74, build in next quarter
- P2 (Medium): Score 40-59, consider for future
- P3 (Low): Score < 40, nice to have

GUIDELINES:
- Be conservative - only propose changes with strong justification
- Consider resource constraints - don't move everything to P0
- Factor in dependencies between themes
- Provide clear, actionable reasoning

Return ONLY valid JSON:
{
  "title": "Brief title for this proposal (e.g., 'Urgent: Address Performance Feedback')",
  "summary": "2-3 sentence summary explaining the overall change and why",
  "changes": [
    {
      "suggestion_id": "uuid",
      "theme_name": "Theme name",
      "old_priority": "P0|P1|P2|P3",
      "new_priority": "P0|P1|P2|P3",
      "reasoning": "Specific data-driven reason for this change",
      "impact_if_ignored": "What happens if we don't make this change"
    }
  ],
  "confidence": 0.0-1.0,
  "urgency": "immediate|within_week|within_month"
}`;

export function buildProposalGenerationUserPrompt(data: ProposalGenerationInput): string {
    const { trigger, currentRoadmap } = data;

    return `Generate a roadmap adjustment proposal based on this detected trigger:

=== TRIGGER ===
Type: ${trigger.type}
Severity: ${trigger.severity}
Theme: "${trigger.themeName}" (ID: ${trigger.themeId})
Description: ${trigger.description}
Data Points:
${trigger.dataPoints.map(d => `  - ${d}`).join('\n')}
Recommended Action: ${trigger.recommendedAction}

=== CURRENT ROADMAP ===
${currentRoadmap.map(r =>
        `- [${r.priorityLevel}] "${r.themeName}" | Score: ${r.priorityScore.toFixed(1)} | Mentions: ${r.frequency} | Sentiment: ${r.avgSentiment.toFixed(2)}`
    ).join('\n')}

Based on this trigger, propose specific priority changes to the roadmap.
Consider which items should move up or down in priority.
Return valid JSON only.`;
}

// ============================================
// SUMMARY GENERATION PROMPT (for notifications)
// ============================================

export const ADJUSTMENT_SUMMARY_PROMPT = `Summarize this roadmap adjustment in one clear sentence for a notification:

Trigger: {trigger_type} - {trigger_description}
Changes: {changes_summary}

Write a brief, action-oriented summary (max 100 characters) that a PM would understand immediately.`;
