'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Plus, TrendingUp, Mail, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { StakeholderCard } from '@/components/stakeholders/StakeholderCard';
import { AddStakeholderModal } from '@/components/stakeholders/AddStakeholderModal';
import { getSupabaseClient } from '@/lib/supabase-client';

interface Stakeholder {
  id: string;
  name: string;
  email: string;
  role: 'ceo' | 'sales' | 'engineering' | 'marketing' | 'customer_success';
  notification_preferences: {
    frequency: string;
    email_enabled: boolean;
  };
  created_at: string;
  access_token?: string;
}

interface StakeholderWithStats extends Stakeholder {
  report_count: number;
  last_report_sent: string | null;
  total_opens: number;
  total_clicks: number;
}

export default function StakeholdersPage() {
  const params = useParams();
  const projectSlug = params.slug as string;
  const [stakeholders, setStakeholders] = useState<StakeholderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Get project ID
  useEffect(() => {
    const fetchProject = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', projectSlug)
        .single();

      if (data) {
        setProjectId(data.id);
      }
    };

    fetchProject();
  }, [projectSlug]);

  // Fetch stakeholders
  useEffect(() => {
    if (!projectId) return;

    const fetchStakeholders = async () => {
      try {
        const response = await fetch(`/api/stakeholders?projectId=${projectId}`);
        const data = await response.json();

        if (data.stakeholders) {
          setStakeholders(data.stakeholders.map((s: any) => s.stakeholder));
        }
      } catch (error) {
        console.error('Error fetching stakeholders:', error);
        toast.error('Failed to load stakeholders');
      } finally {
        setLoading(false);
      }
    };

    fetchStakeholders();
  }, [projectId]);

  const handleAddStakeholder = async (stakeholder: Partial<Stakeholder>) => {
    if (!projectId) return;

    try {
      const response = await fetch('/api/stakeholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...stakeholder,
          projectId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Stakeholder added successfully');
        setStakeholders([...stakeholders, data.stakeholder]);
        setIsAddModalOpen(false);
      } else {
        toast.error(data.error || 'Failed to add stakeholder');
      }
    } catch (error) {
      console.error('Error adding stakeholder:', error);
      toast.error('Failed to add stakeholder');
    }
  };

  const handleGenerateReport = async (stakeholderId: string) => {
    try {
      toast.loading('Generating report...');

      const response = await fetch('/api/stakeholders/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholderId,
          sendEmail: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Report generated and sent!');
      } else {
        toast.error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const stats = {
    total: stakeholders.length,
    reportsThisWeek: stakeholders.reduce((sum, s) => {
      const lastSent = s.last_report_sent;
      if (!lastSent) return sum;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(lastSent) > weekAgo ? sum + 1 : sum;
    }, 0),
    avgOpenRate: stakeholders.length > 0
      ? Math.round(
          (stakeholders.reduce((sum, s) => sum + s.total_opens, 0) /
            stakeholders.reduce((sum, s) => sum + s.report_count, 0)) * 100
        ) || 0
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading stakeholders...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Stakeholder Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Automate status updates and reports for key stakeholders
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stakeholder
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Stakeholders</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reports This Week</p>
              <p className="text-3xl font-bold mt-1">{stats.reportsThisWeek}</p>
            </div>
            <Mail className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Open Rate</p>
              <p className="text-3xl font-bold mt-1">{stats.avgOpenRate}%</p>
            </div>
            <Eye className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Stakeholders List */}
      {stakeholders.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No stakeholders yet</h3>
          <p className="text-muted-foreground mb-4">
            Add stakeholders to start sending automated product intelligence reports
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Stakeholder
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">All Stakeholders</h2>
          {stakeholders.map((stakeholder) => (
            <StakeholderCard
              key={stakeholder.id}
              stakeholder={stakeholder}
              onGenerateReport={handleGenerateReport}
            />
          ))}
        </div>
      )}

      {/* Add Stakeholder Modal */}
      {isAddModalOpen && (
        <AddStakeholderModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddStakeholder}
        />
      )}
    </div>
  );
}
