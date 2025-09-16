'use client';

import React, { useState } from 'react';
import { MetaHead, usePageTitle, generateOGImage } from '@/components/seo/meta-head';
import { StructuredData, StructuredDataUtils } from '@/components/seo/structured-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Share2, Globe } from 'lucide-react';

export default function SEODemoPage() {
  const [demoTitle, setDemoTitle] = useState('AI-Powered Feedback Boards');
  const [demoDescription, setDemoDescription] = useState('Transform user feedback into actionable insights with AI-powered categorization and smart roadmaps.');
  const [demoVotes, setDemoVotes] = useState('42');
  const [demoStatus, setDemoStatus] = useState('in_progress');

  const ogImageUrl = generateOGImage({
    title: demoTitle,
    subtitle: demoDescription,
    votes: parseInt(demoVotes),
    status: demoStatus,
    type: 'post'
  });
  const pageTitle = usePageTitle('SEO Demo');

  return (
    <>
      <MetaHead
        title={pageTitle}
        description="Demo of SEO components including meta tags, structured data, and Open Graph images"
        image={ogImageUrl}
        type="article"
        publishedTime="2024-01-15T10:30:00Z"
        modifiedTime="2024-01-15T15:45:00Z"
        author="SignalSloop Team"
      />

      <StructuredData {...StructuredDataUtils.createSoftwareData(
        'SignalSloop SEO Demo',
        'Comprehensive SEO components for better search engine optimization',
        'https://signalsloop.com/seo-demo'
      )} />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                🔍 SEO Components Demo
              </h1>
              <p className="text-xl text-gray-600">
                Comprehensive SEO tools for better search engine optimization
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Demo Controls */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="w-5 h-5" />
                      Open Graph Generator
                    </CardTitle>
                    <CardDescription>
                      Customize your Open Graph image and meta tags
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title
                      </label>
                      <Input
                        value={demoTitle}
                        onChange={(e) => setDemoTitle(e.target.value)}
                        placeholder="Enter title..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <Input
                        value={demoDescription}
                        onChange={(e) => setDemoDescription(e.target.value)}
                        placeholder="Enter description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Votes
                        </label>
                        <Input
                          value={demoVotes}
                          onChange={(e) => setDemoVotes(e.target.value)}
                          placeholder="42"
                          type="number"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          value={demoStatus}
                          onChange={(e) => setDemoStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="open">Open</option>
                          <option value="planned">Planned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                          <option value="declined">Declined</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SEO Features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      SEO Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">✅</Badge>
                        <span className="text-sm">Meta Tags & Open Graph</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">✅</Badge>
                        <span className="text-sm">Twitter Cards</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">✅</Badge>
                        <span className="text-sm">Structured Data (JSON-LD)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">✅</Badge>
                        <span className="text-sm">Dynamic OG Images</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">✅</Badge>
                        <span className="text-sm">Sitemap & Robots.txt</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">✅</Badge>
                        <span className="text-sm">Canonical URLs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview */}
              <div className="space-y-6">
                {/* OG Image Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Open Graph Image Preview
                    </CardTitle>
                    <CardDescription>
                      Generated dynamically based on your inputs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ogImageUrl}
                        alt="Generated Open Graph Image"
                        className="w-full rounded-lg shadow-sm"
                        style={{ maxHeight: '315px', objectFit: 'cover' }}
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <Button
                        onClick={() => window.open(ogImageUrl, '_blank')}
                        variant="outline"
                        size="sm"
                      >
                        View Full Size
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Meta Tags Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Meta Tags Preview</CardTitle>
                    <CardDescription>
                      How your page appears in search results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white border rounded-lg p-4 space-y-2">
                      <div className="text-blue-600 text-lg font-medium hover:underline cursor-pointer">
                        {pageTitle}
                      </div>
                      <div className="text-green-700 text-sm">
                        https://signalsloop.com/seo-demo
                      </div>
                      <div className="text-gray-600 text-sm">
                        Demo of SEO components including meta tags, structured data, and Open Graph images
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Social Share Test */}
                <Card>
                  <CardHeader>
                    <CardTitle>Social Share Test</CardTitle>
                    <CardDescription>
                      Test how your page looks when shared on social media
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(pageTitle)}&url=${encodeURIComponent(window.location.href)}`, '_blank')}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <span className="text-blue-400">🐦</span>
                        Twitter
                      </Button>
                      <Button
                        onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <span className="text-blue-600">💼</span>
                        LinkedIn
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Usage Examples */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Usage Examples</CardTitle>
                <CardDescription>
                  How to use these SEO components in your pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`import { MetaHead, usePageTitle } from '@/components/seo/meta-head';
import { StructuredData, StructuredDataUtils } from '@/components/seo/structured-data';

export default function MyPage() {
  const pageTitle = usePageTitle('My Page Title');
  
  return (
    <>
      <MetaHead
        title={pageTitle}
        description="My page description"
        image="/my-og-image.png"
        type="article"
      />
      
      <StructuredData {...StructuredDataUtils.createSoftwareData(
        'My App',
        'Description of my app',
        'https://myapp.com'
      )} />
      
      {/* Your page content */}
    </>
  );
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
