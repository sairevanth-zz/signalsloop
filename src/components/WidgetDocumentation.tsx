'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Zap, 
  Shield, 
  Smartphone,
  Code,
  Settings,
  AlertTriangle,
  PlayCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function WidgetDocumentation() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
      toast.success('Copied to clipboard!');
    }
  };

  const installationCode = `<script src="https://signalsloop.com/embed/YOUR_API_KEY.js"></script>`;
  
  const customizationCode = `<script src="https://signalsloop.com/embed/YOUR_API_KEY.js?position=bottom-left&color=%23ff6b6b&text=Send%20Feedback"></script>`;

  const htmlExampleCode = `<!DOCTYPE html>
<html>
<head>
    <title>My Awesome App</title>
</head>
<body>
    <h1>Welcome to My App</h1>
    <p>Your amazing content here...</p>
    
    <!-- SignalsLoop Widget - Add this before closing body tag -->
    <script src="https://signalsloop.com/embed/YOUR_API_KEY.js"></script>
</body>
</html>`;

  const reactExampleCode = `// In your React app (pages/_app.js or app/layout.js)
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Load SignalsLoop widget
    const script = document.createElement('script');
    script.src = 'https://signalsloop.com/embed/YOUR_API_KEY.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      document.body.removeChild(script);
    };
  }, []);

  return <Component {...pageProps} />;
}`;

  const nextjsExampleCode = `// In your Next.js app (pages/_document.js or app/layout.js)
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
        {/* SignalsLoop Widget */}
        <script 
          src="https://signalsloop.com/embed/YOUR_API_KEY.js"
          async
        />
      </body>
    </Html>
  );
}`;

  const vueExampleCode = `<!-- In your Vue.js app (public/index.html) -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>My Vue App</title>
  </head>
  <body>
    <div id="app"></div>
    
    <!-- SignalsLoop Widget -->
    <script src="https://signalsloop.com/embed/YOUR_API_KEY.js"></script>
  </body>
</html>`;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Widget Installation Guide</h1>
        <p className="text-xl text-muted-foreground">
          Add the SignalsLoop feedback widget to your website in 2 minutes
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="secondary">⚡ 2-minute setup</Badge>
          <Badge variant="secondary">📱 Mobile responsive</Badge>
          <Badge variant="secondary">🚀 Lightweight (5KB)</Badge>
        </div>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Start (30 seconds)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Get API Key</h4>
                <p className="text-sm text-muted-foreground">
                  Create an API key in your SignalsLoop settings
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Copy Code</h4>
                <p className="text-sm text-muted-foreground">
                  Copy the one-line embed script
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Add to Site</h4>
                <p className="text-sm text-muted-foreground">
                  Paste before your closing &lt;/body&gt; tag
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Installation Code</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(installationCode, 'install')}
              >
                {copiedCode === 'install' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="text-sm overflow-x-auto">
              <code>{installationCode}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Installation */}
      <Tabs defaultValue="html" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="html">HTML/Static</TabsTrigger>
          <TabsTrigger value="react">React</TabsTrigger>
          <TabsTrigger value="nextjs">Next.js</TabsTrigger>
          <TabsTrigger value="vue">Vue.js</TabsTrigger>
        </TabsList>

        <TabsContent value="html" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>HTML/Static Sites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                For static HTML sites, WordPress, or any website where you can edit the HTML:
              </p>
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Complete Example</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(htmlExampleCode, 'html')}
                  >
                    {copiedCode === 'html' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="text-sm overflow-x-auto">
                  <code>{htmlExampleCode}</code>
                </pre>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  WordPress Instructions
                </h4>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Go to Appearance → Theme Editor</li>
                  <li>Edit footer.php or functions.php</li>
                  <li>Add the script before &lt;/body&gt;</li>
                  <li>Save changes</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="react" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>React Applications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                For React apps, add the widget in your main App component:
              </p>
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">React Integration</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(reactExampleCode, 'react')}
                  >
                    {copiedCode === 'react' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="text-sm overflow-x-auto">
                  <code>{reactExampleCode}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nextjs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Next.js Applications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                For Next.js apps, add to your _document.js file for global loading:
              </p>
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Next.js Integration</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(nextjsExampleCode, 'nextjs')}
                  >
                    {copiedCode === 'nextjs' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="text-sm overflow-x-auto">
                  <code>{nextjsExampleCode}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vue.js Applications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                For Vue.js apps, add to your main HTML template:
              </p>
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Vue.js Integration</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(vueExampleCode, 'vue')}
                  >
                    {copiedCode === 'vue' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <pre className="text-sm overflow-x-auto">
                  <code>{vueExampleCode}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customization Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Customization Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Customize the widget appearance using URL parameters:
          </p>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Customized Example</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(customizationCode, 'custom')}
              >
                {copiedCode === 'custom' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="text-sm overflow-x-auto">
              <code>{customizationCode}</code>
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Available Parameters:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><code>position</code> - bottom-right, bottom-left, top-right, top-left</li>
                <li><code>color</code> - Any hex color (URL encoded)</li>
                <li><code>text</code> - Custom button text (URL encoded)</li>
                <li><code>theme</code> - light, dark, auto</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Pro Features:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Remove &quot;Powered by SignalsLoop&quot;</li>
                <li>• Custom CSS styling</li>
                <li>• Custom domain embedding</li>
                <li>• Advanced positioning</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features & Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Security & Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Lightweight (5KB total)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                No impact on page load speed
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                GDPR compliant
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                SSL encrypted
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Spam protection built-in
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-500" />
              Mobile & Accessibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Fully responsive design
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Touch-friendly interactions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Keyboard navigation support
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Screen reader compatible
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                High contrast mode
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Widget not appearing?</h4>
              <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                <li>Check that your API key is correct and active</li>
                <li>Ensure the script is placed before the closing &lt;/body&gt; tag</li>
                <li>Verify there are no JavaScript errors in console</li>
                <li>Check if ad blockers are blocking the widget</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Widget not submitting feedback?</h4>
              <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                <li>Check your browser&apos;s network tab for API errors</li>
                <li>Verify your project settings allow public submissions</li>
                <li>Ensure you&apos;re not hitting rate limits</li>
                <li>Try disabling browser extensions temporarily</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Still need help?</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
                <Button variant="outline" size="sm">
                  <Code className="h-4 w-4 mr-2" />
                  View Examples
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Widget */}
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-green-500" />
            Test the Widget Live
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Try our widget in action! Click the feedback button in the bottom-right corner of this page.
          </p>
          <div className="text-center">
            <Button className="animate-pulse">
              👆 Look for the feedback button below
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
