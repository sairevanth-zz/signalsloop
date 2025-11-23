import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, ExternalLink, TrendingUp } from 'lucide-react';

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
  report_count?: number;
  last_report_sent?: string | null;
  total_opens?: number;
  total_clicks?: number;
}

interface StakeholderCardProps {
  stakeholder: Stakeholder;
  onGenerateReport: (stakeholderId: string) => void;
}

const roleLabels: Record<string, { label: string; color: string }> = {
  ceo: { label: 'CEO', color: 'bg-purple-100 text-purple-800' },
  sales: { label: 'Sales', color: 'bg-green-100 text-green-800' },
  engineering: { label: 'Engineering', color: 'bg-blue-100 text-blue-800' },
  marketing: { label: 'Marketing', color: 'bg-pink-100 text-pink-800' },
  customer_success: { label: 'Customer Success', color: 'bg-orange-100 text-orange-800' },
};

export function StakeholderCard({ stakeholder, onGenerateReport }: StakeholderCardProps) {
  const roleInfo = roleLabels[stakeholder.role];
  const reportCount = stakeholder.report_count || 0;
  const openRate = reportCount > 0
    ? Math.round(((stakeholder.total_opens || 0) / reportCount) * 100)
    : 0;
  const clickRate = reportCount > 0
    ? Math.round(((stakeholder.total_clicks || 0) / reportCount) * 100)
    : 0;

  const portalUrl = stakeholder.access_token
    ? `${window.location.origin}/stakeholder-portal/${stakeholder.access_token}`
    : null;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start">
        {/* Left: Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{stakeholder.name}</h3>
            <Badge className={roleInfo.color}>
              {roleInfo.label}
            </Badge>
            {stakeholder.notification_preferences.email_enabled && (
              <Badge variant="outline" className="text-xs">
                <Mail className="h-3 w-3 mr-1" />
                {stakeholder.notification_preferences.frequency}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {stakeholder.email}
          </p>

          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Reports Sent</p>
              <p className="font-semibold">{reportCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Open Rate</p>
              <p className="font-semibold">{openRate}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Click Rate</p>
              <p className="font-semibold">{clickRate}%</p>
            </div>
            {stakeholder.last_report_sent && (
              <div>
                <p className="text-muted-foreground">Last Sent</p>
                <p className="font-semibold">
                  {new Date(stakeholder.last_report_sent).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onGenerateReport(stakeholder.id)}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Report Now
          </Button>

          {portalUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(portalUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Portal Link
            </Button>
          )}
        </div>
      </div>

      {/* Engagement Indicator */}
      {reportCount > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {openRate > 70 ? (
                <span className="text-green-600 font-medium">High engagement</span>
              ) : openRate > 40 ? (
                <span className="text-yellow-600 font-medium">Moderate engagement</span>
              ) : (
                <span className="text-red-600 font-medium">Low engagement</span>
              )}
              {' - '}
              {stakeholder.total_opens || 0} opens, {stakeholder.total_clicks || 0} clicks
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
