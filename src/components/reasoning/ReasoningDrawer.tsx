'use client';

/**
 * AI Reasoning Drawer Component
 * Feature F: Gen 3
 * 
 * Slide-out drawer that shows the reasoning behind AI decisions
 * Displays reasoning steps as a timeline with expandable evidence
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Zap,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ReasoningTrace,
  ReasoningStep,
  Alternative,
  ReasoningFeature,
} from '@/types/reasoning';

interface ReasoningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  feature?: ReasoningFeature;
}

const FEATURE_LABELS: Record<ReasoningFeature, string> = {
  devils_advocate: "Devil's Advocate",
  prediction: 'Feature Prediction',
  prioritization: 'Priority Scoring',
  classification: 'Classification',
  sentiment_analysis: 'Sentiment Analysis',
  theme_detection: 'Theme Detection',
  spec_writer: 'Spec Writer',
  roadmap_suggestion: 'Roadmap Suggestion',
  competitive_intel: 'Competitive Intelligence',
  anomaly_detection: 'Anomaly Detection',
  churn_prediction: 'Churn Prediction',
  impact_simulation: 'Impact Simulation',
  stakeholder_response: 'Stakeholder Response',
};

const FEATURE_ICONS: Record<ReasoningFeature, React.ReactNode> = {
  devils_advocate: <AlertCircle className="w-4 h-4" />,
  prediction: <Zap className="w-4 h-4" />,
  prioritization: <CheckCircle className="w-4 h-4" />,
  classification: <Info className="w-4 h-4" />,
  sentiment_analysis: <Brain className="w-4 h-4" />,
  theme_detection: <Sparkles className="w-4 h-4" />,
  spec_writer: <ExternalLink className="w-4 h-4" />,
  roadmap_suggestion: <Zap className="w-4 h-4" />,
  competitive_intel: <AlertCircle className="w-4 h-4" />,
  anomaly_detection: <AlertCircle className="w-4 h-4" />,
  churn_prediction: <AlertCircle className="w-4 h-4" />,
  impact_simulation: <Zap className="w-4 h-4" />,
  stakeholder_response: <Brain className="w-4 h-4" />,
};

export function ReasoningDrawer({
  isOpen,
  onClose,
  entityType,
  entityId,
  feature,
}: ReasoningDrawerProps) {
  const [traces, setTraces] = useState<ReasoningTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [selectedTrace, setSelectedTrace] = useState<ReasoningTrace | null>(null);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchReasoningTraces();
    }
  }, [isOpen, entityType, entityId, feature]);

  async function fetchReasoningTraces() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        entityType,
        entityId,
      });

      const response = await fetch(`/api/reasoning/entity?${params}`);
      const data = await response.json();

      if (data.traces && data.traces.length > 0) {
        setTraces(data.traces);
        setSelectedTrace(data.traces[0]);
      } else {
        setTraces([]);
        setSelectedTrace(null);
      }
    } catch (error) {
      console.error('Failed to fetch reasoning traces:', error);
      setTraces([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleStepExpansion(stepId: string) {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  }

  function getConfidenceBg(confidence: number): string {
    if (confidence >= 0.8) return 'bg-green-500/10';
    if (confidence >= 0.6) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                  <Brain className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">AI Reasoning</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Why did AI make this decision?
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : !selectedTrace ? (
                <div className="p-6 text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="font-medium text-slate-700 dark:text-slate-300">
                    No Reasoning Available
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    This decision doesn't have recorded reasoning yet.
                  </p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Decision Summary */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 to-teal-600/10 border border-teal-200 dark:border-teal-800">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
                        {selectedTrace.feature && FEATURE_ICONS[selectedTrace.feature]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">
                            {selectedTrace.feature && FEATURE_LABELS[selectedTrace.feature]}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {selectedTrace.decision_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {selectedTrace.decision_summary}
                        </p>
                      </div>
                    </div>

                    {/* Confidence Score */}
                    <div className="mt-4 flex items-center gap-4">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getConfidenceBg(selectedTrace.outputs.confidence)}`}>
                        <div className={`w-2 h-2 rounded-full ${getConfidenceColor(selectedTrace.outputs.confidence)} bg-current`} />
                        <span className={`text-sm font-medium ${getConfidenceColor(selectedTrace.outputs.confidence)}`}>
                          {Math.round(selectedTrace.outputs.confidence * 100)}% Confidence
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reasoning Steps Timeline */}
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-teal-500" />
                      Reasoning Process
                    </h3>
                    <div className="space-y-3">
                      {selectedTrace.reasoning_steps.map((step, index) => {
                        const stepId = `${selectedTrace.id}-${step.step_number}`;
                        const isExpanded = expandedSteps.has(stepId);

                        return (
                          <div
                            key={stepId}
                            className="relative pl-6 pb-3"
                          >
                            {/* Timeline line */}
                            {index < selectedTrace.reasoning_steps.length - 1 && (
                              <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                            )}

                            {/* Step indicator */}
                            <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step.confidence >= 0.8
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : step.confidence >= 0.6
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                              {step.step_number}
                            </div>

                            {/* Step content */}
                            <div
                              className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              onClick={() => toggleStepExpansion(stepId)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                    {step.description}
                                  </p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    {step.conclusion}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${getConfidenceColor(step.confidence)}`}>
                                    {Math.round(step.confidence * 100)}%
                                  </span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </div>

                              {/* Expanded evidence */}
                              <AnimatePresence>
                                {isExpanded && step.evidence.length > 0 && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700"
                                  >
                                    <p className="text-xs font-medium text-slate-500 mb-2">Evidence:</p>
                                    <ul className="space-y-1">
                                      {step.evidence.map((evidence, i) => (
                                        <li
                                          key={i}
                                          className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400"
                                        >
                                          <CheckCircle className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                                          {evidence}
                                        </li>
                                      ))}
                                    </ul>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alternatives Considered */}
                  {selectedTrace.outputs.alternatives_considered.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Alternatives Considered
                      </h3>
                      <div className="space-y-3">
                        {selectedTrace.outputs.alternatives_considered.map((alt, index) => (
                          <div
                            key={index}
                            className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
                          >
                            <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                              {alt.alternative}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              <span className="font-medium">Why not chosen:</span> {alt.why_rejected}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Sources */}
                  {selectedTrace.inputs.data_sources && selectedTrace.inputs.data_sources.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-blue-500" />
                        Data Sources Used
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTrace.inputs.data_sources.map((source, index) => (
                          <Badge key={index} variant="secondary" className="py-1">
                            {source.type}: {source.count} items
                            {source.average !== undefined && ` (avg: ${source.average.toFixed(2)})`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="pt-4 border-t dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-500 mb-3">Technical Details</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Cpu className="w-4 h-4" />
                        <span>Model: {selectedTrace.metadata.model_used}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>Latency: {selectedTrace.metadata.latency_ms}ms</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Zap className="w-4 h-4" />
                        <span>Tokens: {selectedTrace.metadata.tokens_used}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(selectedTrace.metadata.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Multiple traces selector */}
                  {traces.length > 1 && (
                    <div className="pt-4 border-t dark:border-slate-700">
                      <h3 className="text-sm font-medium text-slate-500 mb-3">
                        Previous Decisions ({traces.length})
                      </h3>
                      <div className="space-y-2">
                        {traces.slice(0, 5).map((trace) => (
                          <button
                            key={trace.id}
                            onClick={() => setSelectedTrace(trace)}
                            className={`w-full text-left p-2 rounded-lg transition-colors ${selectedTrace?.id === trace.id
                                ? 'bg-teal-100 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-700'
                                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                          >
                            <p className="text-sm font-medium truncate">
                              {trace.decision_summary}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(trace.created_at).toLocaleString()}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ReasoningDrawer;
