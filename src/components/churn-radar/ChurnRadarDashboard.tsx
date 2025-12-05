/**
 * Churn Radar Dashboard Component
 * Main dashboard for customer health monitoring
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CustomerHealth, ChurnAlert, ChurnRadarSummary } from '@/lib/churn-radar';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Users,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Activity,
  Shield,
  RefreshCw,
  Loader2,
  ChevronRight,
  Bell,
  CheckCircle,
  XCircle,
  Eye,
  Building,
  Mail,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface ChurnRadarDashboardProps {
  projectId: string;
  className?: string;
}

const RISK_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
};

const GRADE_COLORS = {
  A: 'bg-green-500',
  B: 'bg-blue-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
};

export function ChurnRadarDashboard({ projectId, className }: ChurnRadarDashboardProps) {
  const [summary, setSummary] = useState<ChurnRadarSummary | null>(null);
  const [customers, setCustomers] = useState<CustomerHealth[]>([]);
  const [alerts, setAlerts] = useState<ChurnAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerHealth | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('healthScore');
  
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load summary
      const summaryRes = await fetch(`/api/churn-radar?projectId=${projectId}&action=summary`);
      const summaryData = await summaryRes.json();
      setSummary(summaryData);
      
      // Load customers
      const customersRes = await fetch(
        `/api/churn-radar?projectId=${projectId}&action=customers&riskLevel=${riskFilter}&sortBy=${sortBy}&sortOrder=asc`
      );
      const customersData = await customersRes.json();
      setCustomers(customersData.customers || []);
      
      // Load alerts
      const alertsRes = await fetch(`/api/churn-radar/alerts?projectId=${projectId}`);
      const alertsData = await alertsRes.json();
      setAlerts(alertsData.alerts || []);
      
    } catch (error) {
      console.error('[ChurnRadarDashboard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, riskFilter, sortBy]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleAlertAction = async (alertId: string, status: string) => {
    try {
      await fetch('/api/churn-radar/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status }),
      });
      loadData();
    } catch (error) {
      console.error('[ChurnRadarDashboard] Error updating alert:', error);
    }
  };
  
  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
  };
  
  if (loading && !summary) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Churn Radar</h1>
          <p className="text-gray-500">Monitor customer health and prevent churn</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                <Badge variant="secondary">{summary.totalCustomers}</Badge>
              </div>
              <div className="text-2xl font-bold text-gray-900">{summary.avgHealthScore}</div>
              <div className="text-sm text-gray-500">Avg Health Score</div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-700">{summary.healthyCustomers}</div>
              <div className="text-sm text-green-600">Healthy Customers</div>
            </CardContent>
          </Card>
          
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-orange-700">{summary.atRiskCustomers}</div>
              <div className="text-sm text-orange-600">At Risk</div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-700">
                ${summary.totalRevenueAtRisk.toLocaleString()}
              </div>
              <div className="text-sm text-red-600">Revenue at Risk</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Alerts Banner */}
      {summary && summary.criticalAlerts > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Bell className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="font-semibold text-red-800">
                  {summary.criticalAlerts} Critical Alert{summary.criticalAlerts > 1 ? 's' : ''}
                </div>
                <div className="text-sm text-red-600">
                  Immediate attention required
                </div>
              </div>
            </div>
            <Button variant="destructive" size="sm">
              View Alerts
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Main Tabs */}
      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">
            Customers
            <Badge variant="secondary" className="ml-2">{customers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            <Badge variant="secondary" className="ml-2">{alerts.length}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="customers" className="mt-4">
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="healthScore">Health Score</SelectItem>
                <SelectItem value="mrr">MRR</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Customers List */}
          {customers.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-semibold text-gray-700 mb-2">No customers tracked</h3>
              <p className="text-sm text-gray-500">
                Customer health data will appear here once calculated
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => (
                <Card
                  key={customer.id}
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    customer.churnRisk === 'critical' ? 'border-l-4 border-l-red-500' :
                    customer.churnRisk === 'high' ? 'border-l-4 border-l-orange-500' : ''
                  }`}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Health Score Circle */}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                          GRADE_COLORS[customer.healthGrade as keyof typeof GRADE_COLORS] || 'bg-gray-400'
                        }`}>
                          <span className="text-white font-bold text-lg">{customer.healthGrade}</span>
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {customer.name || customer.email || 'Unknown'}
                            </h3>
                            <Badge className={`text-xs ${RISK_COLORS[customer.churnRisk]}`}>
                              {customer.churnRisk}
                            </Badge>
                          </div>
                          {customer.company && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {customer.company}
                            </div>
                          )}
                          {customer.email && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Health Score */}
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${getHealthColor(customer.healthScore)}`}>
                            {customer.healthScore}
                          </div>
                          <div className="text-xs text-gray-500">Health</div>
                        </div>
                        
                        {/* MRR */}
                        {customer.mrr && (
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">
                              ${customer.mrr.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">MRR</div>
                          </div>
                        )}
                        
                        {/* Trend */}
                        {customer.previousHealthScore && (
                          <div className="text-center">
                            {customer.healthScore > customer.previousHealthScore ? (
                              <TrendingUp className="h-6 w-6 text-green-500 mx-auto" />
                            ) : customer.healthScore < customer.previousHealthScore ? (
                              <TrendingDown className="h-6 w-6 text-red-500 mx-auto" />
                            ) : (
                              <Activity className="h-6 w-6 text-gray-400 mx-auto" />
                            )}
                            <div className="text-xs text-gray-500">Trend</div>
                          </div>
                        )}
                        
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    
                    {/* Score Breakdown Bar */}
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Engagement</div>
                        <Progress value={customer.engagementScore} className="h-2" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Sentiment</div>
                        <Progress value={customer.sentimentScore} className="h-2" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Support</div>
                        <Progress value={customer.supportScore} className="h-2" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Usage</div>
                        <Progress value={customer.productUsageScore} className="h-2" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Payment</div>
                        <Progress value={customer.paymentScore} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="alerts" className="mt-4">
          {alerts.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="font-semibold text-gray-700 mb-2">No active alerts</h3>
              <p className="text-sm text-gray-500">
                You&apos;ll be notified when customer health issues are detected
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`${
                    alert.severity === 'critical' ? 'border-l-4 border-l-red-500' :
                    alert.severity === 'high' ? 'border-l-4 border-l-orange-500' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          alert.severity === 'critical' ? 'bg-red-100' :
                          alert.severity === 'high' ? 'bg-orange-100' :
                          'bg-yellow-100'
                        }`}>
                          <AlertCircle className={`h-5 w-5 ${
                            alert.severity === 'critical' ? 'text-red-600' :
                            alert.severity === 'high' ? 'text-orange-600' :
                            'text-yellow-600'
                          }`} />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                            <Badge className={`text-xs ${SEVERITY_COLORS[alert.severity]}`}>
                              {alert.severity}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                          
                          {alert.customer && (
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <Building className="h-3 w-3" />
                              {alert.customer.company || alert.customer.name || alert.customer.email}
                              {alert.customer.mrr && (
                                <span className="text-green-600">
                                  ${alert.customer.mrr.toLocaleString()}/mo
                                </span>
                              )}
                            </div>
                          )}
                          
                          {alert.recommendedAction && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                              <strong>Recommended:</strong> {alert.recommendedAction}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAlertAction(alert.id, 'acknowledged')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAlertAction(alert.id, 'resolved')}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAlertAction(alert.id, 'dismissed')}
                        >
                          <XCircle className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Customer Detail Modal would go here */}
    </div>
  );
}
