'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  Wrench, 
  Bug, 
  Shield,
  Zap,
  Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Release {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  release_type: 'major' | 'minor' | 'patch' | 'hotfix';
  published_at: string;
  version?: string;
  tags?: string[];
  is_featured: boolean;
  is_published?: boolean;
  order_index?: number | null;
  changelog_entries: ChangelogEntry[];
  changelog_media: ChangelogMedia[];
}

interface ChangelogEntry {
  id: string;
  title: string;
  description?: string;
  entry_type: 'feature' | 'improvement' | 'fix' | 'security' | 'breaking';
  priority: 'low' | 'medium' | 'high' | 'critical';
  icon?: string;
  color?: string;
}

interface ChangelogMedia {
  id: string;
  file_url: string;
  file_type: string;
  alt_text?: string;
  caption?: string;
  is_video: boolean;
  video_thumbnail_url?: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface PublicChangelogProps {
  project: Project;
  releases: Release[];
}

const entryTypeIcons = {
  feature: Sparkles,
  improvement: Wrench,
  fix: Bug,
  security: Shield,
  breaking: Zap,
};

const entryTypeColors = {
  feature: 'bg-green-100 text-green-800',
  improvement: 'bg-blue-100 text-blue-800',
  fix: 'bg-orange-100 text-orange-800',
  security: 'bg-red-100 text-red-800',
  breaking: 'bg-purple-100 text-purple-800',
};

const releaseTypeColors = {
  major: 'bg-purple-100 text-purple-800 border-purple-200',
  minor: 'bg-blue-100 text-blue-800 border-blue-200',
  patch: 'bg-green-100 text-green-800 border-green-200',
  hotfix: 'bg-red-100 text-red-800 border-red-200',
};

export default function PublicChangelog({ project, releases }: PublicChangelogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterReleaseType, setFilterReleaseType] = useState<string>('all');

  const publishedReleases = releases.filter((release) => release.is_published !== false);

  const filteredReleases = publishedReleases.filter(release => {
    const matchesSearch = searchTerm === '' || 
      release.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      release.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      release.changelog_entries.some(entry => 
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesType = filterType === 'all' || 
      release.changelog_entries.some(entry => entry.entry_type === filterType);

    const matchesReleaseType = filterReleaseType === 'all' || 
      release.release_type === filterReleaseType;

    return matchesSearch && matchesType && matchesReleaseType;
  });

  const featuredReleases = releases.filter(release => release.is_featured);
  const regularReleases = filteredReleases.filter(release => !release.is_featured);

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search changelog entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Entry Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="feature">Features</SelectItem>
                <SelectItem value="improvement">Improvements</SelectItem>
                <SelectItem value="fix">Fixes</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="breaking">Breaking Changes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterReleaseType} onValueChange={setFilterReleaseType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Release Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Releases</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="patch">Patch</SelectItem>
                <SelectItem value="hotfix">Hotfix</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Featured Releases */}
      {featuredReleases.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Featured Releases</h2>
          <div className="grid gap-6">
            {featuredReleases.map((release) => (
              <ReleaseCard key={release.id} release={release} project={project} featured />
            ))}
          </div>
        </div>
      )}

      {/* Regular Releases */}
      {regularReleases.length > 0 && (
        <div className="space-y-6">
          {featuredReleases.length > 0 && (
            <h2 className="text-xl font-semibold text-gray-900">All Releases</h2>
          )}
          <div className="space-y-6">
            {regularReleases.map((release) => (
              <ReleaseCard key={release.id} release={release} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredReleases.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Calendar className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No releases found
          </h3>
          <p className="text-gray-600">
            {searchTerm || filterType !== 'all' || filterReleaseType !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'No changelog releases have been published yet.'
            }
          </p>
        </div>
      )}
    </div>
  );
}

function ReleaseCard({ release, project, featured = false }: { 
  release: Release; 
  project: Project; 
  featured?: boolean;
}) {
  const releaseDate = new Date(release.published_at);
  
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${
      featured ? 'ring-2 ring-blue-500 ring-opacity-20' : ''
    }`}>
      {/* Release Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link 
                href={`/${project.slug}/changelog/${release.slug}`}
                className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {release.title}
              </Link>
              {featured && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Featured
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(releaseDate, 'MMM d, yyyy')}
              </div>
              <Badge 
                variant="outline" 
                className={releaseTypeColors[release.release_type]}
              >
                {release.release_type}
              </Badge>
              {release.version && (
                <Badge variant="outline" className="bg-gray-100 text-gray-800">
                  v{release.version}
                </Badge>
              )}
            </div>
            {release.excerpt && (
              <p className="text-gray-700 leading-relaxed">{release.excerpt}</p>
            )}
          </div>
        </div>
      </div>

      {/* Release Entries */}
      {release.changelog_entries.length > 0 && (
        <div className="p-6">
          <div className="space-y-4">
            {release.changelog_entries
              .sort((a, b) => a.order_index - b.order_index)
              .map((entry) => {
                const IconComponent = entry.icon 
                  ? entryTypeIcons[entry.entry_type as keyof typeof entryTypeIcons]
                  : entryTypeIcons.feature;
                
                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${entryTypeColors[entry.entry_type]}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{entry.title}</h4>
                        <Badge 
                          variant="secondary" 
                          className={entryTypeColors[entry.entry_type]}
                        >
                          {entry.entry_type}
                        </Badge>
                      </div>
                      {entry.description && (
                        <p className="text-gray-600 text-sm">{entry.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Release Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <Link 
          href={`/${project.slug}/changelog/${release.slug}`}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Read full release notes
          <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}
