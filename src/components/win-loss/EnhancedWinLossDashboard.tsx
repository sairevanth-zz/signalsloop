/**
 * Enhanced Win/Loss Dashboard Component
 * Full-featured dashboard with CSV upload, filters, charts, and detailed views
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
  FileText,
  Download,
  RefreshCw,
  Upload,
  Search,
  Filter,
  Trophy,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { DealUploadDialog } from './DealUploadDialog';
import { AutopsyDetailPanel } from './AutopsyDetailPanel';
import { toast } from 'sonner';

interface EnhancedWinLossDashboardProps {
  projectId: string;
  projectSlug: string;
}

export function EnhancedWinLossDashboard({ projectId, projectSlug }: EnhancedWinLossDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [autopsyLoading, setAutopsyLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [projectId]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const response = await fetch(`/api/deals/overview?projectId=${projectId}&days=30`);
      const data = await response.json();

      if (data.success) {
        setOverview(data.overview);
        setDeals(data.deals || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  async function generateAutopsy(dealId: string) {
    try {
      setAutopsyLoading(true);
      toast.info('Generating autopsy... This may take a moment.');

      const response = await fetch(`/api/deals/${dealId}/autopsy`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Autopsy generated successfully!');
        await loadDashboardData();

        // Load and show the autopsy
        const autopsyResponse = await fetch(`/api/deals/${dealId}/autopsy`);
        const autopsyData = await autopsyResponse.json();

        if (autopsyData.success) {
          setSelectedDeal({
            ...autopsyData.autopsy.deals,
            autopsy: autopsyData.autopsy,
          });
        }
      } else {
        toast.error(data.error || 'Failed to generate autopsy');
      }
    } catch (error) {
      console.error('Error generating autopsy:', error);
      toast.error('Failed to generate autopsy');
    } finally {
      setAutopsyLoading(false);
    }
  }

  async function viewAutopsy(deal: any) {
    if (!deal.autopsy_id) return;

    try {
      const response = await fetch(`/api/deals/${deal.id}/autopsy`);
      const data = await response.json();

      if (data.success) {
        setSelectedDeal({
          ...data.autopsy.deals,
          autopsy: data.autopsy,
        });
      }
    } catch (error) {
      console.error('Error loading autopsy:', error);
      toast.error('Failed to load autopsy');
    }
  }

  const filteredDeals = deals.filter((deal) => {
    if (statusFilter !== 'all' && deal.status !== statusFilter) return false;
    if (
      searchTerm &&
      !deal.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !deal.competitor?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const winRate = overview?.win_rate || 0;
  const revenueLost = Number(overview?.revenue_lost || 0);
  const revenueWon = Number(overview?.revenue_won || 0);
  const openDeals = overview?.open_deals || 0;
  const pipelineValue = Number(overview?.revenue_in_pipeline || 0);
  const recentLosses = overview?.recent_losses || 0;

  const lossReasons = overview?.top_loss_reasons || [];
  const competitors = overview?.top_competitors || [];

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deals</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="open">Open</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-blue-600 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Revenue Lost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">
              ${(revenueLost / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-red-600 mt-1">{recentLosses} recent losses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Revenue Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              ${(revenueWon / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-green-600 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              ${(pipelineValue / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-purple-600 mt-1">{openDeals} open deals</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Avg Deal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900">
              ${((overview?.avg_deal_size || 0) / 1000).toFixed(0)}k
            </div>
            <p className="text-xs text-amber-600 mt-1">Average size</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Loss Reasons Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Loss Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                {lossReasons.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={lossReasons}
                        dataKey="count"
                        nameKey="reason"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.reason}: ${entry.count}`}
                      >
                        {lossReasons.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-12">No loss data available</p>
                )}
              </CardContent>
            </Card>

            {/* Competitors Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Competitor Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {competitors.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={competitors}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="competitor" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="won_count" fill="#22c55e" name="Won" />
                      <Bar dataKey="lost_count" fill="#ef4444" name="Lost" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-12">
                    No competitor data available
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Deals ({filteredDeals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Deal</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">
                        Competitor
                      </th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Autopsy</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeals.slice(0, 50).map((deal) => (
                      <tr key={deal.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <div>
                            <div className="font-medium text-gray-900">{deal.name}</div>
                            {deal.contact_company && (
                              <div className="text-xs text-gray-500">{deal.contact_company}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-gray-900">
                          ${Number(deal.amount).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              deal.status === 'won'
                                ? 'default'
                                : deal.status === 'lost'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {deal.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-gray-700">{deal.competitor || '-'}</td>
                        <td className="p-3">
                          {deal.autopsy_id ? (
                            <Badge variant="outline" className="bg-green-50 border-green-200">
                              <FileText className="w-3 h-3 mr-1" />
                              Ready
                            </Badge>
                          ) : deal.needs_autopsy ? (
                            <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {deal.autopsy_id ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewAutopsy(deal)}
                              >
                                View
                              </Button>
                            ) : deal.status !== 'open' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateAutopsy(deal.id)}
                                disabled={autopsyLoading}
                              >
                                {autopsyLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  'Generate'
                                )}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon: Advanced Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Advanced analytics including revenue trends, cohort analysis, and predictive modeling
                will be available soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Autopsy Detail Panel */}
      {selectedDeal && selectedDeal.autopsy && (
        <AutopsyDetailPanel
          deal={selectedDeal}
          autopsy={selectedDeal.autopsy}
          onClose={() => setSelectedDeal(null)}
          onRegenerate={() => {
            setSelectedDeal(null);
            generateAutopsy(selectedDeal.id);
          }}
          regenerating={autopsyLoading}
        />
      )}

      {/* Upload Dialog */}
      <DealUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={projectId}
        onSuccess={loadDashboardData}
      />
    </div>
  );
}
