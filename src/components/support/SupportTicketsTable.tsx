'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface SupportTicket {
  id: string;
  external_id: string;
  subject: string;
  body: string;
  customer: string;
  plan: string;
  arr_value: number;
  created_at: string;
  analyzed_at: string;
  sentiment_score: number;
  sentiment_category: string;
  priority_score: number;
  theme_name: string;
  post_id: string;
  post_title: string;
}

interface SupportTicketsTableProps {
  projectId: string;
}

export function SupportTicketsTable({ projectId }: SupportTicketsTableProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50;

  const supabase = getSupabaseClient();

  async function loadTickets() {
    if (!supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_ticket_summary')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      setTickets(data || []);
      setHasMore(data && data.length === pageSize);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, [projectId, page, supabase]);

  function getSentimentBadge(score: number, category: string) {
    if (!score && !category) return null;

    const colors = {
      positive: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      neutral: 'bg-gray-100 text-gray-800',
      mixed: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <Badge className={colors[category as keyof typeof colors] || colors.neutral}>
        {category} ({score >= 0 ? '+' : ''}{score?.toFixed(2) || '0.00'})
      </Badge>
    );
  }

  function getPriorityBadge(score: number) {
    if (!score) return null;

    let color = 'bg-gray-100 text-gray-800';
    if (score >= 8) color = 'bg-red-100 text-red-800';
    else if (score >= 6) color = 'bg-orange-100 text-orange-800';
    else if (score >= 4) color = 'bg-yellow-100 text-yellow-800';

    return (
      <Badge className={color}>
        P{score}
      </Badge>
    );
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading tickets...</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No support tickets found</p>
        <p className="text-sm text-gray-500">
          Click "Ingest Tickets" to upload your support data
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Subject</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Theme</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>ARR</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <div className="font-medium truncate max-w-xs" title={ticket.subject}>
                    {ticket.subject}
                  </div>
                  {ticket.external_id && (
                    <div className="text-xs text-gray-500">
                      ID: {ticket.external_id}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{ticket.customer || '-'}</div>
                  {ticket.plan && (
                    <div className="text-xs text-gray-500">{ticket.plan}</div>
                  )}
                </TableCell>
                <TableCell>
                  {ticket.theme_name ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{ticket.theme_name}</span>
                      {ticket.post_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(`/posts/${ticket.post_id}`, '_blank')}
                          title="View related roadmap post"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Not analyzed</span>
                  )}
                </TableCell>
                <TableCell>
                  {getSentimentBadge(ticket.sentiment_score, ticket.sentiment_category)}
                </TableCell>
                <TableCell>
                  {getPriorityBadge(ticket.priority_score)}
                </TableCell>
                <TableCell>
                  {ticket.arr_value ? (
                    <span className="text-sm font-medium">
                      ${ticket.arr_value.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  {ticket.analyzed_at ? (
                    <Badge className="bg-green-100 text-green-800">Analyzed</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {page * pageSize + 1} - {page * pageSize + tickets.length} tickets
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
