'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Settings,
  Palette,
  Eye,
  EyeOff,
  Mail,
  Bell,
  Target,
  Clock,
  BarChart3,
  Save,
  RefreshCw,
  Upload,
  Link as LinkIcon,
  Globe,
  Lock
} from 'lucide-react';

interface RoadmapSettingsProps {
  projectId: string;
  initialSettings?: {
    roadmap_title?: string;
    roadmap_description?: string;
    roadmap_logo_url?: string;
    roadmap_brand_color?: string;
    roadmap_custom_css?: string;
    roadmap_show_progress?: boolean;
    roadmap_show_effort?: boolean;
    roadmap_show_timeline?: boolean;
    roadmap_allow_anonymous_votes?: boolean;
    roadmap_subscribe_emails?: boolean;
  };
}

export default function RoadmapSettings({ projectId, initialSettings = {} }: RoadmapSettingsProps) {
  const [settings, setSettings] = useState({
    roadmap_title: '',
    roadmap_description: '',
    roadmap_logo_url: '',
    roadmap_brand_color: '#3B82F6',
    roadmap_custom_css: '',
    roadmap_show_progress: true,
    roadmap_show_effort: true,
    roadmap_show_timeline: true,
    roadmap_allow_anonymous_votes: true,
    roadmap_subscribe_emails: false,
    ...initialSettings
  });

  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/roadmap-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast.success('Roadmap settings saved successfully!');
    } catch (error) {
      console.error('Error saving roadmap settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSettings({
      roadmap_title: '',
      roadmap_description: '',
      roadmap_logo_url: '',
      roadmap_brand_color: '#3B82F6',
      roadmap_custom_css: '',
      roadmap_show_progress: true,
      roadmap_show_effort: true,
      roadmap_show_timeline: true,
      roadmap_allow_anonymous_votes: true,
      roadmap_subscribe_emails: false,
      ...initialSettings
    });
    toast.info('Settings reset to defaults');
  };

  const colorPresets = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Roadmap Settings</h2>
          <p className="text-gray-600 mt-1">
            Customize your public roadmap appearance and features
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {previewMode ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Branding & Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="roadmap_title">Custom Roadmap Title</Label>
                <Input
                  id="roadmap_title"
                  value={settings.roadmap_title}
                  onChange={(e) => setSettings(prev => ({ ...prev, roadmap_title: e.target.value }))}
                  placeholder="e.g., Product Roadmap 2024"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty to use project name
                </p>
              </div>

              <div>
                <Label htmlFor="roadmap_description">Roadmap Description</Label>
                <Textarea
                  id="roadmap_description"
                  value={settings.roadmap_description}
                  onChange={(e) => setSettings(prev => ({ ...prev, roadmap_description: e.target.value }))}
                  placeholder="Describe your roadmap mission and goals..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="roadmap_logo_url">Logo URL</Label>
                <Input
                  id="roadmap_logo_url"
                  value={settings.roadmap_logo_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, roadmap_logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Square logo recommended (64x64px or larger)
                </p>
              </div>

              <div>
                <Label>Brand Color</Label>
                <div className="flex items-center space-x-3 mt-2">
                  <Input
                    type="color"
                    value={settings.roadmap_brand_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, roadmap_brand_color: e.target.value }))}
                    className="w-16 h-10 p-1 border border-gray-300 rounded"
                  />
                  <Input
                    value={settings.roadmap_brand_color}
                    onChange={(e) => setSettings(prev => ({ ...prev, roadmap_brand_color: e.target.value }))}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {colorPresets.map(color => (
                    <button
                      key={color}
                      onClick={() => setSettings(prev => ({ ...prev, roadmap_brand_color: color }))}
                      className={`w-8 h-8 rounded border-2 ${
                        settings.roadmap_brand_color === color ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Display Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Progress Bars</Label>
                  <p className="text-sm text-gray-500">
                    Display progress bars for in-progress items
                  </p>
                </div>
                <Switch
                  checked={settings.roadmap_show_progress}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, roadmap_show_progress: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Effort Estimates</Label>
                  <p className="text-sm text-gray-500">
                    Display T-shirt size effort estimates (S, M, L, XL)
                  </p>
                </div>
                <Switch
                  checked={settings.roadmap_show_effort}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, roadmap_show_effort: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Timeline Estimates</Label>
                  <p className="text-sm text-gray-500">
                    Display estimated completion timelines
                  </p>
                </div>
                <Switch
                  checked={settings.roadmap_show_timeline}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, roadmap_show_timeline: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Interaction Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Public Interaction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Anonymous Voting</Label>
                  <p className="text-sm text-gray-500">
                    Let visitors vote without signing in
                  </p>
                </div>
                <Switch
                  checked={settings.roadmap_allow_anonymous_votes}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, roadmap_allow_anonymous_votes: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Email Subscriptions</Label>
                  <p className="text-sm text-gray-500">
                    Allow visitors to subscribe to roadmap updates
                  </p>
                </div>
                <Switch
                  checked={settings.roadmap_subscribe_emails}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, roadmap_subscribe_emails: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Customization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="h-5 w-5 mr-2" />
                Advanced Customization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="roadmap_custom_css">Custom CSS</Label>
                <Textarea
                  id="roadmap_custom_css"
                  value={settings.roadmap_custom_css}
                  onChange={(e) => setSettings(prev => ({ ...prev, roadmap_custom_css: e.target.value }))}
                  placeholder="/* Add custom CSS here */&#10;.roadmap-header {&#10;  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);&#10;}"
                  className="mt-1 font-mono text-sm"
                  rows={8}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Pro feature: Add custom styling to your roadmap
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {settings.roadmap_logo_url ? (
                      <img 
                        src={settings.roadmap_logo_url} 
                        alt="Logo"
                        className="w-8 h-8 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: settings.roadmap_brand_color }}
                      >
                        <BarChart3 className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <h3 
                    className="text-lg font-semibold"
                    style={{ color: settings.roadmap_brand_color }}
                  >
                    {settings.roadmap_title || 'Your Roadmap'}
                  </h3>
                  {settings.roadmap_description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {settings.roadmap_description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress Bars</span>
                    <Badge variant={settings.roadmap_show_progress ? "default" : "secondary"}>
                      {settings.roadmap_show_progress ? "On" : "Off"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Effort Estimates</span>
                    <Badge variant={settings.roadmap_show_effort ? "default" : "secondary"}>
                      {settings.roadmap_show_effort ? "On" : "Off"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Timeline Estimates</span>
                    <Badge variant={settings.roadmap_show_timeline ? "default" : "secondary"}>
                      {settings.roadmap_show_timeline ? "On" : "Off"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Anonymous Voting</span>
                    <Badge variant={settings.roadmap_allow_anonymous_votes ? "default" : "secondary"}>
                      {settings.roadmap_allow_anonymous_votes ? "On" : "Off"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Email Subscriptions</span>
                    <Badge variant={settings.roadmap_subscribe_emails ? "default" : "secondary"}>
                      {settings.roadmap_subscribe_emails ? "On" : "Off"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LinkIcon className="h-5 w-5 mr-2" />
                Roadmap Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Public Roadmap</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={`${window.location.origin}/${projectId}/roadmap`}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/${projectId}/roadmap`);
                      toast.success('Link copied to clipboard');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
