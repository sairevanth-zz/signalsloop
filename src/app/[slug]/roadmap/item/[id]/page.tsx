import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { 
  ArrowLeft,
  Calendar,
  User,
  ChevronUp,
  Share2,
  MessageCircle,
  Clock,
  Target,
  Tag,
  CheckCircle,
  Lightbulb,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RoadmapItemPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: RoadmapItemPageProps): Promise<Metadata> {
  const { slug, id } = await params;
  
  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        title,
        description,
        status,
        priority,
        effort_estimate,
        estimated_timeline,
        completion_date,
        projects!inner(name, slug, roadmap_title)
      `)
      .eq('id', id)
      .eq('projects.slug', slug)
      .single();

    if (error || !post) {
      return {
        title: 'Roadmap Item Not Found',
        description: 'The requested roadmap item could not be found.'
      };
    }

    const projectName = post.projects.roadmap_title || `${post.projects.name} Roadmap`;
    const title = `${post.title} | ${projectName}`;
    const description = post.description.length > 160 
      ? post.description.substring(0, 157) + '...'
      : post.description;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
        siteName: projectName,
        images: [
          {
            url: `/api/og/roadmap-item?title=${encodeURIComponent(post.title)}&status=${post.status}&priority=${post.priority || 'medium'}`,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Roadmap Item | SignalsLoop',
      description: 'View roadmap item details and progress.'
    };
  }
}

export default async function RoadmapItemPage({ params }: RoadmapItemPageProps) {
  const { slug, id } = await params;
  
  try {
    // Get post details with project info
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        description,
        category,
        vote_count,
        created_at,
        author_email,
        status,
        priority,
        effort_estimate,
        progress_percentage,
        estimated_timeline,
        completion_date,
        tags,
        last_updated,
        projects!inner(
          id,
          name,
          description,
          slug,
          custom_domain,
          is_private,
          roadmap_title,
          roadmap_description,
          roadmap_logo_url
        )
      `)
      .eq('id', id)
      .eq('projects.slug', slug)
      .single();

    if (postError || !post) {
      notFound();
    }

    const project = post.projects;

    // Check if project is private
    if (project.is_private) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Private Roadmap</h1>
            <p className="text-gray-600 mb-6">
              This roadmap item is private and requires authentication to access.
            </p>
            <div className="space-y-3">
              <a
                href={`/login?redirect=${encodeURIComponent(`/${slug}/roadmap/item/${id}`)}`}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
              >
                Sign In
              </a>
              <a
                href="/"
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors inline-block"
              >
                Create Your Own Board
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Get feedback for this post
    const { data: feedback } = await supabase
      .from('roadmap_feedback')
      .select(`
        id,
        content,
        author_name,
        is_anonymous,
        created_at
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: false });

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'planned':
          return <Lightbulb className="h-5 w-5 text-yellow-600" />;
        case 'in_progress':
          return <Clock className="h-5 w-5 text-blue-600" />;
        case 'completed':
          return <CheckCircle className="h-5 w-5 text-green-600" />;
        default:
          return <AlertCircle className="h-5 w-5 text-gray-600" />;
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'planned':
          return 'bg-yellow-100 text-yellow-800';
        case 'in_progress':
          return 'bg-blue-100 text-blue-800';
        case 'completed':
          return 'bg-green-100 text-green-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const priorityColors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700'
    };

    const effortSizes = {
      'XS': 'Extra Small',
      'S': 'Small',
      'M': 'Medium',
      'L': 'Large',
      'XL': 'Extra Large'
    };

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                {project.roadmap_logo_url ? (
                  <img 
                    src={project.roadmap_logo_url} 
                    alt={project.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                )}
                <div>
                  <Link 
                    href={`/${slug}/roadmap`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {project.roadmap_title || `${project.name} Roadmap`}
                  </Link>
                  <h1 className="text-lg font-semibold text-gray-900">{post.title}</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Link href={`/${slug}/roadmap`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Roadmap
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status and Metadata */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(post.status)}
                      <Badge className={getStatusColor(post.status)}>
                        {post.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {post.priority && (
                        <Badge className={priorityColors[post.priority as keyof typeof priorityColors]}>
                          {post.priority}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                      <Button variant="outline" size="sm">
                        <ChevronUp className="h-4 w-4 mr-2" />
                        {post.vote_count}
                      </Button>
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h1>
                  <p className="text-gray-700 leading-relaxed">{post.description}</p>
                </CardContent>
              </Card>

              {/* Progress Bar for In Progress Items */}
              {post.status === 'in_progress' && post.progress_percentage !== undefined && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Completion</span>
                        <span>{post.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${post.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Feedback Section */}
              {feedback && feedback.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Community Feedback ({feedback.length})
                    </h3>
                    <div className="space-y-4">
                      {feedback.map((item) => (
                        <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-2">
                          <p className="text-gray-700 mb-2">{item.content}</p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>
                              {item.is_anonymous ? 'Anonymous' : (item.author_name || 'Unknown')}
                            </span>
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Project Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Project</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-600 w-20">Name:</span>
                      <span className="text-sm text-gray-900">{project.name}</span>
                    </div>
                    {project.description && (
                      <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-600 w-20">About:</span>
                        <span className="text-sm text-gray-900">{project.description}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Link href={`/${slug}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        View All Feedback
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Roadmap Details */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Roadmap Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Created:</span>
                      <span className="text-sm text-gray-900 ml-2">
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    
                    {post.last_updated && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Updated:</span>
                        <span className="text-sm text-gray-900 ml-2">
                          {formatDate(post.last_updated)}
                        </span>
                      </div>
                    )}

                    {post.effort_estimate && (
                      <div className="flex items-center">
                        <Target className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Effort:</span>
                        <span className="text-sm text-gray-900 ml-2">
                          {effortSizes[post.effort_estimate as keyof typeof effortSizes]}
                        </span>
                      </div>
                    )}

                    {post.estimated_timeline && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Timeline:</span>
                        <span className="text-sm text-gray-900 ml-2">
                          {post.estimated_timeline}
                        </span>
                      </div>
                    )}

                    {post.completion_date && (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">Completed:</span>
                        <span className="text-sm text-gray-900 ml-2">
                          {formatDate(post.completion_date)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Category */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Category</h3>
                  <CategoryBadge category={post.category} />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-gray-500 mb-4">
                <span>Powered by</span>
                <Link href="/" className="font-semibold text-blue-600 hover:text-blue-700">
                  SignalsLoop
                </Link>
              </div>
              <p className="text-sm text-gray-500">
                Create your own professional roadmap in minutes. 
                <Link href="/" className="text-blue-600 hover:text-blue-700 ml-1">
                  Get started free →
                </Link>
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  } catch (error) {
    console.error('Error loading roadmap item:', error);
    notFound();
  }
}
