'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AIDuplicateDetection } from '@/components/AIDuplicateDetection';
import { AIPriorityScoring } from '@/components/AIPriorityScoring';
import { 
  Sparkles, 
  Target, 
  AlertTriangle, 
  Zap,
  Brain,
  TrendingUp
} from 'lucide-react';

export default function AIFeaturesDemo() {
  const [activeTab, setActiveTab] = useState<'duplicate' | 'priority'>('duplicate');
  
  // Demo data
  const demoPost = {
    id: 'demo-post-1',
    title: 'Add dark mode support',
    description: 'Please add a dark theme option for better user experience, especially for users who work late at night.',
    projectId: 'demo-project-1',
    voteCount: 45,
    commentCount: 12
  };

  const handleNotification = (message: string, type: 'success' | 'error') => {
    // Simple alert for demo - in real app this would be a toast
    alert(`${type.toUpperCase()}: ${message}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                AI Features Demo
              </h1>
            </div>
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              Pro Features
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full px-4 py-2 mb-4">
            <Brain className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">AI-Powered Feedback Management</span>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Smart Feedback Analysis
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Leverage AI to automatically detect duplicates, score priorities, and organize your feedback intelligently.
          </p>
        </div>

        {/* Demo Post */}
        <div className="max-w-2xl mx-auto mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Demo Feedback Post
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{demoPost.title}</h3>
                  <p className="text-gray-600">{demoPost.description}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>👍 {demoPost.voteCount} votes</span>
                  <span>💬 {demoPost.commentCount} comments</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Tabs */}
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-4 mb-8">
            <Button
              variant={activeTab === 'duplicate' ? 'default' : 'outline'}
              onClick={() => setActiveTab('duplicate')}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Duplicate Detection
            </Button>
            <Button
              variant={activeTab === 'priority' ? 'default' : 'outline'}
              onClick={() => setActiveTab('priority')}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Priority Scoring
            </Button>
          </div>

          {/* Feature Demo */}
          <div className="max-w-2xl mx-auto">
            {activeTab === 'duplicate' ? (
              <AIDuplicateDetection
                postId={demoPost.id}
                projectId={demoPost.projectId}
                userPlan="pro"
                onShowNotification={handleNotification}
              />
            ) : (
              <AIPriorityScoring
                postId={demoPost.id}
                projectId={demoPost.projectId}
                userPlan="pro"
                onShowNotification={handleNotification}
              />
            )}
          </div>
        </div>

        {/* Feature Benefits */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Why AI-Powered Feedback Management?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="font-semibold">Duplicate Detection</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Automatically identify similar feedback</li>
                  <li>• Reduce noise and consolidate votes</li>
                  <li>• Save time on manual duplicate checking</li>
                  <li>• Better organized feedback boards</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">Priority Scoring</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• AI analyzes urgency and impact</li>
                  <li>• Data-driven prioritization</li>
                  <li>• Focus on high-impact features</li>
                  <li>• Better product roadmap decisions</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 p-8 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Smart Up Your Feedback?
            </h3>
            <p className="text-gray-600 mb-6">
              Upgrade to Pro and start using AI to manage your feedback more intelligently.
            </p>
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
