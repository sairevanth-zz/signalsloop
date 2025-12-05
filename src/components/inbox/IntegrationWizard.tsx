/**
 * Integration Wizard Component
 * Step-by-step wizard for setting up feedback source integrations
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  IntegrationType,
  INTEGRATION_CONFIGS,
  IntegrationSetupConfig,
  FeedbackIntegration,
} from '@/lib/inbox/types';
import {
  MessageSquare,
  Mail,
  Twitter,
  Chrome,
  Star,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Loader2,
  ExternalLink,
  AlertCircle,
  Settings,
  Search,
} from 'lucide-react';

interface IntegrationWizardProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onComplete: (integration: FeedbackIntegration) => void;
}

const CATEGORY_ORDER = ['communication', 'support', 'review', 'social', 'survey', 'custom'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  communication: '💬 Communication',
  support: '🎧 Support',
  review: '⭐ Reviews',
  social: '🌐 Social',
  survey: '📋 Surveys',
  custom: '🔧 Custom',
};

const INTEGRATION_ICONS: Partial<Record<IntegrationType, React.ReactNode>> = {
  slack: <MessageSquare className="h-6 w-6 text-[#4A154B]" />,
  discord: <MessageSquare className="h-6 w-6 text-[#5865F2]" />,
  intercom: <MessageSquare className="h-6 w-6 text-[#6AFDEF]" />,
  email_gmail: <Mail className="h-6 w-6 text-[#EA4335]" />,
  email_outlook: <Mail className="h-6 w-6 text-[#0078D4]" />,
  twitter: <Twitter className="h-6 w-6 text-[#1DA1F2]" />,
  g2: <Star className="h-6 w-6 text-[#FF492C]" />,
  app_store: <Chrome className="h-6 w-6 text-gray-600" />,
  reddit: <MessageSquare className="h-6 w-6 text-[#FF4500]" />,
};

export function IntegrationWizard({
  projectId,
  open,
  onClose,
  onComplete,
}: IntegrationWizardProps) {
  const [step, setStep] = useState<'select' | 'configure' | 'test'>('select');
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedConfig = selectedType ? INTEGRATION_CONFIGS[selectedType] : null;
  
  // Group integrations by category
  const integrationsByCategory = Object.entries(INTEGRATION_CONFIGS).reduce(
    (acc, [key, config]) => {
      const category = config.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push({ type: key as IntegrationType, config });
      return acc;
    },
    {} as Record<string, Array<{ type: IntegrationType; config: IntegrationSetupConfig }>>
  );
  
  // Filter integrations by search
  const filteredCategories = searchQuery
    ? Object.entries(integrationsByCategory).reduce((acc, [category, items]) => {
        const filtered = items.filter(
          (item) =>
            item.config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.config.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) acc[category] = filtered;
        return acc;
      }, {} as typeof integrationsByCategory)
    : integrationsByCategory;
  
  const handleSelectType = (type: IntegrationType) => {
    setSelectedType(type);
    setCredentials({});
    setConfig({});
    setTestResult(null);
    setStep('configure');
  };
  
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      // Create temporary integration to test
      const response = await fetch('/api/inbox/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          integrationType: selectedType,
          displayName: selectedConfig?.name || selectedType,
          credentials,
          config,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create integration');
      }
      
      // Test the connection
      const testResponse = await fetch(`/api/inbox/integrations/${data.integration.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      
      const testData = await testResponse.json();
      setTestResult(testData);
      
      if (testData.success) {
        setStep('test');
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetch('/api/inbox/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          integrationType: selectedType,
          displayName: selectedConfig?.name || selectedType,
          credentials,
          config,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save integration');
      }
      
      onComplete(data.integration);
      handleClose();
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save integration',
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleClose = () => {
    setStep('select');
    setSelectedType(null);
    setCredentials({});
    setConfig({});
    setTestResult(null);
    setSearchQuery('');
    onClose();
  };
  
  const renderSelectStep = () => (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search integrations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Integration Categories */}
      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
        {CATEGORY_ORDER.map((category) => {
          const items = filteredCategories[category];
          if (!items || items.length === 0) return null;
          
          return (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {items.map(({ type, config }) => (
                  <button
                    key={type}
                    onClick={() => handleSelectType(type)}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0">
                      {INTEGRATION_ICONS[type] || <Settings className="h-6 w-6 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{config.name}</div>
                      <div className="text-xs text-gray-500 truncate">{config.description}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  
  const renderConfigureStep = () => {
    if (!selectedConfig) return null;
    
    const renderCredentialFields = () => {
      switch (selectedConfig.authType) {
        case 'oauth':
          return (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Click the button below to connect your {selectedConfig.name} account via OAuth.
                </p>
              </div>
              <Button className="w-full" onClick={() => {/* OAuth flow */}}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect {selectedConfig.name}
              </Button>
            </div>
          );
          
        case 'api_key':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API key"
                  value={credentials.apiKey || ''}
                  onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can find your API key in your {selectedConfig.name} account settings.
                </p>
              </div>
              {selectedType === 'twitter' && (
                <div>
                  <Label htmlFor="bearerToken">Bearer Token</Label>
                  <Input
                    id="bearerToken"
                    type="password"
                    placeholder="Enter your Bearer Token"
                    value={credentials.accessToken || ''}
                    onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                  />
                </div>
              )}
            </div>
          );
          
        case 'none':
          return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <Check className="h-4 w-4 inline mr-1" />
                No authentication required. Just configure the settings below.
              </p>
            </div>
          );
          
        default:
          return null;
      }
    };
    
    const renderConfigFields = () => {
      switch (selectedType) {
        case 'slack':
        case 'discord':
          return (
            <div>
              <Label htmlFor="channels">Channels to Monitor</Label>
              <Input
                id="channels"
                placeholder="general, feedback, support (comma separated)"
                value={config.channels?.join(', ') || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    channels: e.target.value.split(',').map((c) => c.trim()).filter(Boolean),
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter channel names or IDs, separated by commas.
              </p>
            </div>
          );
          
        case 'twitter':
        case 'reddit':
        case 'hackernews':
          return (
            <div>
              <Label htmlFor="keywords">Keywords to Track</Label>
              <Input
                id="keywords"
                placeholder="your-product, @yourbrand, #yourhashtag"
                value={config.keywords?.join(', ') || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter keywords, mentions, or hashtags to monitor.
              </p>
            </div>
          );
          
        case 'app_store':
        case 'play_store':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="appId">App ID</Label>
                <Input
                  id="appId"
                  placeholder={selectedType === 'app_store' ? '123456789' : 'com.example.app'}
                  value={config.appId || ''}
                  onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                />
              </div>
              <div>
                <Label>Countries</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['us', 'uk', 'ca', 'au', 'de', 'fr'].map((country) => (
                    <label key={country} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={config.countries?.includes(country)}
                        onCheckedChange={(checked) => {
                          const countries = config.countries || ['us'];
                          if (checked) {
                            setConfig({ ...config, countries: [...countries, country] });
                          } else {
                            setConfig({
                              ...config,
                              countries: countries.filter((c: string) => c !== country),
                            });
                          }
                        }}
                      />
                      {country.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          );
          
        case 'g2':
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="productId">G2 Product ID</Label>
                <Input
                  id="productId"
                  placeholder="your-product-slug"
                  value={config.productId || ''}
                  onChange={(e) => setConfig({ ...config, productId: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="productSlug">Product URL Slug</Label>
                <Input
                  id="productSlug"
                  placeholder="your-product-slug"
                  value={config.productSlug || ''}
                  onChange={(e) => setConfig({ ...config, productSlug: e.target.value })}
                />
              </div>
            </div>
          );
          
        case 'email_gmail':
        case 'email_outlook':
          return (
            <div>
              <Label htmlFor="labelFilter">Email Label Filter (optional)</Label>
              <Input
                id="labelFilter"
                placeholder="feedback, support"
                value={config.labelFilter || ''}
                onChange={(e) => setConfig({ ...config, labelFilter: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Only import emails with this label.
              </p>
            </div>
          );
          
        default:
          return null;
      }
    };
    
    return (
      <div className="space-y-6">
        {/* Integration Header */}
        <div className="flex items-center gap-3 pb-4 border-b">
          {INTEGRATION_ICONS[selectedType!] || <Settings className="h-8 w-8 text-gray-400" />}
          <div>
            <h3 className="font-semibold text-gray-900">{selectedConfig.name}</h3>
            <p className="text-sm text-gray-500">{selectedConfig.description}</p>
          </div>
        </div>
        
        {/* Credentials */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Authentication</h4>
          {renderCredentialFields()}
        </div>
        
        {/* Configuration */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Configuration</h4>
          {renderConfigFields()}
        </div>
        
        {/* Test Result */}
        {testResult && !testResult.success && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Connection Failed</p>
              <p className="text-sm text-red-700">{testResult.error}</p>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setStep('select')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleTest} disabled={testing}>
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                Test Connection
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };
  
  const renderTestStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Connection Successful!</h3>
        <p className="text-gray-500 mt-1">
          Your {selectedConfig?.name} integration is ready to start syncing feedback.
        </p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 text-left">
        <h4 className="text-sm font-medium text-gray-700 mb-2">What happens next?</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-green-500 mt-0.5" />
            Feedback will be automatically synced every 15 minutes
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-green-500 mt-0.5" />
            AI will categorize and analyze each piece of feedback
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-green-500 mt-0.5" />
            You&apos;ll receive alerts for urgent or high-priority items
          </li>
        </ul>
      </div>
      
      <div className="flex justify-center gap-3 pt-4">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Complete Setup
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Add Integration'}
            {step === 'configure' && `Configure ${selectedConfig?.name}`}
            {step === 'test' && 'Setup Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Connect a feedback source to your unified inbox'}
            {step === 'configure' && 'Enter your credentials and configure the integration'}
            {step === 'test' && 'Your integration is ready to use'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {step === 'select' && renderSelectStep()}
          {step === 'configure' && renderConfigureStep()}
          {step === 'test' && renderTestStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
