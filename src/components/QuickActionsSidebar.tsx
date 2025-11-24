'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FileText,
  Zap,
  HelpCircle,
  Bell,
  BookOpen,
  ExternalLink,
  Sparkles,
  Settings,
  Users,
  BarChart3,
  Brain,
  Search,
  Phone,
  MessageSquareText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface QuickActionsSidebarProps {
  onCreateProject: () => void;
  onCreateFromTemplate: (template: string) => void;
  userPlan: 'free' | 'pro';
}

const templates = [
  {
    id: 'saas',
    name: 'SaaS Product',
    description: 'Perfect for software products with feature requests and bug reports',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  {
    id: 'mobile',
    name: 'Mobile App',
    description: 'Optimized for mobile app feedback and user experience',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  {
    id: 'website',
    name: 'Website',
    description: 'Great for website improvements and user feedback',
    icon: <ExternalLink className="w-4 h-4" />,
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  {
    id: 'community',
    name: 'Community',
    description: 'For community-driven projects and open source',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-700 border-orange-200'
  }
];

const notifications = [
  {
    id: '1',
    type: 'feature',
    title: '🤖 Ask SignalsLoop Anything',
    message: 'Chat with AI about your feedback - Press Cmd+K to try it now!',
    timestamp: 'Just now',
    unread: true
  },
  {
    id: '2',
    type: 'update',
    title: 'New AI Features Available',
    message: 'Try our enhanced categorization and priority scoring',
    timestamp: '2 hours ago',
    unread: false
  },
  {
    id: '3',
    type: 'tip',
    title: 'Pro Tip: Widget Analytics',
    message: 'Track widget performance with detailed analytics',
    timestamp: '1 day ago',
    unread: false
  }
];

const changelogItems = [
  {
    version: 'v2.6.0',
    date: '2025-01-21',
    features: [
      '🤖 NEW: Ask SignalsLoop Anything - ChatGPT-style AI assistant',
      'Natural language queries about your product feedback',
      'Semantic search using vector embeddings (1536-dim)',
      'Conversation history with pinned chats',
      'Cmd+K / Ctrl+K quick access from anywhere',
      'Real-time streaming responses with GPT-4o'
    ]
  },
  {
    version: 'v2.5.0',
    date: '2025-01-20',
    features: [
      '🚀 NEW: Mission Control Dashboard - AI-powered executive briefings',
      'Daily intelligence summaries with GPT-4o analysis',
      'Real-time sentiment tracking and feedback velocity metrics',
      'Bento Grid layout with opportunities and threat monitoring',
      'Actionable insights and recommended next steps'
    ]
  },
  {
    version: 'v2.4.0',
    date: '2025-01-19',
    features: [
      '🎉 NEW: Call Intelligence Engine - Analyze customer calls with AI',
      'Extract feature requests, objections, and competitor insights from calls',
      'Track expansion opportunities and churn risks by revenue',
      'Generate 48-hour Call Audit reports with Slack integration',
      'Auto-create posts and themes from call analysis'
    ]
  },
  {
    version: 'v2.3.0',
    date: '2025-01-15',
    features: [
      'Added AI-powered priority scoring for feedback',
      'Improved board actions with unified dropdown menu',
      'Enhanced auto-categorization accuracy',
      'New board settings navigation'
    ]
  },
  {
    version: 'v2.2.0',
    date: '2025-01-10',
    features: [
      'Custom Domains support for Pro users',
      'Slack and Discord integration improvements',
      'CSV import/export functionality',
      'Webhook support for real-time notifications'
    ]
  },
  {
    version: 'v2.1.0',
    date: '2025-01-05',
    features: [
      'Enhanced AI categorization accuracy',
      'New widget analytics dashboard',
      'Improved mobile responsiveness',
      'Updated notification system'
    ]
  }
];

export default function QuickActionsSidebar({
  onCreateProject,
  onCreateFromTemplate,
  userPlan
}: QuickActionsSidebarProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'update': return <Zap className="w-4 h-4 text-blue-500" />;
      case 'tip': return <HelpCircle className="w-4 h-4 text-green-500" />;
      case 'feature': return <Sparkles className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="w-80 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20 p-6 space-y-6">
      {/* Quick Actions */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={onCreateProject}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Project
          </Button>

          <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Create from Template
              </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-xs !w-[85vw] !max-h-[80vh] !top-[5vh] !translate-y-0 !overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Choose a Template</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-1 mt-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onCreateFromTemplate(template.id);
                      setShowTemplates(false);
                    }}
                    className="p-1.5 rounded-lg border border-transparent hover:border-blue-200 transition-colors text-left"
                  >
                    <div className="flex items-start gap-1.5">
                      <div className={`p-1 rounded ${template.color}`}>
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-xs truncate">{template.name}</h3>
                        <p className="text-[10px] text-gray-600 mt-0.5 leading-tight line-clamp-2">{template.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700 flex items-center justify-between">
            <span>Updates</span>
            <Badge variant="secondary" className="text-xs">
              {notifications.filter(n => n.unread).length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 ${notification.unread ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
            >
              <div className="flex items-start gap-2">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{notification.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowNotifications(true)}
          >
            View All Updates
          </Button>
        </CardContent>
      </Card>

      {/* AI Features */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-purple-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Features
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-300">
              New
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <a href="/app/calls" className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start hover:bg-purple-100 bg-purple-50 border border-purple-200"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Intelligence
              <Badge variant="secondary" className="ml-auto text-xs bg-green-500 text-white">
                NEW
              </Badge>
            </Button>
          </a>
          <a href="/dashboard/ask" className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start hover:bg-purple-100 bg-purple-50 border border-purple-200"
            >
              <MessageSquareText className="w-4 h-4 mr-2" />
              Ask SignalsLoop
              <Badge variant="secondary" className="ml-auto text-xs bg-green-500 text-white">
                NEW
              </Badge>
            </Button>
          </a>
          <a href="/app/user-stories" className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start hover:bg-purple-100"
            >
              <FileText className="w-4 h-4 mr-2" />
              User Stories
            </Button>
          </a>
          <a href="/app/roadmap" className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start hover:bg-purple-100"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              AI Roadmap
            </Button>
          </a>
          <a href="/app/mission-control" className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start hover:bg-purple-100 bg-blue-50 border border-blue-200"
            >
              <Brain className="w-4 h-4 mr-2" />
              Mission Control
              <Badge variant="secondary" className="ml-auto text-xs bg-blue-500 text-white">
                NEW
              </Badge>
            </Button>
          </a>
          <a href="/app/analytics" className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start hover:bg-purple-100"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Help & Resources */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">Help & Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open('/support', '_blank')}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Help Center
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowChangelog(true)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Platform Changelog
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open('/docs/api', '_blank')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            API Documentation
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open('/app/billing', '_blank')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Account Settings
          </Button>
        </CardContent>
      </Card>

      {/* Plan Status */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">Your Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 capitalize">{userPlan} Plan</p>
              <p className="text-xs text-gray-600">
                {userPlan === 'free' ? 'Upgrade for more features' : 'All features unlocked'}
              </p>
            </div>
            {userPlan === 'free' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open('/app/billing', '_blank')}
              >
                Upgrade
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Changelog Dialog */}
      <Dialog open={showChangelog} onOpenChange={setShowChangelog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-1/2 -translate-y-1/2">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SignalsLoop Platform Changelog
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4 pr-2">
            {changelogItems.map((item) => (
              <div key={item.version} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    {item.version}
                  </Badge>
                  <span className="text-sm text-gray-500 font-medium">{item.date}</span>
                </div>
                <ul className="space-y-2">
                  {item.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
