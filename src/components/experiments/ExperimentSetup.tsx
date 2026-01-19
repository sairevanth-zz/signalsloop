/**
 * ExperimentSetup Component
 * Shows setup options: No-Code Visual Editor OR SDK installation
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Copy,
    Check,
    Target,
    Rocket,
    AlertCircle,
    MousePointer,
    Code,
    Palette,
    Globe,
    ArrowRight,
    Sparkles,
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
    onStartVisualEditor?: (targetUrl: string) => void;
    onGenerateKey: () => Promise<string>;
}

export function ExperimentSetup({
    experiment,
    projectSlug,
    onStart,
    onStartVisualEditor,
    onGenerateKey,
}: ExperimentSetupProps) {
    const [setupMode, setSetupMode] = useState<'visual' | 'developer'>('visual');
    const [copied, setCopied] = useState<string | null>(null);
    const [checklist, setChecklist] = useState({
        sdkInstalled: false,
        experimentAdded: false,
        goalTracking: false,
    });
    const [featureFlagKey, setFeatureFlagKey] = useState(experiment.feature_flag_key || '');
    const [generating, setGenerating] = useState(false);
    const [targetUrl, setTargetUrl] = useState('');
    const [visualReady, setVisualReady] = useState(false);

    // Generate feature flag key if not exists
    const handleGenerateKey = async () => {
        setGenerating(true);
        try {
            const key = await onGenerateKey();
            setFeatureFlagKey(key);
            toast.success('Feature flag key generated!');
        } catch {
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

    const handleLaunchVisualEditor = () => {
        if (targetUrl && onStartVisualEditor) {
            onStartVisualEditor(targetUrl);
        }
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
    }
  }
}]);`;

    // Goal tracking code
    const goalCode = `// Track goal: ${experiment.primary_metric}
window._slq.push(['trackGoal', '${experiment.primary_metric.toLowerCase().replace(/\s+/g, '_')}']);`;

    return (
        <Card className="p-6 border-2 border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Rocket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">Setup Your Experiment</h2>
                    <p className="text-sm text-muted-foreground">
                        Choose how you want to run this experiment
                    </p>
                </div>
            </div>

            {/* Setup Mode Tabs */}
            <Tabs value={setupMode} onValueChange={(v) => setSetupMode(v as 'visual' | 'developer')} className="mb-6">
                <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="visual" className="flex items-center gap-2">
                        <MousePointer className="h-4 w-4" />
                        No-Code Visual Editor
                        <Badge className="ml-1 bg-green-500 text-white text-[10px]">Recommended</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="developer" className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Developer Setup
                    </TabsTrigger>
                </TabsList>

                {/* Visual Editor Tab */}
                <TabsContent value="visual" className="mt-6">
                    <div className="space-y-6">
                        {/* Benefits */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                <Palette className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                                <p className="font-medium text-sm">Point & Click</p>
                                <p className="text-xs text-muted-foreground">No code needed</p>
                            </div>
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                <Sparkles className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                                <p className="font-medium text-sm">Instant Preview</p>
                                <p className="text-xs text-muted-foreground">See changes live</p>
                            </div>
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                <Globe className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                                <p className="font-medium text-sm">Works Anywhere</p>
                                <p className="text-xs text-muted-foreground">Any website</p>
                            </div>
                        </div>

                        {/* URL Input */}
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                            <Label htmlFor="targetUrl" className="text-base font-medium">
                                Enter the page URL to test
                            </Label>
                            <p className="text-sm text-muted-foreground mb-3">
                                We'll load your page and let you make changes visually
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    id="targetUrl"
                                    type="url"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    placeholder="https://yoursite.com/page-to-test"
                                    className="flex-1"
                                />
                                <Button
                                    onClick={handleLaunchVisualEditor}
                                    disabled={!targetUrl}
                                >
                                    <MousePointer className="h-4 w-4 mr-2" />
                                    Open Editor
                                </Button>
                            </div>
                        </div>

                        {/* How it works */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h4 className="font-medium mb-3">How the Visual Editor Works</h4>
                            <ol className="space-y-2 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">1</span>
                                    <span>Click any element on your page to select it</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">2</span>
                                    <span>Change text, colors, visibility - no code needed</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">3</span>
                                    <span>Preview changes in real-time</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0">4</span>
                                    <span>Save and start your experiment instantly</span>
                                </li>
                            </ol>
                        </div>

                        {/* Quick start checkbox */}
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="visualReady"
                                checked={visualReady}
                                onCheckedChange={(checked) => setVisualReady(!!checked)}
                            />
                            <label htmlFor="visualReady" className="text-sm cursor-pointer">
                                I understand this requires adding a small script to my site for tracking (provided after editor setup)
                            </label>
                        </div>

                        {/* Start Button for Visual */}
                        <div className="flex justify-end">
                            <Button
                                onClick={handleLaunchVisualEditor}
                                disabled={!targetUrl || !visualReady}
                                size="lg"
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <MousePointer className="h-4 w-4 mr-2" />
                                Launch Visual Editor
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* Developer Tab */}
                <TabsContent value="developer" className="mt-6">
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
                                Generate a unique key for this experiment.
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
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(featureFlagKey, 'key')}>
                                {copied === 'key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Step 1: SDK */}
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                    id="sdk"
                                    checked={checklist.sdkInstalled}
                                    onCheckedChange={(checked) => setChecklist((prev) => ({ ...prev, sdkInstalled: !!checked }))}
                                />
                                <label htmlFor="sdk" className="font-medium cursor-pointer">Step 1: Install SDK</label>
                                <Badge variant="outline">Required</Badge>
                            </div>
                            <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto relative">
                                <code>{sdkCode}</code>
                                <Button variant="ghost" size="sm" className="absolute top-1 right-1 text-gray-400" onClick={() => copyToClipboard(sdkCode, 'sdk')}>
                                    {copied === 'sdk' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </pre>
                        </div>

                        {/* Step 2: Experiment */}
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                    id="experiment"
                                    checked={checklist.experimentAdded}
                                    onCheckedChange={(checked) => setChecklist((prev) => ({ ...prev, experimentAdded: !!checked }))}
                                />
                                <label htmlFor="experiment" className="font-medium cursor-pointer">Step 2: Track Experiment</label>
                                <Badge variant="outline">Required</Badge>
                            </div>
                            <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto relative">
                                <code>{experimentCode}</code>
                                <Button variant="ghost" size="sm" className="absolute top-1 right-1 text-gray-400" onClick={() => copyToClipboard(experimentCode, 'exp')}>
                                    {copied === 'exp' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </pre>
                        </div>

                        {/* Step 3: Goal */}
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                                <Checkbox
                                    id="goal"
                                    checked={checklist.goalTracking}
                                    onCheckedChange={(checked) => setChecklist((prev) => ({ ...prev, goalTracking: !!checked }))}
                                />
                                <label htmlFor="goal" className="font-medium cursor-pointer">Step 3: Track Goals</label>
                                <Badge variant="outline">Required</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                                Track: <strong>{experiment.primary_metric}</strong>
                            </p>
                            <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto relative">
                                <code>{goalCode}</code>
                                <Button variant="ghost" size="sm" className="absolute top-1 right-1 text-gray-400" onClick={() => copyToClipboard(goalCode, 'goal')}>
                                    {copied === 'goal' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </pre>
                        </div>
                    </div>

                    {/* Start Button */}
                    <div className="mt-6 pt-4 border-t flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4" />
                            <span>{Object.values(checklist).filter(Boolean).length}/3 steps completed</span>
                        </div>
                        <Button onClick={onStart} disabled={!allChecked || !featureFlagKey} size="lg">
                            <Rocket className="h-4 w-4 mr-2" />
                            Start Experiment
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </Card>
    );
}
