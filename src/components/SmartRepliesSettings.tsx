'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Settings, 
  Save, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase-client';

interface SmartRepliesSettingsProps {
  projectId: string;
  projectSlug: string;
}

interface SmartRepliesConfig {
  enabled: boolean;
  max_replies: number;
  reply_types: string[];
}

export default function SmartRepliesSettings({ 
  projectId, 
  projectSlug 
}: SmartRepliesSettingsProps) {
  const [config, setConfig] = useState<SmartRepliesConfig>({
    enabled: true,
    max_replies: 3,
    reply_types: ['follow_up', 'clarification', 'details']
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [projectId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      
      const { data: project, error } = await supabase
        .from('projects')
        .select('smart_replies_enabled, smart_replies_config')
        .eq('id', projectId)
        .single();

      if (error) {
        throw error;
      }

      if (project) {
        setConfig({
          enabled: project.smart_replies_enabled ?? true,
          max_replies: project.smart_replies_config?.max_replies ?? 3,
          reply_types: project.smart_replies_config?.reply_types ?? ['follow_up', 'clarification', 'details']
        });
      }
    } catch (err) {
      console.error('Error loading smart replies settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('projects')
        .update({
          smart_replies_enabled: config.enabled,
          smart_replies_config: {
            max_replies: config.max_replies,
            reply_types: config.reply_types
          }
        })
        .eq('id', projectId);

      if (error) {
        throw error;
      }

      toast.success('Smart replies settings saved successfully!');
    } catch (err) {
      console.error('Error saving smart replies settings:', err);
      setError('Failed to save settings');
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleReplyType = (type: string) => {
    setConfig(prev => ({
      ...prev,
      reply_types: prev.reply_types.includes(type)
        ? prev.reply_types.filter(t => t !== type)
        : [...prev.reply_types, type]
    }));
  };

  const replyTypeOptions = [
    { value: 'follow_up', label: 'Follow-up Questions', description: 'General follow-up questions' },
    { value: 'clarification', label: 'Clarification', description: 'Questions seeking clarification' },
    { value: 'details', label: 'Details', description: 'Questions asking for more details' },
    { value: 'examples', label: 'Examples', description: 'Questions asking for examples' },
    { value: 'priority', label: 'Priority', description: 'Questions about priority and urgency' }
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-600">Loading smart replies settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <CardTitle>Smart Replies Settings</CardTitle>
          <Badge variant="outline" className="text-xs">
            AI Powered
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Enable/Disable Smart Replies */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="smart-replies-enabled" className="text-sm font-medium">
              Enable Smart Replies
            </Label>
            <p className="text-xs text-gray-600 mt-1">
              Automatically generate AI-powered follow-up questions for new posts
            </p>
          </div>
          <Switch
            id="smart-replies-enabled"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
          />
        </div>

        {config.enabled && (
          <>
            {/* Maximum Replies */}
            <div className="space-y-2">
              <Label htmlFor="max-replies" className="text-sm font-medium">
                Maximum Replies per Post
              </Label>
              <Input
                id="max-replies"
                type="number"
                min="1"
                max="5"
                value={config.max_replies}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  max_replies: Math.max(1, Math.min(5, parseInt(e.target.value) || 3))
                }))}
                className="w-20"
              />
              <p className="text-xs text-gray-600">
                Number of smart replies to generate for each new post (1-5)
              </p>
            </div>

            {/* Reply Types */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Reply Types
              </Label>
              <p className="text-xs text-gray-600">
                Select which types of questions the AI should generate
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                {replyTypeOptions.map((option) => (
                  <div 
                    key={option.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      config.reply_types.includes(option.value)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleReplyType(option.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{option.label}</span>
                          {config.reply_types.includes(option.value) && (
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
              <p className="text-xs text-gray-600 mb-2">
                For a new post titled "Add dark mode support", the AI will generate:
              </p>
              <div className="space-y-1">
                <div className="text-xs text-gray-700">• What specific elements should support dark mode?</div>
                <div className="text-xs text-gray-700">• Are there any design preferences for the dark theme?</div>
                <div className="text-xs text-gray-700">• Should this be a user preference or system-wide setting?</div>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center space-x-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
