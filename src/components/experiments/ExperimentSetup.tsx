/**
 * ExperimentSetup Component
 * Shows SDK installation instructions and checklist before starting experiment
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    Copy,
    Check,
    Code,
    Target,
    Rocket,
    ExternalLink,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExperimentSetupProps {
    experiment: {
        id: string;
        name: string;
        feature_flag_key?: string;
        primary_metric: string;
    };
    projectSlug: string;
    onStart: () => void;
    onGenerateKey: () => Promise<string>;
}

export function ExperimentSetup({
    experiment,
    projectSlug,
    onStart,
    onGenerateKey,
}: ExperimentSetupProps) {
    const [copied, setCopied] = useState<string | null>(null);
    const [checklist, setChecklist] = useState({
        sdkInstalled: false,
        experimentAdded: false,
        goalTracking: false,
    });
    const [featureFlagKey, setFeatureFlagKey] = useState(experiment.feature_flag_key || '');
    const [generating, setGenerating] = useState(false);

    // Generate feature flag key if not exists
    const handleGenerateKey = async () => {
        setGenerating(true);
        try {
            const key = await onGenerateKey();
            setFeatureFlagKey(key);
            toast.success('Feature flag key generated!');
        } catch (error) {
            toast.error('Failed to generate key');
        } finally {
            setGenerating(false);
        }
    };

    const allChecked = Object.values(checklist).every(Boolean);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(null), 2000);
    };

    // SDK installation code
    const sdkCode = `<!-- SignalsLoop Experiments SDK -->
<script>
  (function(s,l,e,x,p){s._slq=s._slq||[];s._slq.push(['init',{
    projectKey: '${projectSlug}'
  }]);var a=l.createElement('script');a.async=1;
  a.src='https://cdn.signalsloop.com/experiments.js';
  l.head.appendChild(a);
})(window,document);
</script>`;

    // Experiment tracking code
    const experimentCode = `// Track experiment: ${experiment.name}
window._slq.push(['trackExperiment', {
  experimentKey: '${featureFlagKey || 'your-experiment-key'}',
  onVariant: function(variant) {
    if (variant === 'treatment') {
      // Show treatment experience
      // Example: document.getElementById('new-feature').style.display = 'block';
    }
    // Default: control experience (no changes needed)
  }
}]);`;

    // Goal tracking code
    const goalCode = `// Track conversion goal: ${experiment.primary_metric}
// Add this when the user completes the goal action
window._slq.push(['trackGoal', '${experiment.primary_metric.toLowerCase().replace(/\s+/g, '_')}']);

// Example: On form submit
document.getElementById('your-form').addEventListener('submit', function() {
  window._slq.push(['trackGoal', '${experiment.primary_metric.toLowerCase().replace(/\s+/g, '_')}']);
});`;

    return (
        <Card className="p-6 border-2 border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Rocket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">Setup Required Before Starting</h2>
                    <p className="text-sm text-muted-foreground">
                        Complete these steps to start collecting experiment data
                    </p>
                </div>
            </div>

            {/* Feature Flag Key */}
            {!featureFlagKey && (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-yellow-800 dark:text-yellow-200">
                            Feature Flag Key Needed
                        </span>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                        Generate a unique key for this experiment to use in your code.
                    </p>
                    <Button onClick={handleGenerateKey} disabled={generating} size="sm">
                        {generating ? 'Generating...' : 'Generate Feature Flag Key'}
                    </Button>
                </div>
            )}

            {featureFlagKey && (
                <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                    <div>
                        <span className="text-sm text-green-700 dark:text-green-300">Feature Flag Key:</span>
                        <code className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-800 rounded text-sm font-mono">
                            {featureFlagKey}
                        </code>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(featureFlagKey, 'key')}
                    >
                        {copied === 'key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            )}

            <div className="space-y-6">
                {/* Step 1: Install SDK */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="sdk"
                                checked={checklist.sdkInstalled}
                                onCheckedChange={(checked) =>
                                    setChecklist((prev) => ({ ...prev, sdkInstalled: !!checked }))
                                }
                            />
                            <label htmlFor="sdk" className="font-medium cursor-pointer">
                                Step 1: Install the SDK
                            </label>
                        </div>
                        <Badge variant="outline">Required</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                        Add this script to your website's &lt;head&gt; tag
                    </p>
                    <div className="relative ml-6">
                        <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                            <code>{sdkCode}</code>
                        </pre>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 text-gray-400 hover:text-white"
                            onClick={() => copyToClipboard(sdkCode, 'sdk')}
                        >
                            {copied === 'sdk' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Step 2: Add Experiment Tracking */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="experiment"
                                checked={checklist.experimentAdded}
                                onCheckedChange={(checked) =>
                                    setChecklist((prev) => ({ ...prev, experimentAdded: !!checked }))
                                }
                            />
                            <label htmlFor="experiment" className="font-medium cursor-pointer">
                                Step 2: Add Experiment Tracking
                            </label>
                        </div>
                        <Badge variant="outline">Required</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                        Track which variant users see and apply changes
                    </p>
                    <div className="relative ml-6">
                        <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                            <code>{experimentCode}</code>
                        </pre>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 text-gray-400 hover:text-white"
                            onClick={() => copyToClipboard(experimentCode, 'experiment')}
                        >
                            {copied === 'experiment' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Step 3: Add Goal Tracking */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="goal"
                                checked={checklist.goalTracking}
                                onCheckedChange={(checked) =>
                                    setChecklist((prev) => ({ ...prev, goalTracking: !!checked }))
                                }
                            />
                            <label htmlFor="goal" className="font-medium cursor-pointer">
                                Step 3: Add Goal Tracking
                            </label>
                        </div>
                        <Badge variant="outline">Required</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">
                        Track when users complete your primary metric: <strong>{experiment.primary_metric}</strong>
                    </p>
                    <div className="relative ml-6">
                        <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-x-auto">
                            <code>{goalCode}</code>
                        </pre>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 text-gray-400 hover:text-white"
                            onClick={() => copyToClipboard(goalCode, 'goal')}
                        >
                            {copied === 'goal' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Start Button */}
            <div className="mt-8 pt-6 border-t">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        <span>
                            {allChecked
                                ? '✅ All setup steps completed!'
                                : `${Object.values(checklist).filter(Boolean).length}/3 steps completed`}
                        </span>
                    </div>
                    <Button
                        onClick={onStart}
                        disabled={!allChecked || !featureFlagKey}
                        size="lg"
                    >
                        <Rocket className="h-4 w-4 mr-2" />
                        Start Experiment
                    </Button>
                </div>
                {!allChecked && (
                    <p className="text-sm text-muted-foreground mt-2 text-right">
                        Complete all setup steps to start the experiment
                    </p>
                )}
            </div>
        </Card>
    );
}
