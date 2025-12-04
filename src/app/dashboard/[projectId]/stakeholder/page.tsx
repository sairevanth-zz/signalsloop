'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ComponentListRenderer } from '@/components/stakeholder/ComponentRenderer';
import { StakeholderRole, QueryResponse, StakeholderQuery } from '@/types/stakeholder';
import { exportToPDF } from '@/lib/stakeholder/pdf-export';
import { Send, Loader2, Sparkles, MessageSquare, Star, Download, History, BarChart3 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function StakeholderPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [query, setQuery] = useState('');
  const [role, setRole] = useState<StakeholderRole>('product');
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<QueryResponse[]>([]);
  const [queries, setQueries] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);

  // Example queries to help users get started
  const exampleQueries: Record<StakeholderRole, string[]> = {
    ceo: [
      'What are the top 3 competitive threats this quarter?',
      'Show me sentiment trends and churn risk indicators',
      'What features are driving the most value for enterprise customers?',
    ],
    sales: [
      'What new features can I sell to prospects?',
      'Show me customer success stories from recent feedback',
      'How do we compare to competitors on key features?',
    ],
    engineering: [
      'What are the most reported technical issues?',
      'Show me performance and bug-related feedback',
      'What features are requested most by technical users?',
    ],
    marketing: [
      'What features should we announce this month?',
      'Show me positive customer testimonials',
      'What are our key differentiators vs competitors?',
    ],
    customer_success: [
      'Which customers are at risk based on sentiment?',
      'What are the top customer pain points?',
      'Show me recent feedback from enterprise accounts',
    ],
    product: [
      'What themes are trending in customer feedback?',
      'Show me feature performance and adoption metrics',
      'What should we prioritize on the roadmap?',
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    await submitQuery(query);
  };

  const submitQuery = async (queryText: string) => {
    setLoading(true);
    setQueries([...queries, queryText]);

    try {
      // Get auth token
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/stakeholder/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: queryText,
          role,
          projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process query');
      }

      const result: QueryResponse = await response.json();
      setResponses([...responses, result]);
      setQuery('');
    } catch (error) {
      console.error('[Stakeholder] Error:', error);
      // Show error message to user
      alert('Failed to process your query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  const handleFollowUpClick = (followUpQuery: string) => {
    submitQuery(followUpQuery);
  };

  const handleExport = async (index: number) => {
    setExportingIndex(index);
    try {
      await exportToPDF(
        queries[index],
        role,
        responses[index].components,
        projectId
      );
    } catch (error) {
      console.error('[Export] Error:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExportingIndex(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            Stakeholder Intelligence
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Ask questions, get insights tailored to your role
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/${projectId}/stakeholder/history`)}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            History
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/${projectId}/stakeholder/analytics`)}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>

          {/* Role Selector */}
          <Select value={role} onValueChange={(value) => setRole(value as StakeholderRole)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ceo">CEO</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="customer_success">Customer Success</SelectItem>
              <SelectItem value="product">Product</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Example Queries */}
      {responses.length === 0 && (
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-600" />
            Try asking (as {role}):
          </h3>
          <div className="flex flex-wrap gap-2">
            {exampleQueries[role].map((example, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleExampleClick(example)}
                className="text-left justify-start h-auto py-2 px-3 hover:bg-purple-100 dark:hover:bg-purple-900/50"
              >
                {example}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Query Input */}
      <Card className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ask anything about your product... (as ${role})`}
              className="min-h-[100px] resize-none"
              disabled={loading}
            />

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                AI will generate a custom dashboard based on your question
              </p>

              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Ask
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Responses */}
      {responses.map((response, idx) => (
        <div key={idx} className="space-y-4">
          {/* User Query */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <p className="text-gray-800 dark:text-gray-200 font-medium">
              {queries[idx]}
            </p>
            <Badge className="mt-2" variant="secondary">
              {role}
            </Badge>
          </Card>

          {/* AI Response Components */}
          <ComponentListRenderer components={response.components} projectId={projectId} />

          {/* Follow-up Questions */}
          {response.follow_up_questions && response.follow_up_questions.length > 0 && (
            <Card className="p-4 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Follow-up questions:
              </p>
              <div className="flex flex-wrap gap-2">
                {response.follow_up_questions.map((followUp, fIdx) => (
                  <Button
                    key={fIdx}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFollowUpClick(followUp)}
                    disabled={loading}
                    className="text-left justify-start"
                  >
                    {followUp}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Actions and Metadata */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Generated in {response.metadata.generation_time_ms}ms • Powered by Claude Sonnet 4 • {response.components.length} components
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport(idx)}
              disabled={exportingIndex === idx}
              className="gap-2"
            >
              {exportingIndex === idx ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export HTML
                </>
              )}
            </Button>
          </div>
        </div>
      ))}

      {/* Loading State */}
      {loading && (
        <Card className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Analyzing your question and generating insights...
          </span>
        </Card>
      )}
    </div>
  );
}
