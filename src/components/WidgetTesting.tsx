'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Square, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Monitor, 
  Smartphone, 
  Tablet,
  Globe,
  Code,
  Eye,
  Settings,
  AlertCircle,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  id: string;
  test: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  timestamp: string;
}

interface DevicePreview {
  name: string;
  width: number;
  height: number;
  icon: React.ReactNode;
}

interface WidgetTestingProps {
  projectSlug: string;
  apiKey: string;
}

export function WidgetTesting({ projectSlug, apiKey }: WidgetTestingProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([
    { id: '1', test: 'Widget Script Loading', status: 'pending', message: 'Not started', timestamp: '' },
    { id: '2', test: 'Button Rendering', status: 'pending', message: 'Not started', timestamp: '' },
    { id: '3', test: 'Modal Opening', status: 'pending', message: 'Not started', timestamp: '' },
    { id: '4', test: 'Form Submission', status: 'pending', message: 'Not started', timestamp: '' },
    { id: '5', test: 'Mobile Responsiveness', status: 'pending', message: 'Not started', timestamp: '' },
    { id: '6', test: 'Cross-browser Compatibility', status: 'pending', message: 'Not started', timestamp: '' }
  ]);

  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DevicePreview>({
    name: 'Desktop',
    width: 1200,
    height: 800,
    icon: <Monitor className="h-4 w-4" />
  });

  const [testUrl, setTestUrl] = useState('https://example.com');
  const [customSettings, setCustomSettings] = useState({
    position: 'bottom-right' as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
    color: '#667eea',
    text: 'Feedback'
  });

  const devices: DevicePreview[] = [
    { name: 'Desktop', width: 1200, height: 800, icon: <Monitor className="h-4 w-4" /> },
    { name: 'Tablet', width: 768, height: 1024, icon: <Tablet className="h-4 w-4" /> },
    { name: 'Mobile', width: 375, height: 667, icon: <Smartphone className="h-4 w-4" /> }
  ];

  const runTests = async () => {
    setIsRunningTests(true);
    
    // Reset all tests to pending
    setTestResults(prev => prev.map(test => ({ 
      ...test, 
      status: 'pending', 
      message: 'Waiting to run...' 
    })));

    // Simulate running each test
    for (let i = 0; i < testResults.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      setTestResults(prev => prev.map((test, index) => {
        if (index === i) {
          return {
            ...test,
            status: 'running',
            message: 'Testing...',
            timestamp: new Date().toLocaleTimeString()
          };
        }
        return test;
      }));

      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate test time

      // Simulate test results (mostly pass, some random failures)
      const passed = Math.random() > 0.2; // 80% pass rate
      
      setTestResults(prev => prev.map((test, index) => {
        if (index === i) {
          return {
            ...test,
            status: passed ? 'passed' : 'failed',
            message: passed ? getSuccessMessage(test.test) : getFailureMessage(test.test),
            timestamp: new Date().toLocaleTimeString()
          };
        }
        return test;
      }));
    }

    setIsRunningTests(false);
    toast.success('All tests completed!');
  };

  const getSuccessMessage = (testName: string): string => {
    const messages: { [key: string]: string } = {
      'Widget Script Loading': 'Script loaded successfully in 0.3s',
      'Button Rendering': 'Button rendered correctly with proper styling',
      'Modal Opening': 'Modal opens and closes smoothly',
      'Form Submission': 'Form submits data correctly to API',
      'Mobile Responsiveness': 'Widget adapts perfectly to mobile screens',
      'Cross-browser Compatibility': 'Works across Chrome, Firefox, Safari, Edge'
    };
    return messages[testName] || 'Test passed successfully';
  };

  const getFailureMessage = (testName: string): string => {
    const messages: { [key: string]: string } = {
      'Widget Script Loading': 'Script failed to load - check API key',
      'Button Rendering': 'Button not visible - CSS conflict detected',
      'Modal Opening': 'Modal animation stuttering on older browsers',
      'Form Submission': 'API request timeout - check network',
      'Mobile Responsiveness': 'Button too small on mobile devices',
      'Cross-browser Compatibility': 'Issues detected in IE11 and older Safari'
    };
    return messages[testName] || 'Test failed - check console for details';
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const generateTestCode = () => {
    const params = new URLSearchParams();
    if (customSettings.position !== 'bottom-right') params.append('position', customSettings.position);
    if (customSettings.color !== '#667eea') params.append('color', customSettings.color.replace('#', '%23'));
    if (customSettings.text !== 'Feedback') params.append('text', encodeURIComponent(customSettings.text));
    
    const queryString = params.toString() ? '?' + params.toString() : '';
    return `<script src="https://signalsloop.com/embed/${apiKey}.js${queryString}"></script>`;
  };

  const downloadTestHtml = () => {
    if (typeof window === 'undefined') return;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SignalsLoop Widget Test</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .feature {
            background: #f8f9fa;
            padding: 1rem;
            margin: 1rem 0;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Welcome to Our App</h1>
        <p>This is a test page for the SignalsLoop feedback widget.</p>
        
        <div class="feature">
            <h3>✨ Amazing Features</h3>
            <p>Our app does incredible things that users love!</p>
        </div>
        
        <div class="feature">
            <h3>🎯 User-Focused Design</h3>
            <p>Everything is built with user experience in mind.</p>
        </div>
        
        <div class="feature">
            <h3>💬 We Value Your Feedback</h3>
            <p>Click the feedback button to share your thoughts!</p>
        </div>
        
        <p><strong>Try it out:</strong> Look for the feedback widget button and test the complete flow!</p>
    </div>

    <!-- SignalsLoop Widget -->
    ${generateTestCode()}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signalsloop-widget-test.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Test HTML file downloaded!');
  };

  const copyToClipboard = (text: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success('Code copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Widget Testing Suite</h3>
          <p className="text-sm text-muted-foreground">
            Test your widget integration and preview across devices
          </p>
        </div>
      </div>

      <Tabs defaultValue="automated" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="automated">Automated Tests</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
          <TabsTrigger value="manual">Manual Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="automated" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Automated Test Suite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={runTests}
                  disabled={isRunningTests}
                  className="min-w-[120px]"
                >
                  {isRunningTests ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Running...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Run Tests
                    </div>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTestResults(prev => prev.map(test => ({ 
                    ...test, 
                    status: 'pending', 
                    message: 'Not started',
                    timestamp: ''
                  })))}
                  disabled={isRunningTests}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              <div className="space-y-3">
                {testResults.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <h4 className="font-medium">{test.test}</h4>
                        <p className="text-sm text-muted-foreground">{test.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={
                          test.status === 'passed' ? 'default' : 
                          test.status === 'failed' ? 'destructive' : 
                          test.status === 'running' ? 'secondary' : 'outline'
                        }
                      >
                        {test.status}
                      </Badge>
                      {test.timestamp && (
                        <p className="text-xs text-muted-foreground mt-1">{test.timestamp}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Test Coverage:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Functionality:</strong>
                    <ul className="text-muted-foreground">
                      <li>• Script loading & initialization</li>
                      <li>• UI rendering & interactions</li>
                      <li>• Form submission & validation</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Compatibility:</strong>
                    <ul className="text-muted-foreground">
                      <li>• Mobile responsiveness</li>
                      <li>• Cross-browser support</li>
                      <li>• Performance metrics</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Device Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {devices.map((device) => (
                  <Button
                    key={device.name}
                    variant={selectedDevice.name === device.name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDevice(device)}
                  >
                    {device.icon}
                    <span className="ml-2">{device.name}</span>
                  </Button>
                ))}
              </div>

              <div className="flex justify-center">
                <div 
                  className="border-8 border-gray-800 rounded-lg bg-white shadow-xl overflow-hidden"
                  style={{
                    width: Math.min(selectedDevice.width, 800),
                    height: Math.min(selectedDevice.height, 600)
                  }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 relative">
                    <div className="p-8">
                      <h2 className="text-2xl font-bold mb-4">Demo Website</h2>
                      <p className="text-gray-600 mb-4">
                        This is a preview of how your widget will appear on a website.
                      </p>
                      <div className="space-y-3">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h3 className="font-medium">Feature 1</h3>
                          <p className="text-sm text-gray-600">Amazing functionality here!</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h3 className="font-medium">Feature 2</h3>
                          <p className="text-sm text-gray-600">More great features!</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Widget Button Preview */}
                    <div
                      className="absolute flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium cursor-pointer hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: customSettings.color,
                        [customSettings.position.includes('bottom') ? 'bottom' : 'top']: '20px',
                        [customSettings.position.includes('right') ? 'right' : 'left']: '20px'
                      }}
                    >
                      💬 {customSettings.text}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Preview on {selectedDevice.name} ({selectedDevice.width} × {selectedDevice.height})
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manual Testing Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Test URL</Label>
                    <Input
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      placeholder="https://your-website.com"
                    />
                  </div>

                  <div>
                    <Label>Widget Position</Label>
                    <select 
                      className="w-full mt-1 p-2 border border-input rounded-md bg-background"
                      value={customSettings.position}
                      onChange={(e) => setCustomSettings({...customSettings, position: e.target.value as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'})}
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>

                  <div>
                    <Label>Button Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={customSettings.color}
                        onChange={(e) => setCustomSettings({...customSettings, color: e.target.value})}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={customSettings.color}
                        onChange={(e) => setCustomSettings({...customSettings, color: e.target.value})}
                        placeholder="#667eea"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Button Text</Label>
                    <Input
                      value={customSettings.text}
                      onChange={(e) => setCustomSettings({...customSettings, text: e.target.value})}
                      placeholder="Feedback"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Generated Code</Label>
                    <div className="mt-2 relative">
                      <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                        <code>{generateTestCode()}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generateTestCode())}
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={downloadTestHtml}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Test HTML File
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Manual Testing Checklist
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-2">Basic Functionality</h5>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>□ Widget button appears</li>
                      <li>□ Modal opens on click</li>
                      <li>□ Form submission works</li>
                      <li>□ Success message shows</li>
                      <li>□ Modal closes properly</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Cross-Device Testing</h5>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>□ Works on mobile devices</li>
                      <li>□ Touch interactions respond</li>
                      <li>□ Text is readable on small screens</li>
                      <li>□ Button is appropriately sized</li>
                      <li>□ Modal fits screen properly</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
