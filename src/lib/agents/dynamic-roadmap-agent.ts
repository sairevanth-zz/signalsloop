/**
 * Dynamic Roadmap Intelligence Agent
 *
 * Automatically adjusts roadmap priorities based on real-time signals:
 * - Feedback velocity changes (rapid increase in theme mentions)
 * - Sentiment trend deterioration
 * - Competitive events (new competitor features)
 * - Revenue impact signals (enterprise requests, churn risk)
 *
 * This agent runs on a schedule and updates roadmap_suggestions priorities
 * when significant changes are detected.
 */

import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { publishEvent } from '@/lib/events/publisher';
import { addAction } from '@/lib/actions/action-queue';
import { sendEmail } from '@/lib/email';

// =====================================================
// TYPES
// =====================================================

export interface PriorityAdjustment {
  suggestionId: string;
  themeName: string;
  oldPriority: string;
  newPriority: string;
  oldScore: number;
  newScore: number;
  reason: string;
  triggers: string[];
  recommendedActions: string[];
}

export interface VelocitySignal {
  themeId: string;
  themeName: string;
  currentMentions: number;
  previousMentions: number;
  percentageChange: number;
  isSignificant: boolean;
}

export interface SentimentSignal {
  themeId: string;
  themeName: string;
  currentSentiment: number;
  previousSentiment: number;
  sentimentDrop: number;
  isSignificant: boolean;
}

// =====================================================
// CONFIGURATION
// =====================================================

const VELOCITY_THRESHOLD = 0.5; // 50% increase in mentions
const SENTIMENT_DROP_THRESHOLD = 0.3; // 0.3 point drop in sentiment
const LOOKBACK_DAYS = 7; // Compare with last 7 days
const PRIORITY_BOOST_POINTS = 15; // Points to boost priority by
const PRIORITY_DROP_POINTS = 10; // Points to drop priority by

const PRIORITY_LEVELS = {
  critical: { min: 75, max: 100 },
  high: { min: 60, max: 74 },
  medium: { min: 40, max: 59 },
  low: { min: 0, max: 39 }
};

// =====================================================
// MAIN AGENT FUNCTION
// =====================================================

/**
 * Main entry point - analyzes all roadmap suggestions and adjusts priorities
 */
export async function runDynamicRoadmapAgent(projectId: string): Promise<PriorityAdjustment[]> {
  console.log(`[Dynamic Roadmap Agent] Starting analysis for project ${projectId}`);

  const supabase = getServiceRoleClient();
  const adjustments: PriorityAdjustment[] = [];

  try {
    // 1. Detect velocity changes (feedback spike)
    const velocitySignals = await detectVelocityChanges(projectId);

    // 2. Detect sentiment deterioration
    const sentimentSignals = await detectSentimentChanges(projectId);

    // 3. Detect competitive pressure increases
    const competitiveSignals = await detectCompetitivePressure(projectId);

    // 4. Detect revenue impact signals
    const revenueSignals = await detectRevenueImpact(projectId);

    // 5. For each signal, adjust roadmap priorities
    for (const signal of velocitySignals) {
      if (signal.isSignificant) {
        const adjustment = await adjustPriorityForVelocityIncrease(projectId, signal);
        if (adjustment) adjustments.push(adjustment);
      }
    }

    for (const signal of sentimentSignals) {
      if (signal.isSignificant) {
        const adjustment = await adjustPriorityForSentimentDrop(projectId, signal);
        if (adjustment) adjustments.push(adjustment);
      }
    }

    for (const signal of competitiveSignals) {
      const adjustment = await adjustPriorityForCompetitivePressure(projectId, signal);
      if (adjustment) adjustments.push(adjustment);
    }

    for (const signal of revenueSignals) {
      const adjustment = await adjustPriorityForRevenueImpact(projectId, signal);
      if (adjustment) adjustments.push(adjustment);
    }

    // 6. Log all adjustments to history
    if (adjustments.length > 0) {
      await logPriorityAdjustments(projectId, adjustments);

      // 7. Notify team of changes
      await notifyPriorityChanges(projectId, adjustments);

      // 8. Add actions to action queue
      await createActionItems(projectId, adjustments);
    }

    console.log(`[Dynamic Roadmap Agent] Completed. Made ${adjustments.length} priority adjustments`);

    return adjustments;
  } catch (error) {
    console.error('[Dynamic Roadmap Agent] Error:', error);
    throw error;
  }
}

// =====================================================
// SIGNAL DETECTION
// =====================================================

/**
 * Detect significant increases in feedback velocity
 */
async function detectVelocityChanges(projectId: string): Promise<VelocitySignal[]> {
  const supabase = getServiceRoleClient();
  const signals: VelocitySignal[] = [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);

  // Get current theme frequencies
  const { data: currentThemes } = await supabase
    .from('themes')
    .select('id, theme_name, frequency')
    .eq('project_id', projectId);

  if (!currentThemes) return signals;

  // Get feedback counts from last week for each theme
  for (const theme of currentThemes) {
    const { count: previousCount } = await supabase
      .from('feedback_themes')
      .select('*', { count: 'exact', head: true })
      .eq('theme_id', theme.id)
      .lt('created_at', cutoffDate.toISOString());

    const currentMentions = theme.frequency || 0;
    const previousMentions = previousCount || 0;

    if (previousMentions === 0 && currentMentions > 10) {
      // Brand new theme with significant mentions
      signals.push({
        themeId: theme.id,
        themeName: theme.theme_name,
        currentMentions,
        previousMentions,
        percentageChange: Infinity,
        isSignificant: true
      });
    } else if (previousMentions > 0) {
      const percentageChange = (currentMentions - previousMentions) / previousMentions;

      signals.push({
        themeId: theme.id,
        themeName: theme.theme_name,
        currentMentions,
        previousMentions,
        percentageChange,
        isSignificant: percentageChange >= VELOCITY_THRESHOLD
      });
    }
  }

  return signals;
}

/**
 * Detect significant sentiment deterioration
 */
async function detectSentimentChanges(projectId: string): Promise<SentimentSignal[]> {
  const supabase = getServiceRoleClient();
  const signals: SentimentSignal[] = [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);

  // Get current theme sentiments
  const { data: themes } = await supabase
    .from('themes')
    .select('id, theme_name, avg_sentiment')
    .eq('project_id', projectId);

  if (!themes) return signals;

  for (const theme of themes) {
    // Calculate avg sentiment from feedback older than lookback period
    const { data: oldFeedback } = await supabase
      .from('feedback_themes')
      .select('posts!inner(sentiment)')
      .eq('theme_id', theme.id)
      .lt('feedback_themes.created_at', cutoffDate.toISOString());

    if (!oldFeedback || oldFeedback.length === 0) continue;

    const previousSentiment =
      oldFeedback.reduce((sum, ft) => sum + (ft.posts?.sentiment || 0), 0) / oldFeedback.length;

    const currentSentiment = Number(theme.avg_sentiment) || 0;
    const sentimentDrop = previousSentiment - currentSentiment;

    signals.push({
      themeId: theme.id,
      themeName: theme.theme_name,
      currentSentiment,
      previousSentiment,
      sentimentDrop,
      isSignificant: sentimentDrop >= SENTIMENT_DROP_THRESHOLD
    });
  }

  return signals;
}

/**
 * Detect new competitive pressure
 */
async function detectCompetitivePressure(projectId: string): Promise<any[]> {
  const supabase = getServiceRoleClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);

  // Get new competitive features added in last week
  const { data: newFeatures } = await supabase
    .from('competitive_features')
    .select('feature_name, competitor_id, created_at')
    .eq('project_id', projectId)
    .gte('created_at', cutoffDate.toISOString());

  return newFeatures || [];
}

/**
 * Detect revenue impact signals
 */
async function detectRevenueImpact(projectId: string): Promise<any[]> {
  const supabase = getServiceRoleClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);

  // Get high-urgency feedback from enterprise customers
  const { data: enterpriseFeedback } = await supabase
    .from('posts')
    .select('id, title, urgency_score, classification')
    .eq('project_id', projectId)
    .gte('created_at', cutoffDate.toISOString())
    .or('urgency_score.gte.4,classification.cs.{"enterprise"}');

  return enterpriseFeedback || [];
}

// =====================================================
// PRIORITY ADJUSTMENT LOGIC
// =====================================================

/**
 * Boost priority when feedback velocity increases significantly
 */
async function adjustPriorityForVelocityIncrease(
  projectId: string,
  signal: VelocitySignal
): Promise<PriorityAdjustment | null> {
  const supabase = getServiceRoleClient();

  // Get current roadmap suggestion for this theme
  const { data: suggestion } = await supabase
    .from('roadmap_suggestions')
    .select('*')
    .eq('project_id', projectId)
    .eq('theme_id', signal.themeId)
    .single();

  if (!suggestion) return null;

  const oldScore = Number(suggestion.priority_score);
  const newScore = Math.min(100, oldScore + PRIORITY_BOOST_POINTS);
  const newPriority = getPriorityLevel(newScore);

  if (newPriority === suggestion.priority_level) return null; // No change

  // Update the suggestion
  await supabase
    .from('roadmap_suggestions')
    .update({
      priority_score: newScore,
      priority_level: newPriority,
      regenerated_at: new Date().toISOString()
    })
    .eq('id', suggestion.id);

  // Publish event
  await publishEvent({
    event_type: 'roadmap.priority_changed',
    project_id: projectId,
    metadata: {
      suggestion_id: suggestion.id,
      theme_name: signal.themeName,
      old_priority: suggestion.priority_level,
      new_priority: newPriority,
      reason: 'feedback_velocity_increase',
      velocity_change: signal.percentageChange
    }
  });

  return {
    suggestionId: suggestion.id,
    themeName: signal.themeName,
    oldPriority: suggestion.priority_level,
    newPriority,
    oldScore,
    newScore,
    reason: `Feedback volume increased by ${Math.round(signal.percentageChange * 100)}%`,
    triggers: ['feedback_velocity_spike'],
    recommendedActions: [
      `Review ${signal.themeName} - mentions increased from ${signal.previousMentions} to ${signal.currentMentions}`,
      'Consider moving this feature up in the roadmap',
      'Draft a spec or initiate discovery'
    ]
  };
}

/**
 * Boost priority when sentiment deteriorates
 */
async function adjustPriorityForSentimentDrop(
  projectId: string,
  signal: SentimentSignal
): Promise<PriorityAdjustment | null> {
  const supabase = getServiceRoleClient();

  const { data: suggestion } = await supabase
    .from('roadmap_suggestions')
    .select('*')
    .eq('project_id', projectId)
    .eq('theme_id', signal.themeId)
    .single();

  if (!suggestion) return null;

  const oldScore = Number(suggestion.priority_score);
  const newScore = Math.min(100, oldScore + PRIORITY_BOOST_POINTS);
  const newPriority = getPriorityLevel(newScore);

  if (newPriority === suggestion.priority_level) return null;

  await supabase
    .from('roadmap_suggestions')
    .update({
      priority_score: newScore,
      priority_level: newPriority,
      regenerated_at: new Date().toISOString()
    })
    .eq('id', suggestion.id);

  await publishEvent({
    event_type: 'roadmap.priority_changed',
    project_id: projectId,
    metadata: {
      suggestion_id: suggestion.id,
      theme_name: signal.themeName,
      old_priority: suggestion.priority_level,
      new_priority: newPriority,
      reason: 'sentiment_deterioration'
    }
  });

  return {
    suggestionId: suggestion.id,
    themeName: signal.themeName,
    oldPriority: suggestion.priority_level,
    newPriority,
    oldScore,
    newScore,
    reason: `Sentiment dropped by ${signal.sentimentDrop.toFixed(2)} points`,
    triggers: ['sentiment_deterioration'],
    recommendedActions: [
      `Investigate ${signal.themeName} - user frustration increasing`,
      'Check for recent product changes that may have caused this',
      'Consider immediate action to address user pain'
    ]
  };
}

/**
 * Boost priority when competitors launch similar features
 */
async function adjustPriorityForCompetitivePressure(
  projectId: string,
  competitiveFeature: any
): Promise<PriorityAdjustment | null> {
  const supabase = getServiceRoleClient();

  // Find matching theme by name similarity
  const { data: themes } = await supabase
    .from('themes')
    .select('id, theme_name')
    .eq('project_id', projectId)
    .ilike('theme_name', `%${competitiveFeature.feature_name}%`);

  if (!themes || themes.length === 0) return null;

  const theme = themes[0];

  const { data: suggestion } = await supabase
    .from('roadmap_suggestions')
    .select('*')
    .eq('project_id', projectId)
    .eq('theme_id', theme.id)
    .single();

  if (!suggestion) return null;

  const oldScore = Number(suggestion.priority_score);
  const newScore = Math.min(100, oldScore + PRIORITY_BOOST_POINTS);
  const newPriority = getPriorityLevel(newScore);

  if (newPriority === suggestion.priority_level) return null;

  await supabase
    .from('roadmap_suggestions')
    .update({
      priority_score: newScore,
      priority_level: newPriority,
      regenerated_at: new Date().toISOString()
    })
    .eq('id', suggestion.id);

  return {
    suggestionId: suggestion.id,
    themeName: theme.theme_name,
    oldPriority: suggestion.priority_level,
    newPriority,
    oldScore,
    newScore,
    reason: `Competitor launched similar feature: ${competitiveFeature.feature_name}`,
    triggers: ['competitive_pressure'],
    recommendedActions: [
      `Review competitor's ${competitiveFeature.feature_name} feature`,
      'Assess if this creates competitive disadvantage',
      'Draft response strategy'
    ]
  };
}

/**
 * Boost priority for revenue-impacting feedback
 */
async function adjustPriorityForRevenueImpact(
  projectId: string,
  feedback: any
): Promise<PriorityAdjustment | null> {
  // Similar logic to above - find related theme and boost priority
  // Implementation similar to competitive pressure
  return null; // Placeholder
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get priority level from score
 */
function getPriorityLevel(score: number): string {
  if (score >= PRIORITY_LEVELS.critical.min) return 'critical';
  if (score >= PRIORITY_LEVELS.high.min) return 'high';
  if (score >= PRIORITY_LEVELS.medium.min) return 'medium';
  return 'low';
}

/**
 * Log priority adjustments to history table
 */
async function logPriorityAdjustments(
  projectId: string,
  adjustments: PriorityAdjustment[]
): Promise<void> {
  const supabase = getServiceRoleClient();

  const records = adjustments.map(adj => ({
    project_id: projectId,
    suggestion_id: adj.suggestionId,
    theme_name: adj.themeName,
    old_priority: adj.oldPriority,
    new_priority: adj.newPriority,
    old_score: adj.oldScore,
    new_score: adj.newScore,
    adjustment_reason: adj.reason,
    triggers: adj.triggers,
    created_at: new Date().toISOString()
  }));

  await supabase.from('roadmap_priority_history').insert(records);
}

/**
 * Notify team of priority changes
 */
async function notifyPriorityChanges(
  projectId: string,
  adjustments: PriorityAdjustment[]
): Promise<void> {
  const supabase = getServiceRoleClient();

  // Get project details
  const { data: project } = await supabase
    .from('projects')
    .select('name, slug')
    .eq('id', projectId)
    .single();

  if (!project) return;

  // Group by priority level for better notification
  const criticalChanges = adjustments.filter(a => a.newPriority === 'critical');
  const highChanges = adjustments.filter(a => a.newPriority === 'high');

  if (criticalChanges.length === 0 && highChanges.length === 0) return;

  const subject = `🚨 Roadmap Priority Changes - ${project.name}`;

  let html = `<h2>Automatic Priority Adjustments Detected</h2>`;
  html += `<p>The Dynamic Roadmap Agent has automatically adjusted ${adjustments.length} feature(s) based on real-time signals.</p>`;

  if (criticalChanges.length > 0) {
    html += `<h3>🔴 Critical Priority (${criticalChanges.length})</h3><ul>`;
    criticalChanges.forEach(adj => {
      html += `<li><strong>${adj.themeName}</strong>: ${adj.oldPriority} → ${adj.newPriority}<br/>${adj.reason}</li>`;
    });
    html += `</ul>`;
  }

  if (highChanges.length > 0) {
    html += `<h3>🟡 High Priority (${highChanges.length})</h3><ul>`;
    highChanges.forEach(adj => {
      html += `<li><strong>${adj.themeName}</strong>: ${adj.oldPriority} → ${adj.newPriority}<br/>${adj.reason}</li>`;
    });
    html += `</ul>`;
  }

  html += `<p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/app/roadmap?projectId=${projectId}">View Roadmap →</a></p>`;

  // Get project owner to notify
  const { data: projectData } = await supabase
    .from('projects')
    .select('owner_id, users!inner(email)')
    .eq('id', projectId)
    .single();

  if (projectData) {
    const email = (projectData as any).users?.email;
    if (email) {
      await sendEmail({
        to: email,
        subject,
        html
      });
    }
  }
}

/**
 * Create action items in action queue
 */
async function createActionItems(
  projectId: string,
  adjustments: PriorityAdjustment[]
): Promise<void> {
  for (const adj of adjustments) {
    if (adj.newPriority === 'critical' || adj.newPriority === 'high') {
      await addAction({
        project_id: projectId,
        action_type: 'review_roadmap_priority',
        title: `Review priority change: ${adj.themeName}`,
        description: `${adj.reason}\n\nRecommended actions:\n${adj.recommendedActions.map(a => `• ${a}`).join('\n')}`,
        priority: adj.newPriority === 'critical' ? 'high' : 'medium',
        metadata: {
          suggestion_id: adj.suggestionId,
          old_priority: adj.oldPriority,
          new_priority: adj.newPriority,
          triggers: adj.triggers
        },
        source_agent: 'dynamic-roadmap-agent'
      });
    }
  }
}
