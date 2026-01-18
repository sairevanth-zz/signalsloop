/**
 * SDK Integration Guide Component
 * Shows users how to integrate the experiments SDK
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Copy, Check, Code, Zap, MousePointer, Eye } from 'lucide-react';

interface Props {
    projectId: string;
}

export function SDKIntegrationGuide({ projectId }: Props) {
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

    const copyToClipboard = (text: string, snippetId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(snippetId);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    const scriptTag = `<script src="https://signalsloop.com/api/sdk/${projectId}"></script>`;

    const basicUsage = `<script src="https://signalsloop.com/api/sdk/${projectId}"></script>
<script>
  // Get variant and apply changes
  SignalsLoop.getVariant('my-experiment').then(variant => {
    if (variant && variant.key === 'treatment') {
      document.querySelector('.cta-button').textContent = 'Start Free Trial';
    }
  });

  // Track conversions
  document.querySelector('.cta-button').addEventListener('click', () => {
    SignalsLoop.track('cta_click');
  });
</script>`;

    const advancedUsage = `<script src="https://signalsloop.com/api/sdk/${projectId}"></script>
<script>
  // Apply variant changes declaratively
  SignalsLoop.applyVariant('pricing-test', {
    control: {
      '.pricing-title': 'Choose Your Plan',
      '.cta-button': { text: 'Get Started', style: { backgroundColor: '#3b82f6' } }
    },
    treatment: {
      '.pricing-title': 'Start Your Journey',
      '.cta-button': { text: 'Try Free for 14 Days', style: { backgroundColor: '#10b981' } }
    }
  });

  // Track revenue events
  SignalsLoop.track('purchase', { 
    value: 99.00,
    experimentId: 'pricing-test'
  });
</script>`;

    return (
        <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <Code className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">SDK Integration</h3>
                <Badge variant="secondary">Required for experiments</Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
                Add this script to your website to start running experiments. The SDK handles visitor tracking,
                variant assignment, and conversion tracking automatically.
            </p>

            <Tabs defaultValue="quick" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="quick" className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quick Start
                    </TabsTrigger>
                    <TabsTrigger value="basic" className="flex items-center gap-2">
                        <MousePointer className="h-4 w-4" />
                        Basic Usage
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Advanced
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="quick">
                    <div className="space-y-4">
                        <p className="text-sm">Add this single line to your website's <code>&lt;head&gt;</code> or before <code>&lt;/body&gt;</code>:</p>
                        <div className="relative">
                            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm">
                                {scriptTag}
                            </pre>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(scriptTag, 'quick')}
                            >
                                {copiedSnippet === 'quick' ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            The SDK will automatically initialize with your project ID and start tracking visitors.
                        </p>
                    </div>
                </TabsContent>

                <TabsContent value="basic">
                    <div className="space-y-4">
                        <p className="text-sm">Get experiment variants and track conversions:</p>
                        <div className="relative">
                            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
                                {basicUsage}
                            </pre>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(basicUsage, 'basic')}
                            >
                                {copiedSnippet === 'basic' ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="advanced">
                    <div className="space-y-4">
                        <p className="text-sm">Apply variant changes declaratively and track revenue:</p>
                        <div className="relative">
                            <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
                                {advancedUsage}
                            </pre>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(advancedUsage, 'advanced')}
                            >
                                {copiedSnippet === 'advanced' ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">SDK Features</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>✓ Automatic visitor tracking with cookies</li>
                    <li>✓ Consistent variant assignment per visitor</li>
                    <li>✓ Event batching for performance</li>
                    <li>✓ Auto-tracking of pageviews and form submissions</li>
                    <li>✓ DOM manipulation for visual changes</li>
                </ul>
            </div>
        </Card>
    );
}
