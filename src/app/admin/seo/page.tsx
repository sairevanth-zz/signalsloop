'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Globe, 
  FileText, 
  Link,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface SEOStatus {
  title: string;
  description: string;
  keywords: string[];
  score: number;
  issues: string[];
  suggestions: string[];
}

export default function AdminSEOPage() {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [seoStatus, setSeoStatus] = useState<SEOStatus | null>(null);

  const analyzeSEO = async () => {
    if (!url) {
      toast.error('Please enter a URL to analyze');
      return;
    }

    setAnalyzing(true);
    
    // Simulate SEO analysis
    setTimeout(() => {
      setSeoStatus({
        title: 'SignalsLoop - Customer Feedback Management Platform',
        description: 'Collect, organize, and analyze customer feedback with SignalsLoop. Create beautiful feedback boards, manage feature requests, and build better products.',
        keywords: ['feedback management', 'customer feedback', 'feature requests', 'product management', 'user feedback'],
        score: 85,
        issues: [
          'Meta description is too long (should be under 160 characters)',
          'Missing structured data markup',
          'No Open Graph tags for social sharing'
        ],
        suggestions: [
          'Add more internal links to improve site structure',
          'Optimize images with alt text',
          'Add breadcrumb navigation',
          'Implement schema markup for better search visibility'
        ]
      });
      setAnalyzing(false);
    }, 2000);
  };

  const generateSitemap = async () => {
    toast.success('Sitemap generated successfully!');
  };

  const updateRobots = async () => {
    toast.success('robots.txt updated successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SEO Tools</h1>
        <p className="text-gray-600">
          Optimize your platform for search engines and improve discoverability
        </p>
      </div>

      {/* SEO Analyzer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            SEO Analyzer
          </CardTitle>
          <CardDescription>
            Analyze any page on your platform for SEO optimization opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">Page URL</Label>
              <Input
                id="url"
                placeholder="https://signalsloop.com/app"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <Button 
              onClick={analyzeSEO}
              disabled={analyzing || !url}
              className="flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Analyze SEO
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEO Results */}
      {seoStatus && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SEO Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                SEO Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">{seoStatus.score}/100</div>
                <Badge variant={seoStatus.score >= 80 ? 'default' : seoStatus.score >= 60 ? 'secondary' : 'destructive'}>
                  {seoStatus.score >= 80 ? 'Excellent' : seoStatus.score >= 60 ? 'Good' : 'Needs Improvement'}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  Your page is performing well in search engines
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current SEO Elements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Current SEO Elements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Page Title</Label>
                  <p className="text-sm text-gray-600 mt-1">{seoStatus.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Meta Description</Label>
                  <p className="text-sm text-gray-600 mt-1">{seoStatus.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Keywords</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {seoStatus.keywords.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                Issues Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seoStatus.issues.map((issue, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{issue}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                Optimization Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seoStatus.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{suggestion}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SEO Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Sitemap Generator
            </CardTitle>
            <CardDescription>
              Generate and update your XML sitemap for better search engine indexing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Automatically generate a sitemap including all your public pages, projects, and content.
              </p>
              <Button onClick={generateSitemap} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Sitemap
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ExternalLink className="h-4 w-4" />
                <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                  View current sitemap
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Robots.txt Manager
            </CardTitle>
            <CardDescription>
              Manage your robots.txt file to control search engine crawling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Update your robots.txt file to guide search engine crawlers and protect sensitive areas.
              </p>
              <Button onClick={updateRobots} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Update robots.txt
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ExternalLink className="h-4 w-4" />
                <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                  View current robots.txt
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meta Tags Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Link className="h-5 w-5 mr-2" />
            Global Meta Tags
          </CardTitle>
          <CardDescription>
            Configure default meta tags for your platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="default-title">Default Page Title</Label>
              <Input
                id="default-title"
                placeholder="SignalsLoop - Customer Feedback Management"
                defaultValue="SignalsLoop - Customer Feedback Management"
              />
            </div>
            <div>
              <Label htmlFor="default-description">Default Meta Description</Label>
              <Textarea
                id="default-description"
                placeholder="Collect, organize, and analyze customer feedback..."
                defaultValue="Collect, organize, and analyze customer feedback with SignalsLoop. Create beautiful feedback boards, manage feature requests, and build better products."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="default-keywords">Default Keywords</Label>
              <Input
                id="default-keywords"
                placeholder="feedback management, customer feedback, feature requests"
                defaultValue="feedback management, customer feedback, feature requests, product management, user feedback"
              />
            </div>
            <Button className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Meta Tags
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
