'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

interface CallRecord {
  id: string;
  customer: string | null;
  deal_id: string | null;
  stage: string | null;
  amount: number | null;
  highlight_summary: string | null;
  sentiment: number | null;
  priority_score: number | null;
  competitors: any[];
  analyzed_at: string | null;
  created_at: string;
}

export function CallRecordsTable({ projectId }: { projectId: string }) {
  const supabase = getSupabaseClient();
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [projectId]);

  async function loadRecords() {
    if (!supabase) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('call_records')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  }

  const getSentimentBadge = (sentiment: number | null) => {
    if (sentiment === null) return null;

    if (sentiment > 0.3) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Positive
        </Badge>
      );
    }
    if (sentiment < -0.3) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          Negative
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        Neutral
      </Badge>
    );
  };

  const getPriorityBadge = (score: number | null) => {
    if (score === null) return null;

    if (score >= 80) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (score >= 60) {
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">High</Badge>;
    }
    if (score >= 40) {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Medium</Badge>;
    }
    return <Badge variant="secondary">Low</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call Records</CardTitle>
        <CardDescription>
          {records.length} call{records.length !== 1 ? 's' : ''} analyzed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No calls ingested yet</p>
            <p className="text-sm text-gray-400">
              Click "Ingest Calls" to start analyzing customer calls
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left text-sm text-gray-500">
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Deal</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Sentiment</th>
                  <th className="pb-3 pr-4">Priority</th>
                  <th className="pb-3 pr-4">Highlight</th>
                  <th className="pb-3 pr-4">Competitors</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((record) => (
                  <tr key={record.id} className="text-sm">
                    <td className="py-4 pr-4">
                      <div className="font-medium">
                        {record.customer || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {record.stage || '—'}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-gray-600">
                      {record.deal_id || '—'}
                    </td>
                    <td className="py-4 pr-4">
                      {record.amount ? (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            ${record.amount.toLocaleString()}
                          </span>
                          {record.sentiment && record.sentiment > 0.5 && (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          )}
                          {record.sentiment && record.sentiment < -0.5 && (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      {getSentimentBadge(record.sentiment)}
                    </td>
                    <td className="py-4 pr-4">
                      {getPriorityBadge(record.priority_score)}
                    </td>
                    <td className="py-4 pr-4 max-w-md">
                      {record.highlight_summary ? (
                        <div className="text-xs text-gray-600 line-clamp-2">
                          {record.highlight_summary}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      {record.competitors && record.competitors.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {record.competitors.slice(0, 2).map((comp: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {comp.name || comp.competitor}
                            </Badge>
                          ))}
                          {record.competitors.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{record.competitors.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4">
                      {record.analyzed_at ? (
                        <Badge variant="secondary">Analyzed</Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          Pending
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
