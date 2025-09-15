'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2,
  MessageSquare, 
  Search, 
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Lightbulb,
  FileText,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

// Loading Skeleton Components
export function PostListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-6 w-16 bg-muted rounded-full"></div>
              </div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
              <div className="h-16 bg-muted rounded"></div>
              <div className="flex items-center gap-4">
                <div className="h-8 w-20 bg-muted rounded"></div>
                <div className="h-3 w-24 bg-muted rounded"></div>
                <div className="h-3 w-20 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function VoteButtonSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col items-center gap-1 p-2">
        <div className="h-6 w-6 bg-muted rounded"></div>
        <div className="h-4 w-8 bg-muted rounded"></div>
      </div>
    </div>
  );
}

export function CommentSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-20 bg-muted rounded"></div>
            <div className="h-3 w-16 bg-muted rounded"></div>
          </div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-pulse space-y-2">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PostListSkeleton />
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-muted rounded w-1/2"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Empty State Components
export function EmptyPostsState({ onCreatePost }: { onCreatePost?: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">No feedback yet</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Be the first to share your ideas and help shape the future of this product!
        </p>
        {onCreatePost && (
          <Button onClick={onCreatePost}>
            <Lightbulb className="h-4 w-4 mr-2" />
            Submit First Idea
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyCommentsState() {
  return (
    <div className="text-center py-8">
      <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <h4 className="font-medium mb-1">No comments yet</h4>
      <p className="text-sm text-muted-foreground">
        Be the first to share your thoughts on this idea!
      </p>
    </div>
  );
}

export function EmptySearchState({ searchTerm }: { searchTerm: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">No results found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          No posts found for &quot;{searchTerm}&quot;. Try different keywords or browse all posts.
        </p>
        <Button variant="outline">
          Clear Search
        </Button>
      </CardContent>
    </Card>
  );
}

export function EmptyChangelogState({ isAdmin, onAddEntry }: { isAdmin: boolean; onAddEntry?: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">No updates yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {isAdmin 
            ? "Start documenting your product updates and improvements"
            : "Check back soon for the latest updates and improvements"
          }
        </p>
        {isAdmin && onAddEntry && (
          <Button onClick={onAddEntry}>
            <FileText className="h-4 w-4 mr-2" />
            Add First Update
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyRoadmapState() {
  return (
    <div className="text-center py-12">
      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="font-semibold mb-2">Roadmap coming soon</h3>
      <p className="text-sm text-muted-foreground">
        Once feedback is submitted and prioritized, you&apos;ll see the roadmap here.
      </p>
    </div>
  );
}

// Error State Components
export function NetworkErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <WifiOff className="h-12 w-12 text-destructive mb-4" />
        <h3 className="font-semibold mb-2">Connection Error</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Unable to load data. Please check your internet connection.
        </p>
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

export function RateLimitErrorState({ resetTime }: { resetTime?: string }) {
  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
      <Clock className="h-4 w-4" />
      <AlertDescription>
        <strong>Rate limit exceeded.</strong> Too many requests in a short time. 
        {resetTime && ` Try again after ${resetTime}.`}
      </AlertDescription>
    </Alert>
  );
}

export function PermissionErrorState() {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="font-semibold mb-2">Access Denied</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You don&apos;t have permission to access this content.
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </CardContent>
    </Card>
  );
}

export function ServerErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="font-semibold mb-2">Something went wrong</h3>
        <p className="text-sm text-muted-foreground mb-4">
          We&apos;re experiencing technical difficulties. Our team has been notified.
        </p>
        <div className="flex gap-2">
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Success States
export function SuccessState({ 
  title, 
  description, 
  action 
}: { 
  title: string; 
  description: string; 
  action?: { label: string; onClick: () => void } 
}) {
  return (
    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription>
        <strong>{title}</strong> {description}
        {action && (
          <Button size="sm" variant="link" className="h-auto p-0 ml-2" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Loading Button States
export function LoadingButton({ 
  loading, 
  children, 
  ...props 
}: { 
  loading: boolean; 
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}) {
  return (
    <Button disabled={loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {children}
    </Button>
  );
}

// Toast Notifications Helper
export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      icon: <CheckCircle className="h-4 w-4 text-green-600" />
    });
  },
  error: (message: string) => {
    toast.error(message, {
      icon: <XCircle className="h-4 w-4 text-red-600" />
    });
  },
  warning: (message: string) => {
    toast.warning(message, {
      icon: <AlertCircle className="h-4 w-4 text-orange-600" />
    });
  },
  info: (message: string) => {
    toast.info(message, {
      icon: <Wifi className="h-4 w-4 text-blue-600" />
    });
  }
};

// Form Validation States
export function FormFieldError({ message }: { message: string }) {
  return (
    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}

export function FormFieldSuccess({ message }: { message: string }) {
  return (
    <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
      <CheckCircle className="h-3 w-3" />
      {message}
    </p>
  );
}

// Demo Component showing all states
export function UIPolishDemo() {
  const [currentState, setCurrentState] = useState('loading');

  const states = [
    { id: 'loading', label: 'Loading States' },
    { id: 'empty', label: 'Empty States' },
    { id: 'error', label: 'Error States' },
    { id: 'success', label: 'Success States' }
  ];

  const renderCurrentState = () => {
    switch (currentState) {
      case 'loading':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Loading Skeletons</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Post List Skeleton</h4>
                <PostListSkeleton />
              </div>
              <div>
                <h4 className="font-medium mb-3">Dashboard Skeleton</h4>
                <DashboardSkeleton />
              </div>
            </div>
          </div>
        );
      
      case 'empty':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Empty States</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">No Posts</h4>
                <EmptyPostsState onCreatePost={() => alert('Create post clicked!')} />
              </div>
              <div>
                <h4 className="font-medium mb-3">No Search Results</h4>
                <EmptySearchState searchTerm="nonexistent feature" />
              </div>
            </div>
          </div>
        );
      
      case 'error':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Error States</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Network Error</h4>
                <NetworkErrorState onRetry={() => alert('Retry clicked!')} />
              </div>
              <div>
                <h4 className="font-medium mb-3">Rate Limit Error</h4>
                <RateLimitErrorState resetTime="5 minutes" />
              </div>
            </div>
          </div>
        );
      
      case 'success':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Success States</h3>
            <div className="space-y-4">
              <SuccessState 
                title="Post created!" 
                description="Your feedback has been submitted successfully." 
                action={{ label: "View post", onClick: () => alert('View post clicked!') }}
              />
              <SuccessState 
                title="Settings saved!" 
                description="Your changes have been applied." 
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">UI Polish Components</h2>
          <p className="text-muted-foreground">
            Comprehensive loading states, empty states, and error handling
          </p>
        </div>
      </div>

      {/* State Selector */}
      <div className="flex flex-wrap gap-2">
        {states.map((state) => (
          <Button
            key={state.id}
            variant={currentState === state.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentState(state.id)}
          >
            {state.label}
          </Button>
        ))}
      </div>

      {/* Current State Display */}
      <Card>
        <CardContent className="pt-6">
          {renderCurrentState()}
        </CardContent>
      </Card>

      {/* Usage Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Loading States</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Show skeletons immediately while data loads</li>
              <li>Match skeleton layout to actual content</li>
              <li>Use consistent animation timing (1.5s cycle)</li>
              <li>Provide loading feedback for actions longer than 1 second</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Empty States</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Always provide context about why content is empty</li>
              <li>Include clear next steps or actions when possible</li>
              <li>Use friendly, encouraging language</li>
              <li>Make empty states visually appealing with icons</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Error Handling</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Differentiate between network, permission, and server errors</li>
              <li>Provide clear recovery actions (retry, refresh, go back)</li>
              <li>Use appropriate visual hierarchy (destructive colors for errors)</li>
              <li>Show helpful error messages, not technical jargon</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Success Feedback</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Confirm successful actions immediately</li>
              <li>Use toast notifications for temporary feedback</li>
              <li>Include next steps or related actions when helpful</li>
              <li>Make success states feel rewarding and positive</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
