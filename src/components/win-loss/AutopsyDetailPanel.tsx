/**
 * Autopsy Detail Panel
 * Displays comprehensive deal autopsy analysis
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  X,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Target,
  Lightbulb,
  CheckSquare,
  Download,
  RefreshCw,
  Loader2,
  FileText,
} from 'lucide-react';

interface AutopsyDetailPanelProps {
  deal: any;
  autopsy: any;
  onClose: () => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

export function AutopsyDetailPanel({
  deal,
  autopsy,
  onClose,
  onRegenerate,
  regenerating = false,
}: AutopsyDetailPanelProps) {
  const confidence = autopsy?.confidence || 0;
  const confidencePercent = Math.round(confidence * 100);

  const getReasonColor = (reason: string) => {
    const colors: Record<string, string> = {
      pricing: 'bg-red-100 text-red-700 border-red-300',
      features: 'bg-orange-100 text-orange-700 border-orange-300',
      competitor: 'bg-purple-100 text-purple-700 border-purple-300',
      timing: 'bg-blue-100 text-blue-700 border-blue-300',
      budget: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      fit: 'bg-pink-100 text-pink-700 border-pink-300',
      process: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      other: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[reason] || colors.other;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500',
    };
    return colors[severity] || colors.medium;
  };

  const exportToMarkdown = () => {
    const md = `# Deal Autopsy: ${deal.name}

## Overview
- **Status**: ${deal.status}
- **Amount**: $${Number(deal.amount).toLocaleString()}
- **Competitor**: ${deal.competitor || 'None'}
- **Closed**: ${deal.closed_at ? new Date(deal.closed_at).toLocaleDateString() : 'N/A'}

## Summary
${autopsy.summary}

## Primary Reason
**${autopsy.primary_reason}**: ${autopsy.primary_reason_detail}

## Objections
${
  autopsy.objections?.map((obj: any) => `- **${obj.category}** (${obj.severity}): ${obj.description}`).join('\n') ||
  'None'
}

## Competitor Signals
${
  autopsy.competitor_signals
    ?.map(
      (comp: any) => `### ${comp.competitor_name}
- **Features**: ${comp.mentioned_features?.join(', ') || 'None'}
- **Advantages**: ${comp.perceived_advantages?.join(', ') || 'None'}
- **Disadvantages**: ${comp.perceived_disadvantages?.join(', ') || 'None'}
- **Sentiment**: ${comp.sentiment}`
    )
    .join('\n\n') || 'None'
}

## Recommendations
${autopsy.recommendations}

## Action Items
${autopsy.action_items?.map((item: string) => `- [ ] ${item}`).join('\n') || 'None'}

## Key Themes
${autopsy.key_themes?.map((theme: string) => `- ${theme}`).join('\n') || 'None'}

---
*Generated: ${new Date().toLocaleString()}*
*Confidence: ${confidencePercent}%*
`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deal-autopsy-${deal.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{deal.name}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={deal.status === 'won' ? 'default' : 'destructive'}>
                  {deal.status === 'won' ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {deal.status}
                </Badge>
                <Badge variant="outline">${Number(deal.amount).toLocaleString()}</Badge>
                {deal.competitor && <Badge variant="outline">{deal.competitor}</Badge>}
              </div>
            </div>
            <div className="flex gap-2">
              {onRegenerate && (
                <Button variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating}>
                  {regenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportToMarkdown}>
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Confidence Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Analysis Confidence</span>
              <span className="text-sm font-bold text-blue-600">{confidencePercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Executive Summary
            </h3>
            <p className="text-gray-700 leading-relaxed">{autopsy.summary}</p>
          </div>

          <Separator />

          {/* Primary Reason */}
          {autopsy.primary_reason && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-600" />
                  Primary Loss Reason
                </h3>
                <div className="flex items-start gap-3">
                  <Badge className={getReasonColor(autopsy.primary_reason)} variant="outline">
                    {autopsy.primary_reason}
                  </Badge>
                  <p className="text-gray-700 flex-1">{autopsy.primary_reason_detail}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Objections */}
          {autopsy.objections && autopsy.objections.length > 0 && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Key Objections
                </h3>
                <div className="space-y-3">
                  {autopsy.objections.map((objection: any, index: number) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline">{objection.category}</Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Severity:</span>
                          <div
                            className={`w-2 h-2 rounded-full ${getSeverityColor(objection.severity)}`}
                          />
                          <span className="text-xs font-medium capitalize">{objection.severity}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{objection.description}</p>
                      {objection.frequency && (
                        <p className="text-xs text-gray-500 mt-2">
                          Mentioned {objection.frequency} time(s)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Competitor Signals */}
          {autopsy.competitor_signals && autopsy.competitor_signals.length > 0 && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Competitive Intelligence
                </h3>
                <div className="space-y-4">
                  {autopsy.competitor_signals.map((signal: any, index: number) => (
                    <div key={index} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-900">{signal.competitor_name}</h4>
                        <Badge
                          variant={
                            signal.sentiment === 'positive'
                              ? 'default'
                              : signal.sentiment === 'negative'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {signal.sentiment}
                        </Badge>
                      </div>
                      {signal.mentioned_features && signal.mentioned_features.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-purple-700">Features:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {signal.mentioned_features.map((feature: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {signal.perceived_advantages && signal.perceived_advantages.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-green-700">Their Advantages:</span>
                          <ul className="text-xs text-gray-700 mt-1 ml-4 list-disc">
                            {signal.perceived_advantages.map((adv: string, i: number) => (
                              <li key={i}>{adv}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {signal.perceived_disadvantages && signal.perceived_disadvantages.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-red-700">Their Weaknesses:</span>
                          <ul className="text-xs text-gray-700 mt-1 ml-4 list-disc">
                            {signal.perceived_disadvantages.map((dis: string, i: number) => (
                              <li key={i}>{dis}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              Recommendations
            </h3>
            <div className="prose prose-sm max-w-none">
              <div
                className="text-gray-700 bg-yellow-50 rounded-lg p-4 border border-yellow-200"
                dangerouslySetInnerHTML={{ __html: autopsy.recommendations.replace(/\n/g, '<br>') }}
              />
            </div>
          </div>

          {/* Action Items */}
          {autopsy.action_items && autopsy.action_items.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-green-600" />
                  Action Items
                </h3>
                <div className="space-y-2">
                  {autopsy.action_items.map((item: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                      <div className="w-5 h-5 rounded border-2 border-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 flex-1">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Key Themes */}
          {autopsy.key_themes && autopsy.key_themes.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Key Themes</h3>
                <div className="flex flex-wrap gap-2">
                  {autopsy.key_themes.map((theme: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
