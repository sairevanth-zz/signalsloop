'use client';

import React, { useState } from 'react';
import { generateOGImage } from '@/components/seo/meta-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Palette, Download, Share2, Eye } from 'lucide-react';

export default function OGDemoPage() {
  const [customTitle, setCustomTitle] = useState('Custom Title');
  const [customSubtitle, setCustomSubtitle] = useState('Custom subtitle for your content');
  const [customVotes, setCustomVotes] = useState('25');
  const [customStatus, setCustomStatus] = useState('planned');
  const [customType, setCustomType] = useState('post');

  // Predefined examples
  const examples = [
    {
      title: 'AI-Powered Feedback Categorization',
      subtitle: 'Automatically organize user feedback with machine learning',
      votes: '127',
      status: 'done',
      type: 'post',
      description: 'Feature Request Post'
    },
    {
      title: 'Mobile App Feedback Board',
      subtitle: 'Share your ideas and vote on upcoming features',
      votes: '89',
      status: 'open',
      type: 'board',
      description: 'Feedback Board'
    },
    {
      title: 'Product Roadmap 2024',
      subtitle: 'See what we\'re building next for our users',
      votes: '203',
      status: 'in_progress',
      type: 'roadmap',
      description: 'Public Roadmap'
    },
    {
      title: 'Bug: Login Issue on Safari',
      subtitle: 'Users unable to login using Safari browser',
      votes: '15',
      status: 'planned',
      type: 'post',
      description: 'Bug Report'
    }
  ];

  const statusOptions = [
    { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-800' },
    { value: 'planned', label: 'Planned', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
    { value: 'done', label: 'Done', color: 'bg-green-100 text-green-800' },
    { value: 'declined', label: 'Declined', color: 'bg-gray-100 text-gray-800' }
  ];

  const typeOptions = [
    { value: 'post', label: 'Post', icon: '📝' },
    { value: 'board', label: 'Board', icon: '💬' },
    { value: 'roadmap', label: 'Roadmap', icon: '🗺️' },
    { value: 'default', label: 'Default', icon: '🚀' }
  ];

  const getOGImageUrl = (params: {
    title: string;
    subtitle?: string;
    votes?: number;
    status?: string;
    type?: string;
  }) => {
    return generateOGImage(params);
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const shareImage = (url: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Open Graph Image',
        text: 'Check out this generated OG image!',
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Image URL copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🎨 Open Graph Image Generator
            </h1>
            <p className="text-xl text-gray-600">
              Create dynamic, branded images for social media sharing
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Custom Generator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Custom Generator
                </CardTitle>
                <CardDescription>
                  Create your own Open Graph image with custom content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Enter title..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtitle
                  </label>
                  <Input
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="Enter subtitle..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Votes
                    </label>
                    <Input
                      value={customVotes}
                      onChange={(e) => setCustomVotes(e.target.value)}
                      placeholder="25"
                      type="number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => downloadImage(
                      getOGImageUrl({
                        title: customTitle,
                        subtitle: customSubtitle,
                        votes: parseInt(customVotes),
                        status: customStatus,
                        type: customType
                      }),
                      `og-image-${customType}-${Date.now()}.png`
                    )}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button
                    onClick={() => shareImage(
                      getOGImageUrl({
                        title: customTitle,
                        subtitle: customSubtitle,
                        votes: parseInt(customVotes),
                        status: customStatus,
                        type: customType
                      })
                    )}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Live Preview
                </CardTitle>
                <CardDescription>
                  See how your image will look when shared
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getOGImageUrl({
                      title: customTitle,
                      subtitle: customSubtitle,
                      votes: parseInt(customVotes),
                      status: customStatus,
                      type: customType
                    })}
                    alt="Generated Open Graph Image"
                    className="w-full rounded-lg shadow-sm"
                    style={{ maxHeight: '315px', objectFit: 'cover' }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Examples */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Example Images</CardTitle>
              <CardDescription>
                See different types and styles of Open Graph images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {examples.map((example, index) => (
                  <div key={index} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{example.description}</Badge>
                      <Badge className={statusOptions.find(s => s.value === example.status)?.color}>
                        {statusOptions.find(s => s.value === example.status)?.label}
                      </Badge>
                    </div>
                    
                    <div className="border rounded-lg p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getOGImageUrl({
                          ...example,
                          votes: parseInt(example.votes)
                        })}
                        alt={`Example ${index + 1}`}
                        className="w-full rounded shadow-sm"
                        style={{ maxHeight: '200px', objectFit: 'cover' }}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => downloadImage(
                          getOGImageUrl({
                            ...example,
                            votes: parseInt(example.votes)
                          }),
                          `og-example-${index + 1}-${Date.now()}.png`
                        )}
                        variant="outline"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => shareImage(getOGImageUrl({
                          ...example,
                          votes: parseInt(example.votes)
                        }))}
                        variant="outline"
                      >
                        <Share2 className="w-3 h-3 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Guide */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Usage Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
{`// Generate OG image URL
import { generateOGImage } from '@/components/seo/meta-head';

const ogImageUrl = generateOGImage({
  title: 'My Feature Request',
  subtitle: 'Add dark mode to the app',
  votes: 42,
  status: 'planned',
  type: 'post'
});

// Use in MetaHead component
<MetaHead
  title="My Page"
  description="Page description"
  image={ogImageUrl}
/>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
