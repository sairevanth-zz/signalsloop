'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save,
  Shield,
  Mail,
  Bell,
  Globe,
  Database,
  Key,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminSettings {
  platformName: string;
  platformUrl: string;
  adminEmails: string[];
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  emailNotifications: boolean;
  analyticsEnabled: boolean;
  apiRateLimit: number;
  maxProjectsPerUser: number;
  defaultPlan: 'free' | 'pro';
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({
    platformName: 'SignalsLoop',
    platformUrl: 'https://signalsloop.vercel.app',
    adminEmails: ['revanth@signalloop.com', 'admin@signalloop.com'],
    maintenanceMode: false,
    allowRegistrations: true,
    emailNotifications: true,
    analyticsEnabled: true,
    apiRateLimit: 1000,
    maxProjectsPerUser: 5,
    defaultPlan: 'free'
  });
  
  const [loading, setLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const updateSetting = <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const addAdminEmail = () => {
    if (newAdminEmail && !settings.adminEmails.includes(newAdminEmail)) {
      updateSetting('adminEmails', [...settings.adminEmails, newAdminEmail]);
      setNewAdminEmail('');
      toast.success('Admin email added successfully!');
    }
  };

  const removeAdminEmail = (email: string) => {
    updateSetting('adminEmails', settings.adminEmails.filter(e => e !== email));
    toast.success('Admin email removed successfully!');
  };

  const saveSettings = async () => {
    setLoading(true);
    
    // Simulate saving settings
    setTimeout(() => {
      setLoading(false);
      toast.success('Settings saved successfully!');
    }, 1000);
  };

  const resetSettings = () => {
    // Reset to default values
    setSettings({
      platformName: 'SignalsLoop',
      platformUrl: 'https://signalsloop.vercel.app',
      adminEmails: ['revanth@signalloop.com', 'admin@signalloop.com'],
      maintenanceMode: false,
      allowRegistrations: true,
      emailNotifications: true,
      analyticsEnabled: true,
      apiRateLimit: 1000,
      maxProjectsPerUser: 5,
      defaultPlan: 'free'
    });
    toast.success('Settings reset to defaults!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600">
          Configure platform settings and admin preferences
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            General Settings
          </CardTitle>
          <CardDescription>
            Basic platform configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                value={settings.platformName}
                onChange={(e) => updateSetting('platformName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="platform-url">Platform URL</Label>
              <Input
                id="platform-url"
                value={settings.platformUrl}
                onChange={(e) => updateSetting('platformUrl', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-projects">Max Projects Per User</Label>
              <Input
                id="max-projects"
                type="number"
                value={settings.maxProjectsPerUser}
                onChange={(e) => updateSetting('maxProjectsPerUser', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="default-plan">Default Plan</Label>
              <select
                id="default-plan"
                value={settings.defaultPlan}
                onChange={(e) => updateSetting('defaultPlan', e.target.value as 'free' | 'pro')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Admin Management
          </CardTitle>
          <CardDescription>
            Manage admin access and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="admin-emails">Admin Emails</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="admin-emails"
                placeholder="admin@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAdminEmail()}
              />
              <Button onClick={addAdminEmail} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {settings.adminEmails.map((email) => (
                <Badge key={email} variant="secondary" className="flex items-center gap-1">
                  {email}
                  <button
                    onClick={() => removeAdminEmail(email)}
                    className="ml-1 hover:text-red-600"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Platform Features
          </CardTitle>
          <CardDescription>
            Enable or disable platform features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
              <p className="text-sm text-gray-600">Put the platform in maintenance mode</p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allow-registrations">Allow Registrations</Label>
              <p className="text-sm text-gray-600">Allow new users to register</p>
            </div>
            <Switch
              id="allow-registrations"
              checked={settings.allowRegistrations}
              onCheckedChange={(checked) => updateSetting('allowRegistrations', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-gray-600">Send email notifications to users</p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="analytics-enabled">Analytics</Label>
              <p className="text-sm text-gray-600">Enable analytics tracking</p>
            </div>
            <Switch
              id="analytics-enabled"
              checked={settings.analyticsEnabled}
              onCheckedChange={(checked) => updateSetting('analyticsEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            API Settings
          </CardTitle>
          <CardDescription>
            Configure API limits and security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="api-rate-limit">API Rate Limit (requests per hour)</Label>
            <Input
              id="api-rate-limit"
              type="number"
              value={settings.apiRateLimit}
              onChange={(e) => updateSetting('apiRateLimit', parseInt(e.target.value))}
            />
            <p className="text-sm text-gray-600 mt-1">
              Maximum number of API requests allowed per hour per user
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Database Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Database Management
          </CardTitle>
          <CardDescription>
            Database maintenance and backup options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Backup Database
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Optimize Database
            </Button>
            <Button variant="outline" className="flex items-center gap-2 text-red-600 hover:text-red-700">
              <RefreshCw className="h-4 w-4" />
              Reset Database
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Database operations should be performed with caution. Always backup before making changes.
          </p>
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex gap-4">
        <Button onClick={saveSettings} disabled={loading} className="flex items-center gap-2">
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
        <Button variant="outline" onClick={resetSettings} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
