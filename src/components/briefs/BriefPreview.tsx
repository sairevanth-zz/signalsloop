/**
 * Brief Preview Component
 * Displays a preview of an executive brief
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GeneratedBrief, ExecutiveBriefData } from '@/lib/briefs/executive-brief-service';
import { format } from 'date-fns';
import {
  Send,
  Download,
  Copy,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
  Users,
  DollarSign,
  Trophy,
  FileText,
  Mail,
  Slack,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface BriefPreviewProps {
  brief: GeneratedBrief;
  onSend?: (recipients: { email: string; name?: string }[]) => void;
  className?: string;
}

export function BriefPreview({ brief, onSend, className }: BriefPreviewProps) {
  const [showSendDialog, setShowSendDialog] = useState(false);
  const data = brief.data;
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const copyMarkdown = () => {
    navigator.clipboard.writeText(brief.contentMarkdown);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{brief.title}</h1>
          <p className="text-gray-500 mt-1">
            {format(new Date(data.periodStart), 'MMM d')} - {format(new Date(data.periodEnd), 'MMM d, yyyy')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyMarkdown}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button size="sm" onClick={() => setShowSendDialog(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
      
      {/* Executive Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-none">
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Executive Summary
          </h2>
          <p className="text-lg text-gray-800">{data.summary}</p>
        </CardContent>
      </Card>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Sentiment</span>
              {getTrendIcon(data.metrics.sentimentTrend)}
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.metrics.sentimentScore}</div>
            <div className={`text-xs ${
              data.metrics.sentimentChange > 0 ? 'text-green-600' : 
              data.metrics.sentimentChange < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {data.metrics.sentimentChange > 0 ? '+' : ''}{data.metrics.sentimentChange}% vs last period
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Feedback</span>
              {getTrendIcon(data.metrics.feedbackTrend)}
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.metrics.totalFeedback}</div>
            <div className="text-xs text-gray-500">items this period</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Themes</span>
              <Target className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.metrics.themesIdentified}</div>
            <div className="text-xs text-gray-500">active themes</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Health</span>
              <Trophy className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.metrics.healthScore}</div>
            <div className="text-xs text-gray-500">product health</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Revenue at Risk */}
      {data.revenueAtRisk > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Revenue at Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl font-bold text-red-700">
                ${data.revenueAtRisk.toLocaleString()}
              </div>
              <div className="text-red-600">
                from {data.accountsAtRisk.length} accounts
              </div>
            </div>
            
            {data.accountsAtRisk.length > 0 && (
              <div className="space-y-2">
                {data.accountsAtRisk.slice(0, 3).map((account, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded border border-red-100"
                  >
                    <div>
                      <span className="font-medium text-gray-900">
                        {account.company || account.name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">{account.reason}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700">
                        ${(account.mrr || 0).toLocaleString()}/mo
                      </span>
                      {account.healthScore && (
                        <Badge variant="outline" className="text-xs">
                          Health: {account.healthScore}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">Top Insights</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="markdown">Raw Markdown</TabsTrigger>
        </TabsList>
        
        <TabsContent value="insights" className="space-y-4">
          {data.topInsights.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              No insights generated for this period
            </Card>
          ) : (
            data.topInsights.map((insight, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <Badge className={`text-xs ${
                      insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                      insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {insight.impact} impact
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-3">{insight.description}</p>
                  {insight.dataPoints && insight.dataPoints.length > 0 && (
                    <ul className="space-y-1">
                      {insight.dataPoints.map((point, pIdx) => (
                        <li key={pIdx} className="text-sm text-gray-500 flex items-center gap-2">
                          <ChevronRight className="h-3 w-3" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="actions" className="space-y-3">
          {data.actionItems.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              No action items for this period
            </Card>
          ) : (
            data.actionItems.map((action, idx) => (
              <Card key={idx} className={`border-l-4 ${
                action.priority === 'critical' ? 'border-l-red-500' :
                action.priority === 'high' ? 'border-l-orange-500' :
                action.priority === 'medium' ? 'border-l-yellow-500' :
                'border-l-gray-300'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-xs ${getPriorityColor(action.priority)}`}>
                          {action.priority}
                        </Badge>
                        <h3 className="font-semibold text-gray-900">{action.title}</h3>
                      </div>
                      <p className="text-gray-600 text-sm">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="competitors" className="space-y-4">
          {data.competitorMoves.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              No competitor moves detected this period
            </Card>
          ) : (
            data.competitorMoves.map((move, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{move.competitor}</h3>
                    <Badge className={`text-xs ${
                      move.impact === 'high' ? 'bg-red-100 text-red-800' :
                      move.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {move.impact} impact
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-3">{move.move}</p>
                  {move.recommendedResponse && (
                    <div className="bg-blue-50 p-3 rounded">
                      <span className="text-xs font-medium text-blue-700 uppercase">
                        Recommended Response
                      </span>
                      <p className="text-sm text-blue-800 mt-1">{move.recommendedResponse}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="markdown">
          <Card>
            <CardContent className="p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded overflow-auto max-h-96">
                {brief.contentMarkdown}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Top Themes */}
      {data.topThemes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Top Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topThemes.map((theme, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-medium text-purple-700">
                      {idx + 1}
                    </div>
                    <span className="font-medium text-gray-900">{theme.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{theme.feedbackCount} feedback</span>
                    {getTrendIcon(theme.trend)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Top Requests */}
      {data.topRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Top Feature Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topRequests.map((request, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="font-medium text-gray-900">{request.title}</span>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">{request.votes} votes</Badge>
                    {request.revenue > 0 && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {request.revenue.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Send Dialog */}
      <SendBriefDialog
        open={showSendDialog}
        onClose={() => setShowSendDialog(false)}
        onSend={(recipients) => {
          onSend?.(recipients);
          setShowSendDialog(false);
        }}
      />
    </div>
  );
}

// Send Dialog Component
function SendBriefDialog({
  open,
  onClose,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (recipients: { email: string; name?: string }[]) => void;
}) {
  const [emails, setEmails] = useState('');
  const [sendVia, setSendVia] = useState<'email' | 'slack' | 'both'>('email');
  
  const handleSend = () => {
    const recipients = emails
      .split(',')
      .map(e => e.trim())
      .filter(e => e)
      .map(email => ({ email }));
    
    onSend(recipients);
  };
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Executive Brief</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Send via
            </label>
            <div className="flex gap-2">
              <Button
                variant={sendVia === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSendVia('email')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                variant={sendVia === 'slack' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSendVia('slack')}
              >
                <Slack className="h-4 w-4 mr-2" />
                Slack
              </Button>
              <Button
                variant={sendVia === 'both' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSendVia('both')}
              >
                Both
              </Button>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Recipients (comma-separated emails)
            </label>
            <textarea
              className="w-full border rounded-lg p-3 text-sm"
              placeholder="ceo@company.com, vp-product@company.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend}>
            <Send className="h-4 w-4 mr-2" />
            Send Brief
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
