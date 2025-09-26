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
  BarChart3
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
    type: 'update',
    title: 'New AI Features Available',
    message: 'Try our enhanced categorization and priority scoring',
    timestamp: '2 hours ago',
    unread: true
  },
  {
    id: '2',
    type: 'tip',
    title: 'Pro Tip: Widget Analytics',
    message: 'Track widget performance with detailed analytics',
    timestamp: '1 day ago',
    unread: false
  },
  {
    id: '3',
    type: 'feature',
    title: 'Custom Domains Now Available',
    message: 'Use your own domain for feedback boards',
    timestamp: '3 days ago',
    unread: false
  }
];

const changelogItems = [
  {
    version: 'v2.1.0',
    date: '2024-01-15',
    features: [
      'Enhanced AI categorization accuracy',
      'New widget analytics dashboard',
      'Improved mobile responsiveness'
    ]
  },
  {
    version: 'v2.0.5',
    date: '2024-01-10',
    features: [
      'Bug fixes in voting system',
      'Performance improvements',
      'Updated UI components'
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
              className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 ${
                notification.unread ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
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

      {/* Help & Resources */}
      <Card className="bg-white/60 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-700">Help & Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start">
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
            Changelog
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <BarChart3 className="w-4 h-4 mr-2" />
            API Documentation
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>SignalsLoop Changelog</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {changelogItems.map((item) => (
              <div key={item.version} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{item.version}</Badge>
                  <span className="text-sm text-gray-500">{item.date}</span>
                </div>
                <ul className="space-y-1">
                  {item.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      {feature}
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
