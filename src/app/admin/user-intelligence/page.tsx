'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  Search,
  Download,
  ExternalLink,
  Linkedin,
  Twitter,
  Globe,
  MapPin,
  Building,
  Briefcase,
  TrendingUp,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Loader2,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface UserIntelligence {
  user_id: string;
  email: string;
  name: string | null;
  plan: string | null;
  created_at: string;
  company_name: string | null;
  company_domain: string | null;
  company_size: string | null;
  industry: string | null;
  role: string | null;
  seniority_level: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  github_username: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  confidence_score: number | null;
  data_sources: string[];
  enriched_at: string | null;
  has_enrichment: boolean;
}

export default function AdminUserIntelligencePage() {
  const { isAdmin, loading: authLoading, getAccessToken } = useAdminAuth();
  const [intelligence, setIntelligence] = useState<UserIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [reEnrichingUser, setReEnrichingUser] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    withCompany: 0,
    withTwitter: 0,
    withLinkedin: 0,
    avgConfidence: 0,
    pending: 0
  });
  const [enriching, setEnriching] = useState(false);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<'all' | 'enriched' | 'pending'>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      window.location.href = '/login';
    }
  }, [authLoading, isAdmin]);

  const loadData = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      toast.error('Admin authorization missing. Please refresh.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/user-intelligence?sort=${sortField}&order=${sortOrder}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIntelligence(data.data || []);

        // Calculate stats
        const total = data.data.length;
        const enriched = data.data.filter((u: UserIntelligence) => u.has_enrichment);
        const withCompany = data.data.filter((u: UserIntelligence) => u.company_name).length;
        const withTwitter = data.data.filter((u: UserIntelligence) => u.twitter_url).length;
        const withLinkedin = data.data.filter((u: UserIntelligence) => u.linkedin_url).length;
        const avgConfidence = enriched.length > 0
          ? enriched.reduce((sum: number, u: UserIntelligence) => sum + (u.confidence_score || 0), 0) / enriched.length
          : 0;
        const pending = data.data.filter((u: UserIntelligence) => !u.has_enrichment).length;

        setStats({
          total,
          withCompany,
          withTwitter,
          withLinkedin,
          avgConfidence,
          pending
        });
      } else {
        toast.error('Failed to load user intelligence data');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, sortField, sortOrder]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, loadData]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const runEnrichmentForPending = async () => {
    const pendingUsers = intelligence.filter(u => !u.has_enrichment);
    if (pendingUsers.length === 0) {
      toast.info('No pending users to enrich');
      return;
    }

    setEnriching(true);
    toast.info(`Starting enrichment for ${pendingUsers.length} users...`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of pendingUsers.slice(0, 10)) { // Limit to 10 at a time to avoid overload
      try {
        const response = await fetch('/api/users/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.user_id, runAsync: false })
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          console.error('Enrichment failed for:', user.email, await response.text());
        }
      } catch (error) {
        errorCount++;
        console.error('Enrichment error for:', user.email, error);
      }
    }

    setEnriching(false);

    if (successCount > 0) {
      toast.success(`Enriched ${successCount} users successfully`);
      loadData(); // Refresh the data
    }
    if (errorCount > 0) {
      toast.error(`Failed to enrich ${errorCount} users`);
    }
  };

  const reEnrichSingleUser = async (userId: string, email: string) => {
    setReEnrichingUser(userId);
    toast.info(`Re-enriching ${email}...`);

    try {
      // First, delete existing enrichment data to force re-enrichment
      const response = await fetch('/api/users/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, runAsync: false, forceRefresh: true })
      });

      if (response.ok) {
        toast.success(`Successfully re-enriched ${email}`);
        loadData(); // Refresh the data
      } else {
        const error = await response.text();
        toast.error(`Failed to re-enrich: ${error}`);
      }
    } catch (error) {
      console.error('Re-enrich error:', error);
      toast.error('Failed to re-enrich user');
    } finally {
      setReEnrichingUser(null);
    }
  };

  const getConfidenceBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline" className="bg-gray-100">⏳ Pending</Badge>;
    if (score >= 0.8) return <Badge className="bg-green-500">🟢 {Math.round(score * 100)}%</Badge>;
    if (score >= 0.5) return <Badge className="bg-yellow-500">🟡 {Math.round(score * 100)}%</Badge>;
    return <Badge className="bg-red-500">🔴 {Math.round(score * 100)}%</Badge>;
  };

  const getPlanBadge = (plan: string | null) => {
    switch (plan?.toLowerCase()) {
      case 'pro-monthly':
      case 'pro-annual':
        return <Badge className="bg-purple-500">💎 Pro</Badge>;
      case 'pro-gift':
        return <Badge className="bg-pink-500">🎁 Gift</Badge>;
      case 'pro-discount':
        return <Badge className="bg-blue-500">🎟️ Discount</Badge>;
      default:
        return <Badge variant="outline">🆓 Free</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Email',
      'Name',
      'Company',
      'Role',
      'Seniority',
      'Industry',
      'Location',
      'Plan',
      'Confidence',
      'LinkedIn',
      'GitHub',
      'Twitter',
      'Data Sources',
      'Created'
    ];

    const rows = filteredIntelligence.map(u => [
      u.email,
      u.name || '',
      u.company_name || '',
      u.role || '',
      u.seniority_level || '',
      u.industry || '',
      u.location || '',
      u.plan || '',
      u.confidence_score !== null ? u.confidence_score : 'Pending',
      u.linkedin_url || '',
      u.github_url || '',
      u.twitter_url || '',
      u.data_sources.join('; '),
      new Date(u.created_at).toLocaleDateString()
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-intelligence-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const filteredIntelligence = intelligence.filter(u => {
    // Text search
    const search = searchTerm.toLowerCase();
    const matchesSearch = (
      u.email.toLowerCase().includes(search) ||
      u.name?.toLowerCase().includes(search) ||
      u.company_name?.toLowerCase().includes(search) ||
      u.role?.toLowerCase().includes(search)
    );
    if (!matchesSearch) return false;

    // Enrichment status filter
    if (filterStatus === 'enriched' && !u.has_enrichment) return false;
    if (filterStatus === 'pending' && u.has_enrichment) return false;

    // Plan filter
    if (filterPlan !== 'all') {
      const userPlan = (u.plan || 'free').toLowerCase();
      if (filterPlan === 'pro' && !userPlan.includes('pro')) return false;
      if (filterPlan === 'free' && userPlan !== 'free') return false;
      if (filterPlan === 'gift' && !userPlan.includes('gift')) return false;
      if (filterPlan === 'discount' && !userPlan.includes('discount')) return false;
    }

    // Confidence filter
    if (filterConfidence !== 'all') {
      const score = u.confidence_score;
      if (filterConfidence === 'high' && (score === null || score < 0.7)) return false;
      if (filterConfidence === 'medium' && (score === null || score < 0.4 || score >= 0.7)) return false;
      if (filterConfidence === 'low' && (score === null || score >= 0.4)) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterPlan('all');
    setFilterConfidence('all');
  };

  const hasActiveFilters = searchTerm || filterStatus !== 'all' || filterPlan !== 'all' || filterConfidence !== 'all';

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            User Intelligence
          </h1>
          <p className="text-gray-600 mt-1">
            Enriched user data from multiple sources
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runEnrichmentForPending}
            variant="outline"
            disabled={enriching || stats.pending === 0}
            className="bg-amber-50 border-amber-200 hover:bg-amber-100"
          >
            {enriching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {enriching ? 'Enriching...' : `Run Enrichment (${stats.pending})`}
          </Button>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} disabled={filteredIntelligence.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">With Company</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withCompany}</div>
            <p className="text-xs text-gray-500">{stats.total > 0 ? Math.round((stats.withCompany / stats.total) * 100) : 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">With Twitter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withTwitter}</div>
            <p className="text-xs text-gray-500">{stats.total > 0 ? Math.round((stats.withTwitter / stats.total) * 100) : 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">With LinkedIn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withLinkedin}</div>
            <p className="text-xs text-gray-500">{stats.total > 0 ? Math.round((stats.withLinkedin / stats.total) * 100) : 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avgConfidence * 100)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by email, name, company, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters:</span>
            </div>

            {/* Enrichment Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'enriched' | 'pending')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="enriched">✅ Enriched</option>
              <option value="pending">⏳ Pending</option>
            </select>

            {/* Plan Filter */}
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Plans</option>
              <option value="pro">💎 Pro</option>
              <option value="gift">🎁 Gift</option>
              <option value="discount">🎟️ Discount</option>
              <option value="free">🆓 Free</option>
            </select>

            {/* Confidence Filter */}
            <select
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(e.target.value as 'all' | 'high' | 'medium' | 'low')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Confidence</option>
              <option value="high">🟢 High (70%+)</option>
              <option value="medium">🟡 Medium (40-70%)</option>
              <option value="low">🔴 Low (&lt;40%)</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}

            {/* Results count */}
            <span className="text-sm text-gray-500 ml-auto">
              Showing {filteredIntelligence.length} of {intelligence.length} users
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Intelligence Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredIntelligence.length})</CardTitle>
          <CardDescription>
            Click on any row to view full details. Users with enrichment data are highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredIntelligence.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('email')}>
                      <div className="flex items-center gap-1">
                        User
                        {sortField === 'email' && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('company_name')}>
                      <div className="flex items-center gap-1">
                        Company
                        {sortField === 'company_name' && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('role')}>
                      <div className="flex items-center gap-1">
                        Role
                        {sortField === 'role' && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profiles
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('confidence_score')}>
                      <div className="flex items-center gap-1">
                        Confidence
                        {sortField === 'confidence_score' && (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIntelligence.map((user) => (
                    <React.Fragment key={user.user_id}>
                      <tr
                        className={`hover:bg-gray-50 cursor-pointer ${!user.has_enrichment ? 'opacity-60' : ''}`}
                        onClick={() => setExpandedRow(expandedRow === user.user_id ? null : user.user_id)}
                      >
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{user.name || 'Unknown'}</span>
                            <span className="text-sm text-gray-500">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {user.company_name ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{user.company_name}</span>
                              {user.industry && <span className="text-xs text-gray-500">{user.industry}</span>}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {user.role ? (
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-900">{user.role}</span>
                              {user.seniority_level && <Badge variant="outline" className="text-xs mt-1 w-fit">{user.seniority_level}</Badge>}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            {user.linkedin_url && (
                              <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                onClick={(e) => e.stopPropagation()}>
                                <Linkedin className="h-4 w-4" />
                              </a>
                            )}
                            {user.twitter_url && (
                              <a href={user.twitter_url} target="_blank" rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-600"
                                onClick={(e) => e.stopPropagation()}>
                                <Twitter className="h-4 w-4" />
                              </a>
                            )}
                            {user.website && (
                              <a href={user.website} target="_blank" rel="noopener noreferrer"
                                className="text-gray-600 hover:text-gray-800"
                                onClick={(e) => e.stopPropagation()}>
                                <Globe className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {getConfidenceBadge(user.confidence_score)}
                        </td>
                        <td className="px-4 py-4">
                          {getPlanBadge(user.plan)}
                        </td>
                      </tr>
                      {expandedRow === user.user_id && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {user.bio && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Bio</h4>
                                  <p className="text-sm text-gray-600 italic">{user.bio}</p>
                                </div>
                              )}
                              {user.location && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Location</h4>
                                  <p className="text-sm text-gray-600 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {user.location}
                                  </p>
                                </div>
                              )}
                              {user.company_size && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Company Size</h4>
                                  <p className="text-sm text-gray-600">{user.company_size}</p>
                                </div>
                              )}
                              {user.company_domain && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Company Domain</h4>
                                  <p className="text-sm text-gray-600">{user.company_domain}</p>
                                </div>
                              )}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Data Sources</h4>
                                <div className="flex flex-wrap gap-1">
                                  {user.data_sources.map(source => (
                                    <Badge key={source} variant="outline" className="text-xs">
                                      {source}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Enriched Date</h4>
                                <p className="text-sm text-gray-600">
                                  {user.enriched_at ? new Date(user.enriched_at).toLocaleString() : 'N/A'}
                                </p>
                              </div>
                              <div className="md:col-span-2 pt-2 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={reEnrichingUser === user.user_id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    reEnrichSingleUser(user.user_id, user.email);
                                  }}
                                  className="bg-amber-50 border-amber-300 hover:bg-amber-100"
                                >
                                  {reEnrichingUser === user.user_id ? (
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                  )}
                                  {reEnrichingUser === user.user_id ? 'Re-enriching...' : 'Re-enrich This User'}
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
