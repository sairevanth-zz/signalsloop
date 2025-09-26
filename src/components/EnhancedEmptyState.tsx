'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Circle, 
  Play, 
  Plus, 
  Sparkles, 
  Target, 
  TrendingUp,
  Users,
  MessageSquare,
  BarChart3,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
}

interface EnhancedEmptyStateProps {
  onCreateProject: () => void;
  onLoadSampleData: () => void;
  userPlan: 'free' | 'pro';
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'create-project',
    title: 'Create Your First Project',
    description: 'Set up a feedback board for your product or service',
    completed: false
  },
  {
    id: 'customize-board',
    title: 'Customize Your Board',
    description: 'Add your branding and configure categories',
    completed: false
  },
  {
    id: 'embed-widget',
    title: 'Embed the Widget',
    description: 'Add the feedback widget to your website',
    completed: false
  },
  {
    id: 'share-board',
    title: 'Share Your Board',
    description: 'Invite users to submit feedback',
    completed: false
  },
  {
    id: 'analyze-feedback',
    title: 'Analyze Feedback',
    description: 'Use AI insights to understand user needs',
    completed: false
  }
];

const successMetrics = [
  {
    metric: 'Response Rate',
    target: '15%',
    description: 'Percentage of visitors who submit feedback',
    icon: <Target className="w-4 h-4" />
  },
  {
    metric: 'Engagement',
    target: '50+',
    description: 'Votes per feedback item on average',
    icon: <TrendingUp className="w-4 h-4" />
  },
  {
    metric: 'Resolution Time',
    target: '7 days',
    description: 'Average time to address feedback',
    icon: <CheckCircle className="w-4 h-4" />
  }
];

const videoTutorials = [
  {
    id: 'getting-started',
    title: 'Getting Started with SignalsLoop',
    duration: '3:45',
    description: 'Learn the basics of setting up your first feedback board'
  },
  {
    id: 'widget-setup',
    title: 'Widget Installation Guide',
    duration: '2:30',
    description: 'Step-by-step widget integration tutorial'
  },
  {
    id: 'ai-features',
    title: 'AI-Powered Analytics',
    duration: '4:15',
    description: 'Maximize insights with AI categorization and scoring'
  }
];

export default function EnhancedEmptyState({ 
  onCreateProject, 
  onLoadSampleData, 
  userPlan 
}: EnhancedEmptyStateProps) {
  const [steps, setSteps] = useState(onboardingSteps);
  const [showTutorials, setShowTutorials] = useState(false);

  const handleStepComplete = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: true } : step
    ));
    toast.success('Step completed! 🎉');
  };

  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome to SignalsLoop!</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Transform user feedback into actionable insights. Let's get you started with your first feedback board.
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Onboarding Progress</h3>
              <p className="text-sm text-gray-600">{completedSteps} of {steps.length} steps completed</p>
            </div>
            <Badge variant="secondary" className="text-sm">
              {Math.round(progressPercentage)}% Complete
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Onboarding Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Getting Started Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  step.completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <button
                  onClick={() => handleStepComplete(step.id)}
                  className="flex-shrink-0 mt-0.5"
                >
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors" />
                  )}
                </button>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{step.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  {step.id === 'create-project' && (
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={onCreateProject}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create Project
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Success Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Success Metrics to Track
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {successMetrics.map((metric, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  {metric.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{metric.metric}</h4>
                    <Badge variant="outline" className="text-xs">
                      Target: {metric.target}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Create Your First Project</h3>
            <p className="text-sm text-gray-600 mb-4">Set up a feedback board in minutes</p>
            <Button onClick={onCreateProject} className="w-full">
              Get Started
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Watch Tutorials</h3>
            <p className="text-sm text-gray-600 mb-4">Learn from video guides</p>
            <Button 
              variant="outline" 
              onClick={() => setShowTutorials(true)}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Watch Now
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Try Sample Data</h3>
            <p className="text-sm text-gray-600 mb-4">Explore with demo content</p>
            <Button 
              variant="outline" 
              onClick={onLoadSampleData}
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Load Demo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Video Tutorials Modal */}
      {showTutorials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Video Tutorials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {videoTutorials.map((tutorial) => (
                <div key={tutorial.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Play className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{tutorial.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{tutorial.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {tutorial.duration}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Play className="w-3 h-3 mr-1" />
                        Watch
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowTutorials(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
