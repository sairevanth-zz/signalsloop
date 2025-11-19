/**
 * Win/Loss Dashboard Components
 * Exports all Win/Loss related components
 */

// Export enhanced dashboard as default
export { EnhancedWinLossDashboard as WinLossDashboard } from './EnhancedWinLossDashboard';
export { DealUploadDialog } from './DealUploadDialog';
export { AutopsyDetailPanel } from './AutopsyDetailPanel';

// Legacy simple dashboard (for backwards compatibility)
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle, FileText, Download, RefreshCw } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SimpleDashboardProps {
  projectId: string;
  projectSlug: string;
}

export function SimpleDashboard({ projectId, projectSlug }: SimpleDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [autopsyLoading, setAutopsyLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }

  async function generateAutopsy(dealId: string) {
    try {
      setAutopsyLoading(true);
      const response = await fetch(`/api/deals/${dealId}/autopsy`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        // Reload dashboard to get updated autopsy
        await loadDashboardData();
        // Reload selected deal
        const deal = deals.find(d => d.id === dealId);
        if (deal) {
          setSelectedDeal({ ...deal, autopsy: data.autopsy });
        }
      }
    } catch (error) {
      console.error('Error generating autopsy:', error);
    } finally {
      setAutopsyLoading(false);
    }
  }

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

  // Prepare charts data
  const lossReasons = overview?.top_loss_reasons || [];
  const competitors = overview?.top_competitors || [];

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Win Rate</CardTitle>
            <Target className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revenue Lost</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${(revenueLost / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revenue Won</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${(revenueWon / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pipeline Value</CardTitle>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${(pipelineValue / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-gray-500 mt-1">{openDeals} open deals</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
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
                    label
                  >
                    {lossReasons.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
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
            <CardTitle>Competitor Win/Loss</CardTitle>
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
              <p className="text-sm text-gray-500 text-center py-12">No competitor data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deals Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Deals</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 text-sm font-medium text-gray-600">Deal</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-600">Amount</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-600">Competitor</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-600">Autopsy</th>
                  <th className="text-left p-2 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.slice(0, 20).map((deal) => (
                  <tr key={deal.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-sm">{deal.name}</td>
                    <td className="p-2 text-sm font-medium">
                      ${Number(deal.amount).toLocaleString()}
                    </td>
                    <td className="p-2">
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
                    <td className="p-2 text-sm">{deal.competitor || '-'}</td>
                    <td className="p-2">
                      {deal.autopsy_id ? (
                        <Badge variant="outline" className="bg-green-50">
                          <FileText className="w-3 h-3 mr-1" />
                          Available
                        </Badge>
                      ) : deal.needs_autopsy ? (
                        <Badge variant="outline" className="bg-yellow-50">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Needed
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-2">
                      {deal.autopsy_id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDeal(deal)}
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
                          Generate
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Autopsy Side Panel */}
      {selectedDeal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedDeal.name}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  ${Number(selectedDeal.amount).toLocaleString()} • {selectedDeal.status}
                </p>
              </div>
              <Button variant="outline" onClick={() => setSelectedDeal(null)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDeal.autopsy_summary ? (
                <>
                  <div>
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="text-sm text-gray-700">{selectedDeal.autopsy_summary}</p>
                  </div>

                  {selectedDeal.primary_reason && (
                    <div>
                      <h3 className="font-semibold mb-2">Primary Reason</h3>
                      <Badge>{selectedDeal.primary_reason}</Badge>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-2">Confidence</h3>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(selectedDeal.autopsy_confidence || 0) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {((selectedDeal.autopsy_confidence || 0) * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No autopsy available for this deal</p>
                  {selectedDeal.status !== 'open' && (
                    <Button onClick={() => generateAutopsy(selectedDeal.id)} disabled={autopsyLoading}>
                      {autopsyLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate Autopsy'
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
