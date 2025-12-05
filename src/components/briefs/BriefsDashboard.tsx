/**
 * Briefs Dashboard Component
 * List and manage executive briefs
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { BriefPreview } from './BriefPreview';
import type { GeneratedBrief } from '@/lib/briefs/executive-brief-service';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Plus,
  FileText,
  Calendar,
  Clock,
  Send,
  Download,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Mail,
  Sparkles,
} from 'lucide-react';

interface BriefsDashboardProps {
  projectId: string;
  className?: string;
}

interface BriefListItem {
  id: string;
  title: string;
  brief_type: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  summary: string;
  metrics: {
    sentimentScore?: number;
    totalFeedback?: number;
  };
}

export function BriefsDashboard({ projectId, className }: BriefsDashboardProps) {
  const [briefs, setBriefs] = useState<BriefListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<GeneratedBrief | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateType, setGenerateType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  
  const loadBriefs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/briefs?projectId=${projectId}`);
      const data = await response.json();
      setBriefs(data.briefs || []);
    } catch (error) {
      console.error('[BriefsDashboard] Error loading briefs:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);
  
  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);
  
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          briefType: generateType,
        }),
      });
      
      const data = await response.json();
      
      if (data.brief) {
        setSelectedBrief(data.brief);
        loadBriefs();
      }
    } catch (error) {
      console.error('[BriefsDashboard] Error generating brief:', error);
    } finally {
      setGenerating(false);
      setShowGenerateDialog(false);
    }
  };
  
  const handleViewBrief = async (briefId: string) => {
    try {
      const response = await fetch(`/api/briefs/${briefId}`);
      const data = await response.json();
      setSelectedBrief(data);
    } catch (error) {
      console.error('[BriefsDashboard] Error fetching brief:', error);
    }
  };
  
  const handleDeleteBrief = async (briefId: string) => {
    if (!confirm('Are you sure you want to delete this brief?')) return;
    
    try {
      await fetch(`/api/briefs/${briefId}`, { method: 'DELETE' });
      loadBriefs();
    } catch (error) {
      console.error('[BriefsDashboard] Error deleting brief:', error);
    }
  };
  
  const handleSendBrief = async (recipients: { email: string; name?: string }[]) => {
    if (!selectedBrief) return;
    
    try {
      await fetch(`/api/briefs/${selectedBrief.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          recipients,
        }),
      });
      
      loadBriefs();
    } catch (error) {
      console.error('[BriefsDashboard] Error sending brief:', error);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Ready</Badge>;
      case 'sent':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'generating':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Generating</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const getBriefTypeIcon = (type: string) => {
    switch (type) {
      case 'daily':
        return '📅';
      case 'weekly':
        return '📆';
      case 'monthly':
        return '🗓️';
      default:
        return '📄';
    }
  };

  if (selectedBrief) {
    return (
      <div className={className}>
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedBrief(null)}
          >
            ← Back to Briefs
          </Button>
        </div>
        <BriefPreview brief={selectedBrief} onSend={handleSendBrief} />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Briefs</h1>
          <p className="text-gray-500">Auto-generated briefings for stakeholders</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadBriefs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Brief
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{briefs.length}</div>
              <div className="text-sm text-gray-500">Total Briefs</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Send className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {briefs.filter(b => b.status === 'sent').length}
              </div>
              <div className="text-sm text-gray-500">Sent</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {briefs.filter(b => b.brief_type === 'weekly').length}
              </div>
              <div className="text-sm text-gray-500">Weekly Briefs</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Briefs List */}
      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Loading briefs...</p>
        </Card>
      ) : briefs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No briefs yet</h3>
          <p className="text-gray-500 mb-4">
            Generate your first executive brief to share insights with stakeholders
          </p>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate First Brief
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {briefs.map((brief) => (
            <Card key={brief.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{getBriefTypeIcon(brief.brief_type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{brief.title}</h3>
                        {getStatusBadge(brief.status)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(brief.period_start), 'MMM d')} - {format(new Date(brief.period_end), 'MMM d')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(brief.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {brief.summary && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-1">{brief.summary}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {brief.metrics && (
                      <div className="text-right text-sm">
                        <div className="text-gray-900 font-medium">
                          {brief.metrics.sentimentScore || '-'} sentiment
                        </div>
                        <div className="text-gray-500">
                          {brief.metrics.totalFeedback || 0} feedback
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewBrief(brief.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBrief(brief.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Executive Brief</DialogTitle>
            <DialogDescription>
              Create a new AI-generated briefing for your stakeholders
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Brief Type
            </label>
            <Select value={generateType} onValueChange={(v: any) => setGenerateType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">📅 Daily Brief</SelectItem>
                <SelectItem value="weekly">📆 Weekly Brief</SelectItem>
                <SelectItem value="monthly">🗓️ Monthly Brief</SelectItem>
              </SelectContent>
            </Select>
            
            <p className="text-sm text-gray-500 mt-2">
              {generateType === 'daily' && 'Covers the past 24 hours'}
              {generateType === 'weekly' && 'Covers the past 7 days'}
              {generateType === 'monthly' && 'Covers the past 30 days'}
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Brief
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
