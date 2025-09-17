'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface ContentItem {
  id: string;
  title: string;
  type: 'post' | 'page' | 'announcement';
  status: 'published' | 'draft' | 'archived';
  author: string;
  createdAt: string;
  updatedAt: string;
  views?: number;
  comments?: number;
}

export default function AdminContentPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    // Simulate loading content
    setTimeout(() => {
      setContent([
        {
          id: '1',
          title: 'Welcome to SignalsLoop',
          type: 'announcement',
          status: 'published',
          author: 'admin@signalsloop.com',
          createdAt: '2024-01-15',
          updatedAt: '2024-01-15',
          views: 1250,
          comments: 45
        },
        {
          id: '2',
          title: 'How to Get Started',
          type: 'page',
          status: 'published',
          author: 'admin@signalsloop.com',
          createdAt: '2024-01-10',
          updatedAt: '2024-01-12',
          views: 890,
          comments: 23
        },
        {
          id: '3',
          title: 'New Features Coming Soon',
          type: 'post',
          status: 'draft',
          author: 'admin@signalsloop.com',
          createdAt: '2024-01-20',
          updatedAt: '2024-01-20',
          views: 0,
          comments: 0
        },
        {
          id: '4',
          title: 'API Documentation',
          type: 'page',
          status: 'published',
          author: 'admin@signalsloop.com',
          createdAt: '2024-01-05',
          updatedAt: '2024-01-08',
          views: 2100,
          comments: 12
        }
      ]);
      setLoading(false);
    }, 1000);
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'post': return 'bg-blue-100 text-blue-800';
      case 'page': return 'bg-purple-100 text-purple-800';
      case 'announcement': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportContent = () => {
    toast.success('Content exported successfully!');
  };

  const importContent = () => {
    toast.success('Content imported successfully!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-600">
          Manage platform content, announcements, and documentation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Content</p>
                <p className="text-2xl font-bold">{content.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold text-green-600">
                  {content.filter(c => c.status === 'published').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Drafts</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {content.filter(c => c.status === 'draft').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-purple-600">
                  {content.reduce((sum, c) => sum + (c.views || 0), 0).toLocaleString()}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Content Actions</CardTitle>
          <CardDescription>
            Manage and organize your platform content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Content
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={exportContent}>
              <Download className="h-4 w-4" />
              Export Content
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={importContent}>
              <Upload className="h-4 w-4" />
              Import Content
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={loadContent}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Content Library
          </CardTitle>
          <CardDescription>
            Search and filter through all your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Content</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by title or author..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="type-filter">Type</Label>
                <select
                  id="type-filter"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="post">Posts</option>
                  <option value="page">Pages</option>
                  <option value="announcement">Announcements</option>
                </select>
              </div>
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <select
                  id="status-filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <Card>
        <CardHeader>
          <CardTitle>Content Items</CardTitle>
          <CardDescription>
            {filteredContent.length} of {content.length} content items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredContent.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <Badge className={getTypeColor(item.type)}>
                      {item.type}
                    </Badge>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Author:</strong> {item.author}</p>
                    <p><strong>Created:</strong> {new Date(item.createdAt).toLocaleDateString()}</p>
                    <p><strong>Updated:</strong> {new Date(item.updatedAt).toLocaleDateString()}</p>
                    {item.views !== undefined && (
                      <p><strong>Views:</strong> {item.views.toLocaleString()} | <strong>Comments:</strong> {item.comments || 0}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex items-center gap-1">
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-1 text-red-600 hover:text-red-700">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredContent.length === 0 && (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
                <p className="text-gray-600">
                  {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Create your first content item to get started'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
