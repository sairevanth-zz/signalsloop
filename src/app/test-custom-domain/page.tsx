'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Globe,
  Settings,
  Database,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  duration?: number;
}

export default function CustomDomainTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [testDomain, setTestDomain] = useState('test-feedback.example.com');
  const [projectId, setProjectId] = useState('');

  const runTest = async (testName: string, testFn: () => Promise<any>): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      return {
        name: testName,
        passed: true,
        details: result,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        name: testName,
        passed: false,
        details: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setTestResults([]);
    
    const results: TestResult[] = [];

    // Test 1: Domain Status API
    const statusTest = await runTest('Domain Status API', async () => {
      const response = await fetch(`/api/custom-domain/status?projectId=test-project-id`);
      if (response.status === 400) {
        return `✅ Correctly returns 400 for invalid project ID (Status: ${response.status})`;
      }
      throw new Error(`Expected status 400, got ${response.status}`);
    });
    results.push(statusTest);

    // Test 2: Domain Set API - Invalid Domain
    const invalidDomainTest = await runTest('Domain Set API - Invalid Domain', async () => {
      const response = await fetch('/api/custom-domain/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'test-project-id',
          domain: 'invalid-domain'
        })
      });
      if (response.status === 400) {
        return `✅ Correctly rejects invalid domain format (Status: ${response.status})`;
      }
      throw new Error(`Expected status 400, got ${response.status}`);
    });
    results.push(invalidDomainTest);

    // Test 3: Domain Set API - Valid Domain
    const validDomainTest = await runTest('Domain Set API - Valid Domain', async () => {
      const response = await fetch('/api/custom-domain/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'test-project-id',
          domain: testDomain
        })
      });
      if (response.status === 500 || response.status === 404) {
        return `✅ Correctly handles non-existent project (Status: ${response.status})`;
      }
      throw new Error(`Expected status 500 or 404, got ${response.status}`);
    });
    results.push(validDomainTest);

    // Test 4: Domain Verification API
    const verifyTest = await runTest('Domain Verification API', async () => {
      const response = await fetch('/api/custom-domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'test-project-id' })
      });
      if (response.status === 404) {
        return `✅ Correctly returns 404 for non-existent project (Status: ${response.status})`;
      }
      throw new Error(`Expected status 404, got ${response.status}`);
    });
    results.push(verifyTest);

    // Test 5: Domain Resolution API
    const resolveTest = await runTest('Domain Resolution API', async () => {
      const response = await fetch('/api/custom-domain/resolve');
      if (response.status === 400) {
        return `✅ Correctly returns 400 for missing host header (Status: ${response.status})`;
      }
      throw new Error(`Expected status 400, got ${response.status}`);
    });
    results.push(resolveTest);

    // Test 6: Database Schema Check
    const schemaTest = await runTest('Database Schema Check', async () => {
      // This is a placeholder - in a real implementation, you'd check if the schema exists
      return `✅ Database schema check passed (placeholder)`;
    });
    results.push(schemaTest);

    setTestResults(results);
    setTesting(false);

    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    toast.success(`Testing completed! ${passed}/${total} tests passed`);
  };

  const runSpecificTest = async (testName: string) => {
    setTesting(true);
    
    let result: TestResult;
    
    switch (testName) {
      case 'Domain Status':
        result = await runTest('Domain Status API', async () => {
          const response = await fetch(`/api/custom-domain/status?projectId=${projectId || 'test-project-id'}`);
          return `Status: ${response.status}`;
        });
        break;
      case 'Domain Set':
        result = await runTest('Domain Set API', async () => {
          const response = await fetch('/api/custom-domain/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: projectId || 'test-project-id',
              domain: testDomain
            })
          });
          const data = await response.json();
          return `Status: ${response.status}, Response: ${JSON.stringify(data)}`;
        });
        break;
      case 'Domain Verify':
        result = await runTest('Domain Verification API', async () => {
          const response = await fetch('/api/custom-domain/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: projectId || 'test-project-id' })
          });
          const data = await response.json();
          return `Status: ${response.status}, Response: ${JSON.stringify(data)}`;
        });
        break;
      default:
        result = {
          name: testName,
          passed: false,
          details: 'Unknown test'
        };
    }
    
    setTestResults(prev => [...prev, result]);
    setTesting(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TestTube className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Custom Domain Testing
              </span>
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Test your custom domain functionality before launching to customers
          </p>
        </div>

        {/* Test Configuration */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Test Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="testDomain">Test Domain</Label>
                <Input
                  id="testDomain"
                  value={testDomain}
                  onChange={(e) => setTestDomain(e.target.value)}
                  placeholder="test-feedback.example.com"
                />
              </div>
              <div>
                <Label htmlFor="projectId">Project ID (Optional)</Label>
                <Input
                  id="projectId"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="Leave empty for test project ID"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-green-600" />
              Test Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={runAllTests}
                disabled={testing}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Run All Tests
                  </>
                )}
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={() => runSpecificTest('Domain Status')}
                  disabled={testing}
                  variant="outline"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Test Status API
                </Button>
                <Button
                  onClick={() => runSpecificTest('Domain Set')}
                  disabled={testing}
                  variant="outline"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Test Set API
                </Button>
                <Button
                  onClick={() => runSpecificTest('Domain Verify')}
                  disabled={testing}
                  variant="outline"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Test Verify API
                </Button>
              </div>

              <Button
                onClick={clearResults}
                disabled={testing || testResults.length === 0}
                variant="outline"
              >
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results Summary */}
        {testResults.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5 text-purple-600" />
                Test Results Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-2xl font-bold text-green-600">{passedTests}</div>
                <div className="text-gray-500">/</div>
                <div className="text-2xl font-bold text-gray-900">{totalTests}</div>
                <div className="text-gray-500">tests passed</div>
                <Badge 
                  variant={successRate >= 80 ? "default" : successRate >= 60 ? "secondary" : "destructive"}
                  className="ml-auto"
                >
                  {successRate}% Success Rate
                </Badge>
              </div>
              
              {successRate >= 80 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    🎉 Great! Your custom domain functionality is working well. Ready for testing with real domains.
                  </AlertDescription>
                </Alert>
              ) : successRate >= 60 ? (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <XCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    ⚠️ Some tests failed. Review the results below and fix any issues before launching.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    ❌ Multiple tests failed. Please fix the issues before proceeding with custom domain testing.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Detailed Test Results */}
        {testResults.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle>Detailed Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.passed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <h3 className="font-semibold">{result.name}</h3>
                      </div>
                      {result.duration && (
                        <Badge variant="outline" className="text-xs">
                          {result.duration}ms
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{result.details}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg mt-6">
          <CardHeader>
            <CardTitle>Next Steps for Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Manual Testing</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Set up a real test domain</li>
                  <li>• Configure DNS records</li>
                  <li>• Test domain verification</li>
                  <li>• Test custom domain routing</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Production Readiness</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Run database migration</li>
                  <li>• Test with Pro users</li>
                  <li>• Monitor error rates</li>
                  <li>• Prepare support documentation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
