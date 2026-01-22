/**
 * ExperimentSetup Component
 * Shows setup options: No-Code Visual Editor OR SDK installation
 */

'use client';

import { useState, useEffect } from 'react';
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
    Download,
    ExternalLink,
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
    const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(null);

    // Check for extension installation
    useEffect(() => {
        // Listen for extension message
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'SIGNALSLOOP_EXTENSION_INSTALLED' ||
                event.data?.type === 'SIGNALSLOOP_EXTENSION_STATUS') {
                setExtensionInstalled(true);
            }
        };

        window.addEventListener('message', handleMessage);

        // Request extension status
        window.postMessage({ type: 'CHECK_EXTENSION' }, '*');

        // Timeout - assume not installed if no response
        const timeout = setTimeout(() => {
            if (extensionInstalled === null) {
                setExtensionInstalled(false);
            }
        }, 1000);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearTimeout(timeout);
        };
    }, [extensionInstalled]);

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
    const goalCode = `// Track goal: ${experiment.primary_metric || 'conversion'}
window._slq.push(['trackGoal', '${(experiment.primary_metric || 'conversion').toLowerCase().replace(/\s+/g, '_')}']);`;

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
                        {/* One-liner script snippet for no-code */}
                        {(() => {
                            const noCodeScript = `<!-- SignalsLoop Experiments (add to <head>) -->
<script src="https://signalsloop.com/api/sdk/bundle.js" data-project="${projectSlug}"></script>`;
                            return null;
                        })()}

                        {/* Step 1: Install Script */}
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                                <span className="font-semibold text-lg">Add Tracking Script</span>
                                <Badge variant="outline" className="ml-2">One-time setup</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Add this script to your website's <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">&lt;head&gt;</code> tag.
                                This enables visual changes and automatic tracking.
                            </p>
                            <pre className="p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto relative">
                                <code>{`<!-- SignalsLoop Experiments -->
<script src="https://signalsloop.com/api/sdk/bundle.js" 
        data-project="${projectSlug}"></script>`}</code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-1 right-1 text-gray-400 hover:text-white"
                                    onClick={() => copyToClipboard(`<script src="https://signalsloop.com/api/sdk/bundle.js" data-project="${projectSlug}"></script>`, 'nocode-sdk')}
                                >
                                    {copied === 'nocode-sdk' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </pre>
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>What this script does:</strong>
                                </p>
                                <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                                    <li>• Automatically applies your visual changes to 50% of visitors</li>
                                    <li>• Tracks pageviews and conversions</li>
                                    <li>• Prevents page flicker during variant assignment</li>
                                </ul>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <Checkbox
                                    id="scriptInstalled"
                                    checked={visualReady}
                                    onCheckedChange={(checked) => setVisualReady(!!checked)}
                                />
                                <label htmlFor="scriptInstalled" className="text-sm cursor-pointer">
                                    I've added this script to my website
                                </label>
                            </div>
                        </div>

                        {/* Step 2: Visual Editor */}
                        <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg border ${visualReady ? 'border-2 border-purple-200 dark:border-purple-800' : 'border-gray-200 dark:border-gray-700 opacity-70'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold ${visualReady ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'}`}>2</span>
                                <span className="font-semibold text-lg">Design Your Treatment</span>
                            </div>

                            {/* Extension Install Prompt */}
                            {extensionInstalled === false && (
                                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <Download className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                                <strong>Browser extension required</strong> - Install once to enable visual editing.
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="mt-2"
                                                onClick={() => window.open('https://chrome.google.com/webstore/detail/signalsloop-visual-editor', '_blank')}
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Install Chrome Extension
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {extensionInstalled === true && (
                                <div className="mb-4 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-600" />
                                    <span className="text-sm text-green-700 dark:text-green-300">Extension installed ✓</span>
                                </div>
                            )}

                            {/* URL Input */}
                            <div className="space-y-3">
                                <Label htmlFor="targetUrl" className="text-sm font-medium">
                                    Enter the page URL to edit:
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="targetUrl"
                                        type="url"
                                        value={targetUrl}
                                        onChange={(e) => setTargetUrl(e.target.value)}
                                        placeholder="https://yoursite.com/page-to-test"
                                        className="flex-1"
                                        disabled={!visualReady}
                                    />
                                    <Button
                                        onClick={handleLaunchVisualEditor}
                                        disabled={!targetUrl || !visualReady}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        <MousePointer className="h-4 w-4 mr-2" />
                                        Open Editor
                                    </Button>
                                </div>
                            </div>

                            {/* What you can do */}
                            <div className="mt-4 grid grid-cols-3 gap-3">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                    <Palette className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                                    <p className="text-xs font-medium">Change Colors</p>
                                </div>
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                    <Code className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                                    <p className="text-xs font-medium">Edit Text</p>
                                </div>
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                    <Target className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                                    <p className="text-xs font-medium">Hide/Show</p>
                                </div>
                            </div>
                        </div>

                        {/* How It Works Summary */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <h4 className="font-medium mb-2 text-sm">How No-Code Experiments Work</h4>
                            <ol className="space-y-1.5 text-xs text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                    <span>Script splits visitors 50/50 between control and treatment</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                    <span>Treatment visitors see your visual changes automatically</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                    <span>Conversions tracked automatically - view results in the dashboard</span>
                                </li>
                            </ol>
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
