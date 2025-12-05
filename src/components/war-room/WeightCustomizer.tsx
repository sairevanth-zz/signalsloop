/**
 * AI Weight Customizer Component
 * Allows users to customize AI prioritization weights
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sliders,
  Save,
  RotateCcw,
  Download,
  Users,
  DollarSign,
  Target,
  Shield,
  Wrench,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import {
  WeightConfig,
  WeightPreset,
  FeatureType,
  DEFAULT_WEIGHTS,
  WEIGHT_PRESETS,
} from '@/lib/war-room/types';

interface WeightCustomizerProps {
  projectId: string;
  featureType?: FeatureType;
  onWeightsChange?: (weights: WeightConfig) => void;
  className?: string;
}

const WEIGHT_LABELS: Record<keyof WeightConfig, { label: string; icon: any; description: string }> = {
  customer_requests: {
    label: 'Customer Requests',
    icon: Users,
    description: 'How many customers are asking for this',
  },
  revenue_impact: {
    label: 'Revenue Impact',
    icon: DollarSign,
    description: 'Potential revenue effect (upsell, retention)',
  },
  strategic_alignment: {
    label: 'Strategic Alignment',
    icon: Target,
    description: 'Fits with company goals and OKRs',
  },
  competitive_pressure: {
    label: 'Competitive Pressure',
    icon: Shield,
    description: 'Competitor has this feature or is building it',
  },
  technical_effort: {
    label: 'Technical Effort',
    icon: Wrench,
    description: 'Inverse - higher weight = prefer lower effort',
  },
};

const PRESET_DESCRIPTIONS: Record<WeightPreset, string> = {
  balanced: 'Equal consideration for all factors',
  roi_focused: 'Prioritize features with highest revenue impact',
  customer_first: 'Focus on what customers want most',
  competitive: 'React to competitive threats quickly',
  custom: 'Your custom configuration',
};

export function WeightCustomizer({
  projectId,
  featureType = 'prioritization',
  onWeightsChange,
  className,
}: WeightCustomizerProps) {
  const [weights, setWeights] = useState<WeightConfig>(DEFAULT_WEIGHTS);
  const [preset, setPreset] = useState<WeightPreset>('balanced');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    loadWeights();
  }, [projectId, featureType]);

  async function loadWeights() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ai-weights?projectId=${projectId}&featureType=${featureType}`
      );
      const data = await res.json();

      if (data.success && data.preferences) {
        setWeights(data.preferences.weights);
        setPreset(data.preferences.preset_name || 'custom');
      }
    } catch (error) {
      console.error('[WeightCustomizer] Error loading weights:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePresetChange(newPreset: WeightPreset) {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      const presetWeights = WEIGHT_PRESETS[newPreset];
      setWeights(presetWeights);
      onWeightsChange?.(presetWeights);
    }
    setSaved(false);
  }

  function handleWeightChange(key: keyof WeightConfig, value: number) {
    // Adjust other weights proportionally to maintain sum of 100
    const currentTotal = Object.values(weights).reduce((a, b) => a + b, 0);
    const currentValue = weights[key];
    const diff = value - currentValue;

    if (Math.abs(currentTotal + diff - 100) < 0.1) {
      // If this would make total 100, just set directly
      setWeights(prev => ({ ...prev, [key]: value }));
    } else {
      // Redistribute the difference among other weights
      const otherKeys = Object.keys(weights).filter(k => k !== key) as (keyof WeightConfig)[];
      const otherTotal = otherKeys.reduce((sum, k) => sum + weights[k], 0);

      if (otherTotal > 0) {
        const newWeights = { ...weights, [key]: value };
        const remaining = 100 - value;

        otherKeys.forEach(k => {
          newWeights[k] = Math.round((weights[k] / otherTotal) * remaining);
        });

        // Fix rounding errors
        const newTotal = Object.values(newWeights).reduce((a, b) => a + b, 0);
        if (newTotal !== 100) {
          newWeights[otherKeys[0]] += 100 - newTotal;
        }

        setWeights(newWeights);
        onWeightsChange?.(newWeights);
      }
    }

    setPreset('custom');
    setSaved(false);
  }

  async function handleSave(saveAsDefault = false) {
    setSaving(true);
    try {
      const res = await fetch('/api/ai-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          featureType,
          weights,
          preset,
          saveAsDefault,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('[WeightCustomizer] Error saving weights:', error);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setWeights(DEFAULT_WEIGHTS);
    setPreset('balanced');
    onWeightsChange?.(DEFAULT_WEIGHTS);
    setSaved(false);
  }

  function exportWeights() {
    const exportData = {
      preset,
      weights,
      featureType,
      exportedAt: new Date().toISOString(),
      description: `AI prioritization weights: ${preset === 'custom' ? 'Custom configuration' : PRESET_DESCRIPTIONS[preset]}`,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-weights-${featureType}-${preset}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-purple-500" />
              AI Weight Customization
            </CardTitle>
            <CardDescription>
              Adjust how AI weighs different factors when making recommendations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Selector */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Preset</Label>
          <Select value={preset} onValueChange={(v) => handlePresetChange(v as WeightPreset)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balanced">⚖️ Balanced</SelectItem>
              <SelectItem value="roi_focused">💰 ROI Focused</SelectItem>
              <SelectItem value="customer_first">👥 Customer First</SelectItem>
              <SelectItem value="competitive">🛡️ Competitive Response</SelectItem>
              <SelectItem value="custom">⚙️ Custom</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">{PRESET_DESCRIPTIONS[preset]}</p>
        </div>

        {/* Weight Sliders */}
        <div className="space-y-4">
          {(Object.keys(weights) as (keyof WeightConfig)[]).map(key => {
            const config = WEIGHT_LABELS[key];
            const Icon = config.icon;
            const value = weights[key];

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <Label className="text-sm">{config.label}</Label>
                  </div>
                  <Badge variant="secondary">{value}%</Badge>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={value}
                  onChange={(e) => handleWeightChange(key, parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <p className="text-xs text-gray-500">{config.description}</p>
              </div>
            );
          })}
        </div>

        {/* Total indicator */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Weight</span>
            <span className={`text-sm font-bold ${
              Object.values(weights).reduce((a, b) => a + b, 0) === 100
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {Object.values(weights).reduce((a, b) => a + b, 0)}%
            </span>
          </div>
        </div>

        {/* Save Buttons */}
        <div className="flex items-center gap-2">
          <Button onClick={() => handleSave(false)} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saved ? (
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saved ? 'Saved!' : 'Save for Me'}
          </Button>
          <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
            Save as Team Default
          </Button>
        </div>
      </CardContent>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export AI Weights</DialogTitle>
            <DialogDescription>
              Export your weight configuration to share with your team or include in executive decks.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
              <p className="text-gray-500 mb-2">Configuration:</p>
              <p><strong>Preset:</strong> {preset}</p>
              {(Object.keys(weights) as (keyof WeightConfig)[]).map(key => (
                <p key={key}>
                  <strong>{WEIGHT_LABELS[key].label}:</strong> {weights[key]}%
                </p>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => { exportWeights(); setShowExportDialog(false); }}>
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default WeightCustomizer;
