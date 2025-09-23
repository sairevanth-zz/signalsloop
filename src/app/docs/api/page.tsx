'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Code, 
  Key, 
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Globe,
  MessageSquare,
  BarChart3,
  FileText,
  Zap,
  Clock
} from 'lucide-react';
import GlobalBanner from '@/components/GlobalBanner';

export default function APIDocumentationPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const CodeBlock = ({ children, language = 'bash', id }: { children: string; language?: string; id: string }) => (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
        <code>{children}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
        onClick={() => copyToClipboard(children, id)}
      >
        {copiedCode === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Global Banner */}
      <GlobalBanner showBackButton={true} backUrl="/" backLabel="Back to Home" />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-8 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    SignalsLoop API
                  </span>
                </h1>
              </div>
              <p className="text-gray-600 text-lg max-w-3xl mx-auto">
                Build powerful integrations with SignalsLoop using our REST API. Access feedback data, create posts, and manage your boards programmatically.
              </p>
              <div className="flex items-center justify-center gap-4 mt-6">
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Check className="w-3 h-3 mr-1" />
                  API Available
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Zap className="w-3 h-3 mr-1" />
                  REST API
                </Badge>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                  <Key className="w-3 h-3 mr-1" />
                  API Key Auth
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Quick Start
            </CardTitle>
            <CardDescription>
              Get started with the SignalsLoop API in minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Key className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">1. Get API Key</h3>
                <p className="text-sm text-gray-600">Generate your API key from project settings</p>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Code className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">2. Make Request</h3>
                <p className="text-sm text-gray-600">Use your API key to authenticate requests</p>
              </div>
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">3. Access Data</h3>
                <p className="text-sm text-gray-600">Retrieve and manage your feedback data</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Base URL</h4>
              <CodeBlock id="base-url" language="text">
                https://signalsloop.com/api/v1
              </CodeBlock>
            </div>
          </CardContent>
        </Card>

        {/* API Documentation */}
        <Tabs defaultValue="authentication" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          {/* Authentication */}
          <TabsContent value="authentication" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-600" />
                  API Key Authentication
                </CardTitle>
                <CardDescription>
                  All API requests require authentication using an API key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">Getting Your API Key</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Navigate to your project settings → API Keys section to generate a new API key.
                  </p>
                  <Button asChild size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                    <Link href="/app">Go to Settings</Link>
                  </Button>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Using Your API Key</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Include your API key in the Authorization header of all requests:
                  </p>
                  <CodeBlock id="auth-header">
                    Authorization: Bearer YOUR_API_KEY_HERE
                  </CodeBlock>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Security Notice</h4>
                  <p className="text-sm text-red-700">
                    Keep your API key secure and never expose it in client-side code. 
                    Treat it like a password.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posts */}
          <TabsContent value="posts" className="space-y-6">
            {/* List Posts */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  List Posts
                </CardTitle>
                <CardDescription>
                  Retrieve all feedback posts for your project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">GET</Badge>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/v1/posts</code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Query Parameters</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Parameter</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2 font-mono">limit</td>
                          <td className="p-2">integer</td>
                          <td className="p-2">Number of posts to return (default: 20, max: 100)</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2 font-mono">offset</td>
                          <td className="p-2">integer</td>
                          <td className="p-2">Number of posts to skip (default: 0)</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2 font-mono">status</td>
                          <td className="p-2">string</td>
                          <td className="p-2">Filter by status (open, planned, in_progress, done, closed)</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2 font-mono">category</td>
                          <td className="p-2">string</td>
                          <td className="p-2">Filter by AI category (Bug, Feature, Enhancement, etc.)</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono">sort</td>
                          <td className="p-2">string</td>
                          <td className="p-2">Sort field (created_at, updated_at, vote_count) (default: created_at)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Example Request</h4>
                  <CodeBlock id="list-posts">
                    curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://signalsloop.com/api/v1/posts?limit=10&status=open"
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Example Response</h4>
                  <CodeBlock id="list-posts-response" language="json">
{`{
  "data": [
    {
      "id": "post-123",
      "title": "Add dark mode support",
      "description": "Users want the ability to switch themes...",
      "status": "open",
      "ai_category": "Feature",
      "ai_confidence": 0.95,
      "vote_count": 24,
      "comments_count": 5,
      "author_name": "Sarah M.",
      "author_email": "sarah@example.com",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 127,
    "has_more": true
  }
}`}
                  </CodeBlock>
                </div>
              </CardContent>
            </Card>

            {/* Create Post */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Create Post
                </CardTitle>
                <CardDescription>
                  Create a new feedback post
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">POST</Badge>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/v1/posts</code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Field</th>
                          <th className="text-left p-2">Type</th>
                          <th className="text-left p-2">Required</th>
                          <th className="text-left p-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2 font-mono">title</td>
                          <td className="p-2">string</td>
                          <td className="p-2">✅</td>
                          <td className="p-2">Post title</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2 font-mono">description</td>
                          <td className="p-2">string</td>
                          <td className="p-2">✅</td>
                          <td className="p-2">Post description</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2 font-mono">author_name</td>
                          <td className="p-2">string</td>
                          <td className="p-2">❌</td>
                          <td className="p-2">Author name (defaults to "API User")</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2 font-mono">author_email</td>
                          <td className="p-2">string</td>
                          <td className="p-2">❌</td>
                          <td className="p-2">Author email</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono">status</td>
                          <td className="p-2">string</td>
                          <td className="p-2">❌</td>
                          <td className="p-2">Initial status (defaults to "open")</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Example Request</h4>
                  <CodeBlock id="create-post">
{`curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Fix login button",
    "description": "The login button is not responding to clicks",
    "author_name": "John Doe",
    "author_email": "john@example.com"
  }' \\
  "https://signalsloop.com/api/v1/posts"`}
                  </CodeBlock>
                </div>
              </CardContent>
            </Card>

            {/* Get Single Post */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  Get Single Post
                </CardTitle>
                <CardDescription>
                  Retrieve a specific post by ID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">GET</Badge>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/v1/posts/{`{id}`}</code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Example Request</h4>
                  <CodeBlock id="get-post">
                    curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://signalsloop.com/api/v1/posts/post-123"
                  </CodeBlock>
                </div>
              </CardContent>
            </Card>

            {/* Update Post */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                  Update Post
                </CardTitle>
                <CardDescription>
                  Update an existing post
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-800">PUT</Badge>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/v1/posts/{`{id}`}</code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Example Request</h4>
                  <CodeBlock id="update-post">
{`curl -X PUT \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "in_progress",
    "title": "Updated: Fix login button"
  }' \\
  "https://signalsloop.com/api/v1/posts/post-123"`}
                  </CodeBlock>
                </div>
              </CardContent>
            </Card>

            {/* Delete Post */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-red-600" />
                  Delete Post
                </CardTitle>
                <CardDescription>
                  Delete a post (this action cannot be undone)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-800">DELETE</Badge>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/v1/posts/{`{id}`}</code>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Warning</h4>
                  <p className="text-sm text-red-700">
                    Deleting a post will also delete all associated comments and votes. This action cannot be undone.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Example Request</h4>
                  <CodeBlock id="delete-post">
                    curl -X DELETE \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://signalsloop.com/api/v1/posts/post-123"
                  </CodeBlock>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments */}
          <TabsContent value="comments" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Comments API
                </CardTitle>
                <CardDescription>
                  Manage comments for your feedback posts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">List Comments</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-100 text-green-800">GET</Badge>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/v1/posts/{`{id}`}/comments</code>
                  </div>
                  <CodeBlock id="list-comments">
                    curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://signalsloop.com/api/v1/posts/post-123/comments"
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Create Comment</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-100 text-blue-800">POST</Badge>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/v1/posts/{`{id}`}/comments</code>
                  </div>
                  <CodeBlock id="create-comment">
{`curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Thanks for reporting this issue. We are looking into it.",
    "author_name": "Support Team",
    "author_email": "support@company.com"
  }' \\
  "https://signalsloop.com/api/v1/posts/post-123/comments"`}
                  </CodeBlock>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics */}
          <TabsContent value="stats" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  Statistics API
                </CardTitle>
                <CardDescription>
                  Get comprehensive statistics about your feedback data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">GET</Badge>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">/api/v1/stats</code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Example Request</h4>
                  <CodeBlock id="get-stats">
                    curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://signalsloop.com/api/v1/stats"
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Example Response</h4>
                  <CodeBlock id="stats-response" language="json">
{`{
  "data": {
    "project": {
      "id": "proj-123",
      "name": "My Project",
      "slug": "my-project",
      "plan": "pro"
    },
    "overview": {
      "total_posts": 127,
      "total_votes": 892,
      "total_comments": 234,
      "ai_categorization_rate": "89.2%",
      "avg_votes_per_post": "7.0",
      "avg_comments_per_post": "1.8"
    },
    "posts_by_status": {
      "open": 45,
      "planned": 23,
      "in_progress": 12,
      "done": 35,
      "closed": 12
    },
    "posts_by_category": {
      "Feature": 67,
      "Bug": 34,
      "Enhancement": 26
    },
    "recent_activity": {
      "posts_last_30_days": 23,
      "votes_last_30_days": 156
    },
    "generated_at": "2024-01-15T10:30:00Z"
  }
}`}
                  </CodeBlock>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rate Limiting & Support */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Rate Limiting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                API requests are rate limited to ensure fair usage:
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>Free Plan:</strong> 100 requests per hour</li>
                <li>• <strong>Pro Plan:</strong> 1,000 requests per hour</li>
                <li>• Rate limit headers included in responses</li>
                <li>• 429 status code when limit exceeded</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-blue-600" />
                Webhooks (Coming Soon)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Real-time webhook notifications are coming soon:
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• New post created</li>
                <li>• Post status changed</li>
                <li>• New comment added</li>
                <li>• New vote cast</li>
              </ul>
              <Badge className="mt-3 bg-yellow-100 text-yellow-800 border-yellow-200">
                Coming Soon
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Support */}
        <Card className="mt-8 bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Need Help?</CardTitle>
            <CardDescription className="text-center">
              Get support for API integration issues
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center gap-4">
              <Button asChild variant="outline">
                <Link href="/support">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Contact Support
                </Link>
              </Button>
              <Button asChild>
                <Link href="/login">
                  Get Started
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
