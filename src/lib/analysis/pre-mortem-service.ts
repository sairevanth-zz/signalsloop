/**
 * Pre-Mortem Analysis Service
 * 
 * Uses AI to conduct a "pre-mortem" - imagining all the ways
 * a feature could fail before building it.
 */

import { complete } from '@/lib/ai/router';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import type {
    PreMortemAnalysis,
    PreMortemRequest,
    PreMortemRisk,
    RiskCategory,
    RiskSeverity
} from '@/types/pre-mortem';

const PRE_MORTEM_SYSTEM_PROMPT = `You are a senior product strategist conducting a Pre-Mortem Analysis.

A pre-mortem imagines it's 6 months after launch and the feature has FAILED. Your job is to work backwards and identify WHY it failed.

For each risk you identify, provide:
1. A specific failure scenario narrative
2. Warning signals that would indicate this risk is materializing
3. Concrete mitigation strategies
4. Metrics to monitor

Risk Categories:
- technical: Technical complexity, dependencies, scalability issues
- adoption: Users won't use it, poor UX, wrong solution to problem
- market: Market timing, competition, economic conditions
- resource: Team capacity, skills gap, timeline constraints
- competitive: Competitors react, better alternatives exist
- timing: Wrong time to build, dependencies not ready
- scope: Feature creep, unclear requirements, changing goalposts

Be brutally honest but constructive. The goal is to prevent failure, not discourage action.

Return JSON:
{
  "executiveSummary": "2-3 sentence summary of biggest concerns",
  "overallRiskLevel": "low|medium|high|critical",
  "recommendedProceed": true/false,
  "proceedConditions": ["condition 1", "condition 2"] // if recommendedProceed is true with conditions
  "topConcerns": ["concern 1", "concern 2", "concern 3"],
  "risks": [
    {
      "category": "technical|adoption|market|resource|competitive|timing|scope",
      "severity": "low|medium|high|critical",
      "title": "Short risk title",
      "description": "Brief description",
      "failureScenario": "Imagine it's 6 months from now and...",
      "probabilityScore": 0.0-1.0,
      "impactScore": 0.0-1.0,
      "warningSignals": ["signal 1", "signal 2"],
      "mitigationStrategies": ["strategy 1", "strategy 2"],
      "monitoringIndicators": ["metric 1", "metric 2"]
    }
  ],
  "confidenceScore": 0.0-1.0
}`;

/**
 * Run pre-mortem analysis on a feature
 */
export async function runPreMortemAnalysis(
    request: PreMortemRequest
): Promise<PreMortemAnalysis> {
    const supabase = getServiceRoleClient();

    // Build context from project data
    let contextData = '';

    if (supabase) {
        // Get recent themes
        const { data: themes } = await supabase
            .from('themes')
            .select('theme_name, frequency, avg_sentiment')
            .eq('project_id', request.projectId)
            .order('frequency', { ascending: false })
            .limit(5);

        if (themes?.length) {
            contextData += `\nRECENT USER THEMES:\n${themes.map(t =>
                `- ${t.theme_name} (${t.frequency} mentions, sentiment: ${(t.avg_sentiment || 0).toFixed(2)})`
            ).join('\n')}`;
        }

        // Get recent predictions if any
        const { data: predictions } = await supabase
            .from('feature_predictions')
            .select('feature_name, predicted_adoption_rate, confidence_score, loop_closed, prediction_accuracy')
            .eq('project_id', request.projectId)
            .eq('loop_closed', true)
            .order('created_at', { ascending: false })
            .limit(3);

        if (predictions?.length) {
            contextData += `\n\nRECENT PREDICTION OUTCOMES:\n${predictions.map(p =>
                `- ${p.feature_name}: ${(p.prediction_accuracy * 100).toFixed(0)}% accurate`
            ).join('\n')}`;
        }
    }

    const userPrompt = `Conduct a Pre-Mortem Analysis for this feature:

FEATURE: ${request.featureName}
DESCRIPTION: ${request.featureDescription}
${request.targetSegment ? `TARGET SEGMENT: ${request.targetSegment}` : ''}
${request.estimatedEffort ? `ESTIMATED EFFORT: ${request.estimatedEffort}` : ''}
${request.specContent ? `\nSPEC EXCERPT:\n${request.specContent.slice(0, 2000)}` : ''}
${contextData}

Imagine this feature has failed 6 months after launch. What went wrong?`;

    const response = await complete({
        type: 'reasoning',
        messages: [
            { role: 'system', content: PRE_MORTEM_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
        ],
        options: {
            temperature: 0.4,
            maxTokens: 2000,
            responseFormat: 'json'
        },
        priority: 'high'
    });

    const parsed = JSON.parse(response.content || '{}');

    // Build risk objects with IDs
    const risks: PreMortemRisk[] = (parsed.risks || []).map((r: any, i: number) => ({
        id: `risk_${Date.now()}_${i}`,
        category: r.category as RiskCategory,
        severity: r.severity as RiskSeverity,
        title: r.title,
        description: r.description,
        failureScenario: r.failureScenario,
        probabilityScore: r.probabilityScore || 0.5,
        impactScore: r.impactScore || 0.5,
        riskScore: (r.probabilityScore || 0.5) * (r.impactScore || 0.5),
        warningSignals: r.warningSignals || [],
        mitigationStrategies: r.mitigationStrategies || [],
        monitoringIndicators: r.monitoringIndicators || [],
        acknowledged: false,
        mitigated: false
    }));

    const analysis: PreMortemAnalysis = {
        id: `pm_${Date.now()}`,
        projectId: request.projectId,
        featureId: `feature_${Date.now()}`,
        featureName: request.featureName,
        featureDescription: request.featureDescription,
        risks,
        overallRiskLevel: parsed.overallRiskLevel || 'medium',
        confidenceScore: parsed.confidenceScore || 0.7,
        executiveSummary: parsed.executiveSummary || 'Analysis complete',
        topConcerns: parsed.topConcerns || [],
        recommendedProceed: parsed.recommendedProceed !== false,
        proceedConditions: parsed.proceedConditions,
        analyzedAt: new Date()
    };

    console.log(`[PreMortem] Analyzed ${request.featureName}: ${risks.length} risks, ${analysis.overallRiskLevel} overall`);

    return analysis;
}

/**
 * Store pre-mortem analysis
 */
export async function storePreMortemAnalysis(
    analysis: PreMortemAnalysis
): Promise<void> {
    const supabase = getServiceRoleClient();
    if (!supabase) return;

    await supabase
        .from('pre_mortem_analyses')
        .upsert({
            id: analysis.id,
            project_id: analysis.projectId,
            feature_id: analysis.featureId,
            feature_name: analysis.featureName,
            feature_description: analysis.featureDescription,
            risks: analysis.risks,
            overall_risk_level: analysis.overallRiskLevel,
            confidence_score: analysis.confidenceScore,
            executive_summary: analysis.executiveSummary,
            top_concerns: analysis.topConcerns,
            recommended_proceed: analysis.recommendedProceed,
            proceed_conditions: analysis.proceedConditions,
            analyzed_at: analysis.analyzedAt
        });
}
