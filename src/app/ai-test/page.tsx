'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { categoryColors, categoryDescriptions } from '@/lib/ai-categorization';
import GlobalBanner from '@/components/GlobalBanner';
import { Loader2, Sparkles, TestTube } from 'lucide-react';

interface CategorizationResult {
  category: string;
  confidence: number;
  reasoning?: string;
}

interface ApiResponse {
  success: boolean;
  result?: CategorizationResult;
  model?: string;
  error?: string;
}

export default function AITestPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<CategorizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('gpt-4');

  // Fetch current model on page load
  useEffect(() => {
    const fetchCurrentModel = async () => {
      try {
        const response = await fetch('/api/ai/categorize');
        const data = await response.json();
        if (data.success && data.model) {
          setCurrentModel(data.model);
        }
      } catch (error) {
        console.error('Failed to fetch current model:', error);
      }
    };
    
    fetchCurrentModel();
  }, []);

  const handleCategorize = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to categorize feedback');
      }

      if (data.success && data.result) {
        setResult(data.result);
        if (data.model) {
          setCurrentModel(data.model);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sampleFeedback = [
    {
      title: "App crashes when uploading large files",
      description: "Every time I try to upload a file larger than 10MB, the app crashes and I have to restart it."
    },
    {
      title: "Add dark mode support",
      description: "It would be great to have a dark theme option for better visibility at night."
    },
    {
      title: "Make the login button more prominent",
      description: "The current login button is too small and hard to find. Maybe make it bigger or change the color."
    },
    {
      title: "Slow loading times",
      description: "The dashboard takes forever to load, especially with many projects. Need to optimize performance."
    }
  ];

  const loadSample = (sample: typeof sampleFeedback[0]) => {
    setTitle(sample.title);
    setDescription(sample.description);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <GlobalBanner showBackButton={true} backLabel="Back to Dashboard" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Categorization Test
              </h1>
              <p className="text-gray-600 mt-1">
                Test the AI-powered feedback categorization system
              </p>
              <div className="mt-2">
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                  Using: {currentModel}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Test Feedback Categorization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter feedback title..."
                    className="bg-white/80 border-white/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter detailed feedback description..."
                    rows={4}
                    className="bg-white/80 border-white/20"
                  />
                </div>

                <Button 
                  onClick={handleCategorize} 
                  disabled={loading || !title.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Categorizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Categorize with AI
                    </>
                  )}
                </Button>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sample Feedback */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Sample Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleFeedback.map((sample, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-white/60 rounded-lg border border-white/20 cursor-pointer hover:bg-white/80 transition-colors"
                      onClick={() => loadSample(sample)}
                    >
                      <p className="font-medium text-sm">{sample.title}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {sample.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Current Result */}
            {result && (
              <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Categorization Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <Badge className={`${categoryColors[result.category as keyof typeof categoryColors]} text-sm font-medium`}>
                      {result.category}
                    </Badge>
                    <p className="text-xs text-gray-600 mt-1">
                      {categoryDescriptions[result.category as keyof typeof categoryDescriptions]}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confidence
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${result.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  {result.reasoning && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Reasoning
                      </label>
                      <p className="text-sm text-gray-600 bg-white/60 p-3 rounded-lg">
                        {result.reasoning}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Available Categories */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Available Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(categoryDescriptions).map(([category, description]) => (
                    <div key={category} className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
                      <Badge className={`${categoryColors[category as keyof typeof categoryColors]} text-xs font-medium flex-shrink-0`}>
                        {category}
                      </Badge>
                      <p className="text-xs text-gray-600">{description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
