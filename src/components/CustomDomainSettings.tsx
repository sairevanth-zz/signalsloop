'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Globe, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Copy,
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface CustomDomainSettingsProps {
  projectId: string;
  projectSlug: string;
  userPlan: 'free' | 'pro';
}

interface DomainStatus {
  custom_domain: string | null;
  domain_verified: boolean;
  domain_verification_token: string | null;
  domain_verification_method: string;
  domain_verified_at: string | null;
  domain_status: string;
}

export function CustomDomainSettings({ projectId, projectSlug, userPlan }: CustomDomainSettingsProps) {
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadDomainStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/custom-domain/status?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setDomainStatus(data);
        if (data.custom_domain) {
          setNewDomain(data.custom_domain);
        }
      }
    } catch (error) {
      console.error('Error loading domain status:', error);
    }
  }, [projectId]);

  useEffect(() => {
    loadDomainStatus();
  }, [loadDomainStatus]);

  const handleSetDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    if (!domainRegex.test(newDomain)) {
      toast.error('Please enter a valid domain name (e.g., feedback.yourcompany.com)');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/custom-domain/set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          domain: newDomain.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Domain set successfully! Please verify it using DNS records.');
        loadDomainStatus();
      } else {
        toast.error(data.error || 'Failed to set domain');
      }
    } catch (error) {
      console.error('Error setting domain:', error);
      toast.error('Failed to set domain');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    setVerifying(true);
    try {
      const response = await fetch('/api/custom-domain/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.verified) {
          toast.success('Domain verified successfully!');
        } else {
          toast.error(data.error || 'Domain verification failed');
        }
        loadDomainStatus();
      } else {
        toast.error(data.error || 'Failed to verify domain');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('Failed to verify domain');
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const getStatusBadge = () => {
    if (!domainStatus?.custom_domain) {
      return <Badge variant="outline">Not Set</Badge>;
    }

    switch (domainStatus.domain_status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  if (userPlan !== 'pro') {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            Custom Domain
          </CardTitle>
          <CardDescription>
            Use your own domain for your feedback board
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Custom Domain</h3>
            <p className="text-gray-600 mb-4">
              Use your own domain like <code className="bg-gray-100 px-2 py-1 rounded">feedback.yourcompany.com</code>
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Info className="w-4 h-4" />
                <span className="font-medium">Pro Feature</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Custom domains are available for Pro users only.
              </p>
            </div>
            <Button 
              asChild
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <a href="/app/billing">Upgrade to Pro</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-purple-600" />
          Custom Domain
        </CardTitle>
        <CardDescription>
          Use your own domain for your feedback board
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Domain Status */}
        {domainStatus?.custom_domain && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Current Domain</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {domainStatus.custom_domain}
                  </code>
                  {getStatusBadge()}
                </div>
              </div>
              {domainStatus.domain_status === 'verified' && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <a 
                    href={`https://${domainStatus.custom_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit
                  </a>
                </Button>
              )}
            </div>

            {domainStatus.domain_status === 'pending' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Domain verification is pending. Please add the DNS records below to verify ownership.
                </AlertDescription>
              </Alert>
            )}

            {domainStatus.domain_status === 'failed' && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Domain verification failed. Please check your DNS settings and try again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* DNS Instructions */}
        {domainStatus?.custom_domain && domainStatus.domain_status === 'pending' && domainStatus.domain_verification_token && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">DNS Configuration</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">Add this TXT record to your DNS:</Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm">
                    signalsloop-verification={domainStatus.domain_verification_token}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `signalsloop-verification=${domainStatus.domain_verification_token}`,
                      'txt-record'
                    )}
                  >
                    {copied === 'txt-record' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Add this CNAME record:</Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm">
                    {domainStatus.custom_domain} → signalsloop.vercel.app
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `${domainStatus.custom_domain} CNAME signalsloop.vercel.app`,
                      'cname-record'
                    )}
                  >
                    {copied === 'cname-record' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">DNS Propagation</p>
                  <p>
                    DNS changes can take up to 24 hours to propagate. 
                    Click "Verify Domain" after adding the records above.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleVerifyDomain}
              disabled={verifying}
              className="w-full"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify Domain
                </>
              )}
            </Button>
          </div>
        )}

        {/* Set New Domain */}
        {(!domainStatus?.custom_domain || domainStatus.domain_status === 'failed') && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">
              {domainStatus?.custom_domain ? 'Update Domain' : 'Set Custom Domain'}
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <div className="flex gap-2">
                <Input
                  id="domain"
                  type="text"
                  placeholder="feedback.yourcompany.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSetDomain}
                  disabled={loading || !newDomain.trim()}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Setting...
                    </>
                  ) : (
                    'Set Domain'
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Enter your domain without http:// or https://
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Examples:</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <code>feedback.yourcompany.com</code></li>
                <li>• <code>support.yoursite.com</code></li>
                <li>• <code>ideas.myapp.io</code></li>
              </ul>
            </div>
          </div>
        )}

        {/* Default Domain Info */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Default Domain</Label>
              <p className="text-sm text-gray-600">
                Your feedback board is always available at:
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm">
              {projectSlug}.signalsloop.vercel.app
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(
                `https://${projectSlug}.signalsloop.vercel.app`,
                'default-domain'
              )}
            >
              {copied === 'default-domain' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
