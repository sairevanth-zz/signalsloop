/**
 * Spec Quality Score Component
 * Displays quality analysis and improvement suggestions for specs
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  Lightbulb,
  CheckCircle,
  XCircle,
  Sparkles,
  Wand2,
  RefreshCw,
  TrendingUp,
  Target,
  FileText,
  Users,
  ChevronRight,
} from 'lucide-react';
import type { SpecQualityResult, QualityIssue, QualityDimension } from '@/lib/specs/quality-scorer';
import type { SpecTemplate } from '@/types/specs';

interface SpecQualityScoreProps {
  specId?: string;
  content?: string;
  template?: SpecTemplate;
  title?: string;
  onContentUpdate?: (newContent: string) => void;
  autoEvaluate?: boolean;
  className?: string;
}

const GRADE_COLORS = {
  A: 'bg-green-500',
  B: 'bg-blue-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
};

const SEVERITY_STYLES = {
  critical: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-800',
  },
  major: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
  },
  minor: {
    icon: AlertCircle,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  suggestion: {
    icon: Lightbulb,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
  },
};

const DIMENSION_ICONS: Record<string, any> = {
  Completeness: FileText,
  Clarity: Target,
  'Acceptance Criteria': CheckCircle,
  'Edge Cases': AlertTriangle,
  'Technical Detail': Info,
  'Success Metrics': TrendingUp,
};

export function SpecQualityScore({
  specId,
  content,
  template = 'standard',
  title,
  onContentUpdate,
  autoEvaluate = false,
  className,
}: SpecQualityScoreProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpecQualityResult | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);
  const [fixing, setFixing] = useState(false);
  const [showImproveDialog, setShowImproveDialog] = useState(false);
  const [improvedContent, setImprovedContent] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  
  const evaluateQuality = useCallback(async () => {
    if (!specId && !content) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/specs/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specId,
          content,
          template,
          title,
          action: 'evaluate',
        }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('[SpecQualityScore] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [specId, content, template, title]);
  
  useEffect(() => {
    if (autoEvaluate && (specId || content)) {
      evaluateQuality();
    }
  }, [autoEvaluate, specId, content, evaluateQuality]);
  
  const handleAutoFix = async (issue: QualityIssue) => {
    setFixing(true);
    setSelectedIssue(issue);
    
    try {
      const response = await fetch('/api/specs/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specId,
          content,
          template,
          action: 'autofix',
          issue,
        }),
      });
      
      const data = await response.json();
      
      if (data.fixedContent && onContentUpdate) {
        onContentUpdate(data.fixedContent);
        // Re-evaluate after fix
        setTimeout(evaluateQuality, 500);
      }
    } catch (error) {
      console.error('[SpecQualityScore] Auto-fix error:', error);
    } finally {
      setFixing(false);
      setSelectedIssue(null);
    }
  };
  
  const handleImproveAll = async () => {
    setImproving(true);
    setShowImproveDialog(true);
    
    try {
      const response = await fetch('/api/specs/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specId,
          content,
          template,
          action: 'improve',
        }),
      });
      
      const data = await response.json();
      setImprovedContent(data.improvedContent);
    } catch (error) {
      console.error('[SpecQualityScore] Improve error:', error);
    } finally {
      setImproving(false);
    }
  };
  
  const applyImprovement = () => {
    if (improvedContent && onContentUpdate) {
      onContentUpdate(improvedContent);
      setShowImproveDialog(false);
      setImprovedContent(null);
      setTimeout(evaluateQuality, 500);
    }
  };
  
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Analyzing spec quality...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!result) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-gray-300 mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">Spec Quality Score</h3>
          <p className="text-sm text-gray-500 mb-4">
            Get AI-powered feedback on your spec&apos;s quality and actionable improvements.
          </p>
          <Button onClick={evaluateQuality}>
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze Quality
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Score Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${GRADE_COLORS[result.grade]} flex items-center justify-center`}>
                <span className="text-2xl font-bold text-white">{result.grade}</span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{result.overallScore}</div>
                <div className="text-sm text-gray-500">Quality Score</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={evaluateQuality}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-evaluate
              </Button>
              {result.autoFixableIssues > 0 && (
                <Button size="sm" onClick={handleImproveAll}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  AI Improve
                </Button>
              )}
            </div>
          </div>
          
          {/* Summary */}
          <p className="text-gray-600 mb-4">{result.summary}</p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">{result.readabilityScore}</div>
              <div className="text-xs text-gray-500">Readability</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">{result.engineerReadinessScore}</div>
              <div className="text-xs text-gray-500">Engineer Ready</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Badge
                variant={
                  result.estimatedReworkRisk === 'low'
                    ? 'secondary'
                    : result.estimatedReworkRisk === 'medium'
                    ? 'outline'
                    : 'destructive'
                }
              >
                {result.estimatedReworkRisk.toUpperCase()} Risk
              </Badge>
              <div className="text-xs text-gray-500 mt-1">Rework Risk</div>
            </div>
          </div>
          
          {/* Strengths */}
          {result.strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Strengths
              </h4>
              <ul className="space-y-1">
                {result.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-green-500" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dimension Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quality Dimensions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.dimensions.map((dim) => {
            const Icon = DIMENSION_ICONS[dim.name] || Target;
            return (
              <div key={dim.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">{dim.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{dim.score}</span>
                </div>
                <Progress value={dim.score} className="h-2" />
                {dim.feedback && (
                  <p className="text-xs text-gray-500 mt-1">{dim.feedback}</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      {/* Issues */}
      {result.issues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Issues ({result.issues.length})</span>
              {result.autoFixableIssues > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {result.autoFixableIssues} auto-fixable
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {result.issues.map((issue) => {
                const style = SEVERITY_STYLES[issue.severity];
                const Icon = style.icon;
                
                return (
                  <AccordionItem
                    key={issue.id}
                    value={issue.id}
                    className={`border rounded-lg ${style.bg}`}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <Icon className={`h-5 w-5 ${style.color}`} />
                        <div>
                          <div className="font-medium text-gray-900">{issue.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={`text-xs ${style.badge}`}>
                              {issue.severity}
                            </Badge>
                            <span className="text-xs text-gray-500">{issue.category}</span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <p className="text-sm text-gray-600 mb-3">{issue.description}</p>
                      
                      {issue.location && (
                        <p className="text-xs text-gray-500 mb-3">
                          Location: {issue.location}
                        </p>
                      )}
                      
                      {issue.suggestedFix && (
                        <div className="bg-white rounded p-3 border mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Suggested Fix:</p>
                          <p className="text-sm text-gray-600">{issue.suggestedFix}</p>
                        </div>
                      )}
                      
                      {issue.autoFixAvailable && (
                        <Button
                          size="sm"
                          onClick={() => handleAutoFix(issue)}
                          disabled={fixing && selectedIssue?.id === issue.id}
                        >
                          {fixing && selectedIssue?.id === issue.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Fixing...
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 mr-2" />
                              Auto-Fix
                            </>
                          )}
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
      
      {/* Improvement Suggestions */}
      {result.dimensions.some(d => d.improvements.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Improvement Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.dimensions.flatMap(dim => 
                dim.improvements.map((improvement, idx) => (
                  <li
                    key={`${dim.name}-${idx}`}
                    className="text-sm text-gray-600 flex items-start gap-2 p-2 hover:bg-gray-50 rounded"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-xs text-gray-400">{dim.name}:</span>
                      <span className="ml-1">{improvement}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      )}
      
      {/* AI Improve Dialog */}
      <Dialog open={showImproveDialog} onOpenChange={setShowImproveDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI-Improved Spec</DialogTitle>
            <DialogDescription>
              Review the AI-improved version of your spec. Click Apply to use it.
            </DialogDescription>
          </DialogHeader>
          
          {improving ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">AI is improving your spec...</p>
            </div>
          ) : improvedContent ? (
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {improvedContent}
              </pre>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              Failed to generate improvements
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImproveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={applyImprovement} disabled={!improvedContent}>
              Apply Improvements
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
