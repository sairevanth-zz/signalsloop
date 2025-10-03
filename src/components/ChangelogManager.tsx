'use client';

import { useState, useEffect } from 'react';
// import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Calendar,
  Tag,
  Image,
  Video,
  Link,
  Settings,
  Users,
  Webhook,
  Rss
} from 'lucide-react';
import { format } from 'date-fns';

interface ChangelogManagerProps {
  projectId: string;
  projectSlug: string;
}

interface Release {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  release_type: 'major' | 'minor' | 'patch' | 'hotfix';
  published_at?: string;
  is_published: boolean;
  is_featured: boolean;
  version?: string;
  tags?: string[];
  changelog_entries: ChangelogEntry[];
  changelog_media: ChangelogMedia[];
}

interface ChangelogEntry {
  id: string;
  title: string;
  description?: string;
  entry_type: 'feature' | 'improvement' | 'fix' | 'security' | 'breaking';
  priority: 'low' | 'medium' | 'high' | 'critical';
  order_index: number;
}

interface ChangelogMedia {
  id: string;
  file_url: string;
  file_type: string;
  alt_text?: string;
  caption?: string;
  is_video: boolean;
}

export default function ChangelogManager({ projectId, projectSlug }: ChangelogManagerProps) {
  // const { user } = useAuth();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('releases');

  useEffect(() => {
    loadReleases();
  }, [projectId]);

  const loadReleases = async () => {
    try {
      const response = await fetch(`/api/projects-by-id/${projectId}/changelog`);
      if (response.ok) {
        const data = await response.json();
        setReleases(data);
      }
    } catch (error) {
      console.error('Error loading releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRelease = () => {
    // Navigate to create release page
    window.location.href = `/${projectSlug}/settings/changelog/new`;
  };

  const handleEditRelease = (releaseId: string) => {
    window.location.href = `/${projectSlug}/settings/changelog/${releaseId}`;
  };

  const handleTogglePublish = async (releaseId: string, isPublished: boolean) => {
    try {
      const response = await fetch(`/api/projects-by-id/${projectId}/changelog/${releaseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !isPublished }),
      });

      if (response.ok) {
        loadReleases();
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
    }
  };

  const handleDeleteRelease = async (releaseId: string) => {
    if (!confirm('Are you sure you want to delete this release? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects-by-id/${projectId}/changelog/${releaseId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadReleases();
      }
    } catch (error) {
      console.error('Error deleting release:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Changelog Management</h2>
          <p className="text-gray-600">Manage your product changelog and release notes</p>
        </div>
        <Button onClick={handleCreateRelease}>
          <Plus className="h-4 w-4 mr-2" />
          New Release
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="releases">Releases</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="releases" className="space-y-6">
          {/* Releases List */}
          {releases.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No releases yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first changelog release to keep your users informed about updates.
                </p>
                <Button onClick={handleCreateRelease}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Release
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {releases.map((release) => (
                <Card key={release.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{release.title}</CardTitle>
                          <Badge 
                            variant={release.is_published ? "default" : "secondary"}
                          >
                            {release.is_published ? 'Published' : 'Draft'}
                          </Badge>
                          {release.is_featured && (
                            <Badge variant="outline">Featured</Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-4">
                          <span>{release.release_type}</span>
                          {release.version && <span>v{release.version}</span>}
                          {release.published_at && (
                            <span>{format(new Date(release.published_at), 'MMM d, yyyy')}</span>
                          )}
                          <span>{release.changelog_entries.length} entries</span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePublish(release.id, release.is_published)}
                        >
                          {release.is_published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRelease(release.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRelease(release.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {release.excerpt && (
                    <CardContent>
                      <p className="text-gray-700">{release.excerpt}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Release Templates</CardTitle>
              <CardDescription>
                Create reusable templates for common release types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <Tag className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No templates yet
                </h3>
                <p className="text-gray-600">
                  Create templates to speed up your release creation process.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <CardTitle>Email Subscribers</CardTitle>
              <CardDescription>
                Manage your changelog email subscribers and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <Users className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Subscriber management
                </h3>
                <p className="text-gray-600">
                  View and manage your changelog email subscribers.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect your changelog with external services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Webhook className="h-5 w-5 text-gray-400" />
                    <div>
                      <h3 className="font-medium">Webhooks</h3>
                      <p className="text-sm text-gray-600">Get notified when releases are published</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Rss className="h-5 w-5 text-gray-400" />
                    <div>
                      <h3 className="font-medium">RSS Feed</h3>
                      <p className="text-sm text-gray-600">RSS feed for your changelog</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Feed
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Changelog Settings</CardTitle>
              <CardDescription>
                Configure your changelog appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Auto-notify subscribers</h3>
                    <p className="text-sm text-gray-600">
                      Automatically send email notifications when releases are published
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Allow public comments</h3>
                    <p className="text-sm text-gray-600">
                      Let users comment on changelog releases
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Show release timeline</h3>
                    <p className="text-sm text-gray-600">
                      Display a visual timeline of releases
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
