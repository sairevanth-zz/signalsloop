/**
 * Universal Inbox Page
 * Main inbox view for unified feedback from all sources
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InboxList, InboxItemDetail, IntegrationWizard } from '@/components/inbox';
import {
  UnifiedFeedbackItem,
  FeedbackIntegration,
  InboxStats,
  INTEGRATION_CONFIGS,
} from '@/lib/inbox/types';
import {
  Inbox,
  Plus,
  Settings,
  RefreshCw,
  Loader2,
  Plug,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

export default function InboxPage() {
  const params = useParams();
  const projectSlug = params?.slug as string;
  
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<UnifiedFeedbackItem | null>(null);
  const [integrations, setIntegrations] = useState<FeedbackIntegration[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  
  // Fetch project ID from slug
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects?slug=${projectSlug}`);
        const data = await response.json();
        if (data.projects?.[0]) {
          setProjectId(data.projects[0].id);
        }
      } catch (error) {
        console.error('[InboxPage] Error fetching project:', error);
      }
    };
    
    if (projectSlug) {
      fetchProject();
    }
  }, [projectSlug]);
  
  // Fetch integrations and stats
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        
        // Fetch integrations
        const intResponse = await fetch(`/api/inbox/integrations?projectId=${projectId}`);
        const intData = await intResponse.json();
        setIntegrations(intData.integrations || []);
        
        // Fetch stats
        const statsResponse = await fetch(`/api/inbox/stats?projectId=${projectId}`);
        const statsData = await statsResponse.json();
        setStats(statsData);
        
      } catch (error) {
        console.error('[InboxPage] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [projectId]);
  
  const handleSync = async () => {
    if (!projectId) return;
    
    setSyncing(true);
    try {
      await fetch('/api/inbox/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('[InboxPage] Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  const handleItemAction = async (action: string, data?: any) => {
    if (!selectedItem) return;
    
    try {
      const response = await fetch(`/api/inbox/items/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setSelectedItem(updated);
      }
    } catch (error) {
      console.error('[InboxPage] Action error:', error);
    }
  };
  
  const handleIntegrationComplete = (integration: FeedbackIntegration) => {
    setIntegrations([...integrations, integration]);
    setShowWizard(false);
  };
  
  const activeIntegrations = integrations.filter(i => i.isActive && i.isConnected);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Loading inbox...</p>
        </div>
      </div>
    );
  }
  
  // Empty state - no integrations
  if (integrations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Inbox className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Universal Feedback Inbox
            </h1>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Connect your feedback sources to receive all customer feedback in one unified inbox.
              AI will automatically categorize, prioritize, and deduplicate everything.
            </p>
            
            <Button size="lg" onClick={() => setShowWizard(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Integration
            </Button>
            
            <div className="mt-12 grid grid-cols-3 gap-6 text-left">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                  <Plug className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">15+ Integrations</h3>
                <p className="text-sm text-gray-500">
                  Connect Slack, Intercom, Gmail, Twitter, G2, App Store, and more.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">AI Classification</h3>
                <p className="text-sm text-gray-500">
                  Auto-categorize as bugs, features, praise, or complaints.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Smart Alerts</h3>
                <p className="text-sm text-gray-500">
                  Get notified about urgent feedback and churn risks.
                </p>
              </div>
            </div>
          </Card>
        </div>
        
        <IntegrationWizard
          projectId={projectId || ''}
          open={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={handleIntegrationComplete}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Inbox className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Universal Inbox</h1>
              <p className="text-sm text-gray-500">
                {stats?.totalItems || 0} items from {activeIntegrations.length} sources
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Connected Integrations */}
            <div className="flex items-center gap-1">
              {activeIntegrations.slice(0, 5).map((integration) => (
                <Badge
                  key={integration.id}
                  variant="outline"
                  className="text-xs"
                  title={`${INTEGRATION_CONFIGS[integration.integrationType]?.name}: ${integration.totalItemsSynced} items`}
                >
                  {INTEGRATION_CONFIGS[integration.integrationType]?.name || integration.integrationType}
                </Badge>
              ))}
              {activeIntegrations.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{activeIntegrations.length - 5}
                </Badge>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            
            <Button size="sm" onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-6">
          {/* List Panel */}
          <div className={`${selectedItem ? 'w-1/2' : 'w-full'} transition-all`}>
            {projectId && (
              <InboxList
                projectId={projectId}
                onItemSelect={setSelectedItem}
                selectedItemId={selectedItem?.id}
              />
            )}
          </div>
          
          {/* Detail Panel */}
          {selectedItem && (
            <div className="w-1/2">
              <Card className="sticky top-6 max-h-[calc(100vh-8rem)] overflow-hidden">
                <InboxItemDetail
                  item={selectedItem}
                  onClose={() => setSelectedItem(null)}
                  onAction={handleItemAction}
                />
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* Integration Wizard */}
      <IntegrationWizard
        projectId={projectId || ''}
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleIntegrationComplete}
      />
    </div>
  );
}
