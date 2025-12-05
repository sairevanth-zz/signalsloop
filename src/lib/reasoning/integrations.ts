/**
 * AI Reasoning Layer - Feature Integrations
 * Feature F: Gen 3
 * 
 * Integration helpers for adding reasoning capture to existing AI features
 */

import { createReasoningTrace } from './capture-reasoning';
import type {
  ReasoningFeature,
  ReasoningStep,
  Alternative,
  DataSource,
} from '@/types/reasoning';

/**
 * Capture reasoning for Feature Prediction
 */
export async function captureFeaturePredictionReasoning(params: {
  projectId: string;
  predictionId: string;
  featureName: string;
  adoptionRate: number;
  confidence: number;
  explanationText: string;
  factors: Array<{ factor: string; impact: string; weight: number }>;
  feedbackCount: number;
  strategy: string;
  modelUsed?: string;
}) {
  const reasoningSteps: ReasoningStep[] = params.factors.map((factor, index) => ({
    step_number: index + 1,
    description: factor.factor,
    evidence: [`Weight: ${(factor.weight * 100).toFixed(0)}%`, `Impact: ${factor.impact}`],
    conclusion: factor.factor,
    confidence: factor.weight,
  }));

  const alternatives: Alternative[] = [
    {
      alternative: 'Lower priority prediction',
      why_rejected: params.adoptionRate > 0.5
        ? 'High demand signals from users indicate strong adoption potential'
        : 'Despite moderate signals, feedback patterns suggest this feature has value',
    },
  ];

  return createReasoningTrace({
    projectId: params.projectId,
    feature: 'prediction',
    decisionType: 'feature_success_predicted',
    decisionSummary: `Predicted ${Math.round(params.adoptionRate * 100)}% adoption for ${params.featureName}`,
    dataSources: [
      { type: 'feedback', count: params.feedbackCount },
    ],
    reasoningSteps,
    decision: params.explanationText,
    confidence: params.confidence,
    alternatives,
    modelUsed: params.modelUsed || 'gpt-4o',
    entityType: 'prediction',
    entityId: params.predictionId,
  });
}

/**
 * Capture reasoning for Roadmap Prioritization
 */
export async function captureRoadmapPrioritizationReasoning(params: {
  projectId: string;
  themeId: string;
  themeName: string;
  priorityScore: number;
  priorityLevel: string;
  scoreBreakdown: {
    frequency: number;
    sentiment: number;
    businessImpact: number;
    effort: number;
    competitive: number;
  };
  mentionCount: number;
  avgSentiment: number;
}) {
  const reasoningSteps: ReasoningStep[] = [
    {
      step_number: 1,
      description: 'Analyzed feedback frequency',
      evidence: [
        `${params.mentionCount} user mentions`,
        `Frequency score: ${(params.scoreBreakdown.frequency * 100).toFixed(0)}%`,
      ],
      conclusion: params.mentionCount > 10 
        ? 'High demand from users' 
        : 'Moderate user interest',
      confidence: params.scoreBreakdown.frequency,
    },
    {
      step_number: 2,
      description: 'Evaluated user sentiment',
      evidence: [
        `Average sentiment: ${params.avgSentiment.toFixed(2)}`,
        `Sentiment score: ${(params.scoreBreakdown.sentiment * 100).toFixed(0)}%`,
      ],
      conclusion: params.avgSentiment < 0 
        ? 'Negative sentiment indicates frustration - prioritize' 
        : 'Neutral/positive sentiment - nice-to-have',
      confidence: params.scoreBreakdown.sentiment,
    },
    {
      step_number: 3,
      description: 'Assessed business impact',
      evidence: [
        `Business impact score: ${(params.scoreBreakdown.businessImpact * 100).toFixed(0)}%`,
      ],
      conclusion: params.scoreBreakdown.businessImpact > 0.7 
        ? 'High business impact - critical for retention/growth' 
        : 'Moderate business impact',
      confidence: params.scoreBreakdown.businessImpact,
    },
    {
      step_number: 4,
      description: 'Considered implementation effort',
      evidence: [
        `Effort score: ${(params.scoreBreakdown.effort * 100).toFixed(0)}%`,
      ],
      conclusion: params.scoreBreakdown.effort > 0.7 
        ? 'Low effort - quick win opportunity' 
        : 'Higher effort required',
      confidence: params.scoreBreakdown.effort,
    },
    {
      step_number: 5,
      description: 'Reviewed competitive landscape',
      evidence: [
        `Competitive score: ${(params.scoreBreakdown.competitive * 100).toFixed(0)}%`,
      ],
      conclusion: params.scoreBreakdown.competitive > 0.5 
        ? 'Competitors have this - closing gap important' 
        : 'Not a competitive differentiator',
      confidence: params.scoreBreakdown.competitive,
    },
  ];

  const alternatives: Alternative[] = [
    {
      alternative: `Set priority to ${params.priorityLevel === 'critical' ? 'high' : 'critical'}`,
      why_rejected: `Score breakdown indicates ${params.priorityLevel} is most appropriate based on weighted factors`,
    },
  ];

  return createReasoningTrace({
    projectId: params.projectId,
    feature: 'prioritization',
    decisionType: 'roadmap_priority_set',
    decisionSummary: `Set ${params.themeName} priority to ${params.priorityLevel} (score: ${params.priorityScore.toFixed(0)})`,
    dataSources: [
      { type: 'feedback', count: params.mentionCount },
      { type: 'sentiment_scores', count: params.mentionCount, average: params.avgSentiment },
    ],
    reasoningSteps,
    decision: `Priority level: ${params.priorityLevel}`,
    confidence: params.priorityScore / 100,
    alternatives,
    entityType: 'theme',
    entityId: params.themeId,
  });
}

/**
 * Capture reasoning for Devil's Advocate Risk Alert
 */
export async function captureDevilsAdvocateReasoning(params: {
  projectId: string;
  alertId: string;
  alertType: string;
  title: string;
  severity: string;
  risks: string[];
  recommendations: string[];
  confidence: number;
  relatedEntityType?: string;
  relatedEntityId?: string;
}) {
  const reasoningSteps: ReasoningStep[] = params.risks.map((risk, index) => ({
    step_number: index + 1,
    description: `Identified risk: ${risk}`,
    evidence: [risk],
    conclusion: `Risk factor ${index + 1} contributes to ${params.severity} severity`,
    confidence: params.confidence,
  }));

  const alternatives: Alternative[] = params.recommendations.map((rec) => ({
    alternative: rec,
    why_rejected: 'Recommended action - not rejected',
  }));

  return createReasoningTrace({
    projectId: params.projectId,
    feature: 'devils_advocate',
    decisionType: 'risk_alert_created',
    decisionSummary: `${params.severity.toUpperCase()}: ${params.title}`,
    dataSources: [
      { type: 'risk_analysis', count: params.risks.length },
    ],
    reasoningSteps,
    decision: params.title,
    confidence: params.confidence,
    alternatives,
    entityType: params.relatedEntityType || 'alert',
    entityId: params.alertId,
  });
}

/**
 * Capture reasoning for Sentiment Analysis
 */
export async function captureSentimentAnalysisReasoning(params: {
  projectId: string;
  postId: string;
  sentiment: number;
  confidence: number;
  keywords: string[];
  phrases: string[];
}) {
  const reasoningSteps: ReasoningStep[] = [
    {
      step_number: 1,
      description: 'Analyzed text sentiment indicators',
      evidence: params.keywords.slice(0, 5).map(k => `Keyword: "${k}"`),
      conclusion: `Overall sentiment: ${params.sentiment > 0.3 ? 'Positive' : params.sentiment < -0.3 ? 'Negative' : 'Neutral'}`,
      confidence: params.confidence,
    },
    {
      step_number: 2,
      description: 'Extracted key phrases',
      evidence: params.phrases.slice(0, 3),
      conclusion: `Sentiment score: ${params.sentiment.toFixed(2)}`,
      confidence: params.confidence,
    },
  ];

  return createReasoningTrace({
    projectId: params.projectId,
    feature: 'sentiment_analysis',
    decisionType: 'sentiment_classified',
    decisionSummary: `Classified as ${params.sentiment > 0.3 ? 'positive' : params.sentiment < -0.3 ? 'negative' : 'neutral'} (${params.sentiment.toFixed(2)})`,
    dataSources: [
      { type: 'text_content', count: 1 },
    ],
    reasoningSteps,
    decision: `Sentiment: ${params.sentiment.toFixed(2)}`,
    confidence: params.confidence,
    alternatives: [],
    entityType: 'post',
    entityId: params.postId,
  });
}

/**
 * Capture reasoning for Theme Detection
 */
export async function captureThemeDetectionReasoning(params: {
  projectId: string;
  postId: string;
  themes: Array<{ name: string; confidence: number }>;
  feedbackText: string;
}) {
  const reasoningSteps: ReasoningStep[] = params.themes.map((theme, index) => ({
    step_number: index + 1,
    description: `Identified theme: ${theme.name}`,
    evidence: [`Confidence: ${(theme.confidence * 100).toFixed(0)}%`],
    conclusion: `Theme "${theme.name}" detected with ${(theme.confidence * 100).toFixed(0)}% confidence`,
    confidence: theme.confidence,
  }));

  const avgConfidence = params.themes.reduce((acc, t) => acc + t.confidence, 0) / params.themes.length;

  return createReasoningTrace({
    projectId: params.projectId,
    feature: 'theme_detection',
    decisionType: 'themes_extracted',
    decisionSummary: `Extracted ${params.themes.length} theme(s): ${params.themes.map(t => t.name).join(', ')}`,
    dataSources: [
      { type: 'feedback_text', count: 1 },
    ],
    reasoningSteps,
    decision: params.themes.map(t => t.name).join(', '),
    confidence: avgConfidence,
    alternatives: [],
    entityType: 'post',
    entityId: params.postId,
  });
}

/**
 * Capture reasoning for Anomaly Detection
 */
export async function captureAnomalyDetectionReasoning(params: {
  projectId: string;
  anomalyId: string;
  anomalyType: string;
  metricName: string;
  currentValue: number;
  expectedValue: number;
  deviationPercentage: number;
  severity: string;
}) {
  const reasoningSteps: ReasoningStep[] = [
    {
      step_number: 1,
      description: `Detected deviation in ${params.metricName}`,
      evidence: [
        `Current value: ${params.currentValue}`,
        `Expected value: ${params.expectedValue}`,
        `Deviation: ${params.deviationPercentage.toFixed(1)}%`,
      ],
      conclusion: `${params.deviationPercentage > 0 ? 'Increase' : 'Decrease'} detected`,
      confidence: Math.min(Math.abs(params.deviationPercentage) / 100, 1),
    },
    {
      step_number: 2,
      description: 'Assessed severity based on deviation magnitude',
      evidence: [
        `Deviation percentage: ${params.deviationPercentage.toFixed(1)}%`,
        `Severity threshold: ${params.severity}`,
      ],
      conclusion: `Classified as ${params.severity} severity anomaly`,
      confidence: 0.85,
    },
  ];

  return createReasoningTrace({
    projectId: params.projectId,
    feature: 'anomaly_detection',
    decisionType: 'anomaly_detected',
    decisionSummary: `${params.severity.toUpperCase()}: ${params.metricName} ${params.deviationPercentage > 0 ? 'spiked' : 'dropped'} by ${Math.abs(params.deviationPercentage).toFixed(0)}%`,
    dataSources: [
      { type: 'metrics', count: 1 },
    ],
    reasoningSteps,
    decision: `${params.anomalyType}: ${params.metricName}`,
    confidence: Math.min(Math.abs(params.deviationPercentage) / 100, 0.95),
    alternatives: [
      {
        alternative: 'Ignore as noise',
        why_rejected: `Deviation of ${Math.abs(params.deviationPercentage).toFixed(0)}% exceeds threshold for normal variation`,
      },
    ],
    entityType: 'anomaly',
    entityId: params.anomalyId,
  });
}
