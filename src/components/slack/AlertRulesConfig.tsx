/**
 * Slack Alert Rules Configuration Component
 *
 * Allows users to configure alert thresholds and conditions
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface AlertRule {
  id: string;
  rule_type: string;
  enabled: boolean;
  config: Record<string, any>;
}

interface AlertRulesConfigProps {
  projectId: string;
}

export function AlertRulesConfig({ projectId }: AlertRulesConfigProps) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, [projectId]);

  const loadRules = async () => {
    try {
      const response = await fetch(
        `/api/integrations/slack/rules?project_id=${projectId}`
      );

      if (!response.ok) throw new Error('Failed to load rules');

      const data = await response.json();
      setRules(data.rules);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast.error('Failed to load alert rules');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (ruleType: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/integrations/slack/rules/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          rule_type: ruleType,
          enabled,
        }),
      });

      if (!response.ok) throw new Error('Failed to toggle rule');

      setRules((prev) =>
        prev.map((rule) =>
          rule.rule_type === ruleType ? { ...rule, enabled } : rule
        )
      );

      toast.success(`Rule ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const handleConfigChange = (
    ruleType: string,
    key: string,
    value: any
  ) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.rule_type === ruleType
          ? {
              ...rule,
              config: { ...rule.config, [key]: value },
            }
          : rule
      )
    );
  };

  const handleSave = async (rule: AlertRule) => {
    setSaving(true);

    try {
      const response = await fetch('/api/integrations/slack/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          rule_type: rule.rule_type,
          config: rule.config,
          enabled: rule.enabled,
        }),
      });

      if (!response.ok) throw new Error('Failed to save rule');

      toast.success('Rule saved successfully');
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg
          className="animate-spin h-8 w-8 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  const criticalFeedbackRule = rules.find((r) => r.rule_type === 'critical_feedback');
  const sentimentDropRule = rules.find((r) => r.rule_type === 'sentiment_drop');
  const newThemeRule = rules.find((r) => r.rule_type === 'new_theme');
  const competitiveThreatRule = rules.find((r) => r.rule_type === 'competitive_threat');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Alert Rules</h3>
        <p className="text-sm text-gray-500">
          Configure when alerts should be triggered. Adjust thresholds to reduce noise and amplify important signals.
        </p>
      </div>

      {/* Critical Feedback Rule */}
      {criticalFeedbackRule && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-medium flex items-center gap-2">
                🚨 Critical Feedback Alerts
              </h4>
              <p className="text-sm text-gray-500">
                High-risk feedback requiring immediate attention
              </p>
            </div>
            <Switch
              checked={criticalFeedbackRule.enabled}
              onCheckedChange={(checked) =>
                handleToggle('critical_feedback', checked)
              }
            />
          </div>

          {criticalFeedbackRule.enabled && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sentiment Threshold</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={criticalFeedbackRule.config.sentiment_threshold}
                    onChange={(e) =>
                      handleConfigChange(
                        'critical_feedback',
                        'sentiment_threshold',
                        parseFloat(e.target.value)
                      )
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Alert when sentiment is below this value (e.g., -0.7)
                  </p>
                </div>

                <div>
                  <Label>Minimum Urgency</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={criticalFeedbackRule.config.urgency_min}
                    onChange={(e) =>
                      handleConfigChange(
                        'critical_feedback',
                        'urgency_min',
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum urgency score (1-5)
                  </p>
                </div>
              </div>

              <div>
                <Label>Critical Keywords (comma-separated)</Label>
                <Input
                  value={criticalFeedbackRule.config.keywords.join(', ')}
                  onChange={(e) =>
                    handleConfigChange(
                      'critical_feedback',
                      'keywords',
                      e.target.value.split(',').map((k) => k.trim())
                    )
                  }
                  placeholder="churn, cancel, refund, frustrated"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave(criticalFeedbackRule)}
                  disabled={saving}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sentiment Drop Rule */}
      {sentimentDropRule && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-medium flex items-center gap-2">
                📉 Sentiment Drop Alerts
              </h4>
              <p className="text-sm text-gray-500">
                Significant decrease in customer sentiment
              </p>
            </div>
            <Switch
              checked={sentimentDropRule.enabled}
              onCheckedChange={(checked) =>
                handleToggle('sentiment_drop', checked)
              }
            />
          </div>

          {sentimentDropRule.enabled && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Drop Percentage</Label>
                  <Input
                    type="number"
                    value={sentimentDropRule.config.drop_percentage}
                    onChange={(e) =>
                      handleConfigChange(
                        'sentiment_drop',
                        'drop_percentage',
                        parseInt(e.target.value)
                      )
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    % decrease to trigger alert
                  </p>
                </div>

                <div>
                  <Label>Time Period (days)</Label>
                  <Input
                    type="number"
                    value={sentimentDropRule.config.time_period_days}
                    onChange={(e) =>
                      handleConfigChange(
                        'sentiment_drop',
                        'time_period_days',
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <Label>Min Sample Size</Label>
                  <Input
                    type="number"
                    value={sentimentDropRule.config.min_sample_size}
                    onChange={(e) =>
                      handleConfigChange(
                        'sentiment_drop',
                        'min_sample_size',
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave(sentimentDropRule)}
                  disabled={saving}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Theme Rule */}
      {newThemeRule && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-medium flex items-center gap-2">
                🆕 New Theme Alerts
              </h4>
              <p className="text-sm text-gray-500">
                Emerging patterns in customer feedback
              </p>
            </div>
            <Switch
              checked={newThemeRule.enabled}
              onCheckedChange={(checked) =>
                handleToggle('new_theme', checked)
              }
            />
          </div>

          {newThemeRule.enabled && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Mentions</Label>
                  <Input
                    type="number"
                    value={newThemeRule.config.min_mentions}
                    onChange={(e) =>
                      handleConfigChange(
                        'new_theme',
                        'min_mentions',
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <Label>Time Window (hours)</Label>
                  <Input
                    type="number"
                    value={newThemeRule.config.time_window_hours}
                    onChange={(e) =>
                      handleConfigChange(
                        'new_theme',
                        'time_window_hours',
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave(newThemeRule)}
                  disabled={saving}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Competitive Threat Rule */}
      {competitiveThreatRule && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-medium flex items-center gap-2">
                ⚔️ Competitive Threat Alerts
              </h4>
              <p className="text-sm text-gray-500">
                Increased competitor mentions
              </p>
            </div>
            <Switch
              checked={competitiveThreatRule.enabled}
              onCheckedChange={(checked) =>
                handleToggle('competitive_threat', checked)
              }
            />
          </div>

          {competitiveThreatRule.enabled && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Minimum Mentions</Label>
                  <Input
                    type="number"
                    value={competitiveThreatRule.config.min_mentions}
                    onChange={(e) =>
                      handleConfigChange(
                        'competitive_threat',
                        'min_mentions',
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>

                <div>
                  <Label>Time Window (hours)</Label>
                  <Input
                    type="number"
                    value={competitiveThreatRule.config.time_window_hours}
                    onChange={(e) =>
                      handleConfigChange(
                        'competitive_threat',
                        'time_window_hours',
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave(competitiveThreatRule)}
                  disabled={saving}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
