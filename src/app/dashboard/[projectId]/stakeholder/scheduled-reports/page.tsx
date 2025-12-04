'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Clock,
  Calendar,
  Mail,
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface ScheduledReport {
  id: string;
  report_name: string;
  query_text: string;
  user_role: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time_of_day: string;
  day_of_week?: number;
  day_of_month?: number;
  timezone: string;
  recipients: string[];
  delivery_method: 'email' | 'slack';
  slack_webhook_url?: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  run_count: number;
  created_at: string;
}

export default function ScheduledReportsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    report_name: '',
    query_text: '',
    user_role: 'product',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    time_of_day: '09:00',
    day_of_week: 1,
    day_of_month: 1,
    timezone: 'UTC',
    recipients: '',
    delivery_method: 'email' as 'email' | 'slack',
    slack_webhook_url: '',
  });

  useEffect(() => {
    fetchReports();
  }, [projectId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not initialized');

      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/stakeholder/scheduled-reports?projectId=${projectId}`,
        { headers }
      );

      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('[Scheduled Reports] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not initialized');

      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const payload = {
        projectId,
        report_name: formData.report_name,
        query_text: formData.query_text,
        user_role: formData.user_role,
        frequency: formData.frequency,
        time_of_day: formData.time_of_day,
        day_of_week: formData.frequency === 'weekly' ? formData.day_of_week : undefined,
        day_of_month: formData.frequency === 'monthly' ? formData.day_of_month : undefined,
        timezone: formData.timezone,
        recipients: formData.recipients.split(',').map(r => r.trim()),
        delivery_method: formData.delivery_method,
        slack_webhook_url: formData.delivery_method === 'slack' ? formData.slack_webhook_url : undefined,
      };

      const url = editingReport
        ? `/api/stakeholder/scheduled-reports/${editingReport.id}`
        : '/api/stakeholder/scheduled-reports';

      const method = editingReport ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save report');

      await fetchReports();
      setShowCreateDialog(false);
      setEditingReport(null);
      resetForm();
    } catch (error) {
      console.error('[Create/Update Report] Error:', error);
      alert('Failed to save scheduled report. Please try again.');
    }
  };

  const handleToggleActive = async (reportId: string, currentStatus: boolean) => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not initialized');

      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/stakeholder/scheduled-reports/${reportId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to toggle report');

      await fetchReports();
    } catch (error) {
      console.error('[Toggle Report] Error:', error);
      alert('Failed to toggle report status.');
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not initialized');

      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/stakeholder/scheduled-reports/${reportId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) throw new Error('Failed to delete report');

      await fetchReports();
    } catch (error) {
      console.error('[Delete Report] Error:', error);
      alert('Failed to delete report.');
    }
  };

  const handleEdit = (report: ScheduledReport) => {
    setEditingReport(report);
    setFormData({
      report_name: report.report_name,
      query_text: report.query_text,
      user_role: report.user_role,
      frequency: report.frequency,
      time_of_day: report.time_of_day,
      day_of_week: report.day_of_week || 1,
      day_of_month: report.day_of_month || 1,
      timezone: report.timezone,
      recipients: report.recipients.join(', '),
      delivery_method: report.delivery_method,
      slack_webhook_url: report.slack_webhook_url || '',
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setFormData({
      report_name: '',
      query_text: '',
      user_role: 'product',
      frequency: 'weekly',
      time_of_day: '09:00',
      day_of_week: 1,
      day_of_month: 1,
      timezone: 'UTC',
      recipients: '',
      delivery_method: 'email',
      slack_webhook_url: '',
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getFrequencyLabel = (report: ScheduledReport) => {
    if (report.frequency === 'daily') return 'Daily';
    if (report.frequency === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[report.day_of_week || 0]}`;
    }
    if (report.frequency === 'monthly') {
      return `Monthly on day ${report.day_of_month}`;
    }
    return report.frequency;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 mt-3">Loading scheduled reports...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Clock className="w-8 h-8 text-purple-600" />
            Scheduled Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Automate stakeholder intelligence reports via email
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/${projectId}/stakeholder`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={() => {
                  setEditingReport(null);
                  resetForm();
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Report
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingReport ? 'Edit' : 'Create'} Scheduled Report</DialogTitle>
                <DialogDescription>
                  Schedule regular stakeholder intelligence reports to be delivered automatically
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Report Name */}
                <div>
                  <Label htmlFor="report_name">Report Name</Label>
                  <Input
                    id="report_name"
                    value={formData.report_name}
                    onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                    placeholder="Weekly Product Update"
                  />
                </div>

                {/* Query */}
                <div>
                  <Label htmlFor="query_text">Query</Label>
                  <Textarea
                    id="query_text"
                    value={formData.query_text}
                    onChange={(e) => setFormData({ ...formData, query_text: e.target.value })}
                    placeholder="What are the top themes in customer feedback?"
                    rows={3}
                  />
                </div>

                {/* Role */}
                <div>
                  <Label htmlFor="user_role">Role Perspective</Label>
                  <Select
                    value={formData.user_role}
                    onValueChange={(value) => setFormData({ ...formData, user_role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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

                {/* Frequency */}
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Day of Week (for weekly) */}
                {formData.frequency === 'weekly' && (
                  <div>
                    <Label htmlFor="day_of_week">Day of Week</Label>
                    <Select
                      value={formData.day_of_week.toString()}
                      onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Day of Month (for monthly) */}
                {formData.frequency === 'monthly' && (
                  <div>
                    <Label htmlFor="day_of_month">Day of Month (1-31)</Label>
                    <Input
                      id="day_of_month"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.day_of_month}
                      onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
                    />
                  </div>
                )}

                {/* Time of Day */}
                <div>
                  <Label htmlFor="time_of_day">Time of Day</Label>
                  <Input
                    id="time_of_day"
                    type="time"
                    value={formData.time_of_day}
                    onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                  />
                </div>

                {/* Timezone */}
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Method */}
                <div>
                  <Label htmlFor="delivery_method">Delivery Method</Label>
                  <Select
                    value={formData.delivery_method}
                    onValueChange={(value: any) => setFormData({ ...formData, delivery_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="slack">Slack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipients */}
                <div>
                  <Label htmlFor="recipients">
                    {formData.delivery_method === 'email' ? 'Email Recipients (comma-separated)' : 'Slack Channel'}
                  </Label>
                  <Input
                    id="recipients"
                    value={formData.recipients}
                    onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                    placeholder={
                      formData.delivery_method === 'email'
                        ? 'john@example.com, jane@example.com'
                        : '#stakeholder-reports'
                    }
                  />
                </div>

                {/* Slack Webhook (if slack) */}
                {formData.delivery_method === 'slack' && (
                  <div>
                    <Label htmlFor="slack_webhook_url">Slack Webhook URL</Label>
                    <Input
                      id="slack_webhook_url"
                      value={formData.slack_webhook_url}
                      onChange={(e) => setFormData({ ...formData, slack_webhook_url: e.target.value })}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingReport(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrUpdate}
                  disabled={!formData.report_name || !formData.query_text || !formData.recipients}
                >
                  {editingReport ? 'Update' : 'Create'} Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No scheduled reports yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create your first scheduled report to receive automated stakeholder intelligence
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create First Report
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {report.report_name}
                    </h3>
                    <Badge variant={report.is_active ? 'default' : 'secondary'}>
                      {report.is_active ? 'Active' : 'Paused'}
                    </Badge>
                    <Badge variant="outline">{report.user_role.replace('_', ' ')}</Badge>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {report.query_text}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-500 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Schedule
                      </p>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                        {getFrequencyLabel(report)} at {report.time_of_day}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-500 flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        Delivery
                      </p>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                        {report.delivery_method} ({report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''})
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-500">Last Run</p>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                        {formatDate(report.last_run_at)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-500">Next Run</p>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                        {report.is_active ? formatDate(report.next_run_at) : 'Paused'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                    Executed {report.run_count} time{report.run_count !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(report.id, report.is_active)}
                    title={report.is_active ? 'Pause report' : 'Activate report'}
                  >
                    {report.is_active ? (
                      <PowerOff className="w-4 h-4 text-orange-600" />
                    ) : (
                      <Power className="w-4 h-4 text-green-600" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(report)}
                    title="Edit report"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(report.id)}
                    title="Delete report"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
