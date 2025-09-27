'use client';

import { format } from 'date-fns';
import { 
  Calendar, 
  Tag, 
  Sparkles, 
  Wrench, 
  Bug, 
  Shield,
  Zap,
  Share2,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface Release {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  release_type: 'major' | 'minor' | 'patch' | 'hotfix';
  published_at: string;
  version?: string;
  tags?: string[];
  is_featured: boolean;
  projects: {
    id: string;
    name: string;
    slug: string;
  };
  changelog_entries: ChangelogEntry[];
  changelog_media: ChangelogMedia[];
  changelog_feedback_links: {
    post_id: string;
    posts: {
      id: string;
      title: string;
      slug: string;
    };
  }[];
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

interface PublicChangelogReleaseProps {
  release: Release;
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

export default function PublicChangelogRelease({ release }: PublicChangelogReleaseProps) {
  const releaseDate = new Date(release.published_at);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: release.title,
          text: release.excerpt || `Check out the latest updates in ${release.title}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      // You could add a toast notification here
    }
  };

  return (
    <article className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Release Header */}
      <header className="p-8 border-b border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{release.title}</h1>
            
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                {format(releaseDate, 'MMMM d, yyyy')}
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
              
              {release.is_featured && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Featured
                </Badge>
              )}
            </div>

            {release.excerpt && (
              <p className="text-lg text-gray-700 leading-relaxed mb-6">{release.excerpt}</p>
            )}

            {release.tags && release.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {release.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-700">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="ml-4"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </header>

      {/* Release Content */}
      {release.content && (
        <div className="p-8 border-b border-gray-100">
          <div 
            className="prose prose-gray max-w-none"
            dangerouslySetInnerHTML={{ __html: release.content }}
          />
        </div>
      )}

      {/* Release Entries */}
      {release.changelog_entries.length > 0 && (
        <div className="p-8 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What's Changed</h2>
          
          <div className="space-y-6">
            {release.changelog_entries
              .sort((a, b) => a.order_index - b.order_index)
              .map((entry) => {
                const IconComponent = entry.icon 
                  ? entryTypeIcons[entry.entry_type as keyof typeof entryTypeIcons]
                  : entryTypeIcons.feature;
                
                return (
                  <div key={entry.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className={`p-3 rounded-lg ${entryTypeColors[entry.entry_type]}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{entry.title}</h3>
                        <Badge 
                          variant="secondary" 
                          className={entryTypeColors[entry.entry_type]}
                        >
                          {entry.entry_type}
                        </Badge>
                        {entry.priority === 'high' && (
                          <Badge variant="destructive">High Priority</Badge>
                        )}
                        {entry.priority === 'critical' && (
                          <Badge variant="destructive">Critical</Badge>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-gray-700 leading-relaxed">{entry.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Media Gallery */}
      {release.changelog_media.length > 0 && (
        <div className="p-8 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Screenshots & Videos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {release.changelog_media
              .sort((a, b) => a.display_order - b.display_order)
              .map((media) => (
                <div key={media.id} className="group">
                  {media.is_video ? (
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      {media.video_thumbnail_url ? (
                        <Image
                          src={media.video_thumbnail_url}
                          alt={media.alt_text || 'Video thumbnail'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[12px] border-l-gray-600 border-y-[8px] border-y-transparent ml-1"></div>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                          <div className="w-0 h-0 border-l-[12px] border-l-gray-600 border-y-[8px] border-y-transparent ml-1"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={media.file_url}
                        alt={media.alt_text || 'Screenshot'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}
                  {media.caption && (
                    <p className="text-sm text-gray-600 mt-2">{media.caption}</p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Related Feedback */}
      {release.changelog_feedback_links.length > 0 && (
        <div className="p-8 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Feedback</h2>
          
          <div className="space-y-3">
            {release.changelog_feedback_links.map((link) => (
              <div key={link.post_id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{link.posts.title}</h3>
                  <p className="text-sm text-gray-600">
                    This feature was requested in our feedback board
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={`/${release.projects.slug}/${link.posts.slug}`}>
                    View Feedback
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Release Footer */}
      <footer className="p-8 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Released on {format(releaseDate, 'MMMM d, yyyy \'at\' h:mm a')}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Release
            </Button>
          </div>
        </div>
      </footer>
    </article>
  );
}
