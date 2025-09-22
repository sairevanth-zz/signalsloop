'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  XCircle,
  Loader2
} from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGating';

interface DuplicatePost {
  id: string;
  postId: string;
  title: string;
  description: string;
  similarity: number;
  reason: string;
  createdAt: string;
}

interface AIDuplicateDetectionProps {
  postId: string;
  projectId: string;
  userPlan: { plan: 'free' | 'pro' };
  onShowNotification?: (message: string, type: 'success' | 'error') => void;
}

export function AIDuplicateDetection({ 
  postId, 
  projectId, 
  userPlan, 
  onShowNotification 
}: AIDuplicateDetectionProps) {
  const [duplicates, setDuplicates] = useState<DuplicatePost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  const detectDuplicates = async () => {
    setIsLoading(true);
    try {
      // Get the current session token
      const supabase = (await import('@/lib/supabase-client')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        onShowNotification?.('Please sign in to use AI features', 'error');
        return;
      }

      const response = await fetch('/api/ai/duplicate-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ postId, projectId })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgrade_required) {
          onShowNotification?.('AI Duplicate Detection is a Pro feature', 'error');
          return;
        }
        throw new Error(data.error || 'Failed to detect duplicates');
      }

      setDuplicates(data.duplicates || []);
      setIsAnalyzed(true);
      
      if (data.duplicates.length === 0) {
        onShowNotification?.('No duplicates found', 'success');
      } else {
        onShowNotification?.(`Found ${data.duplicates.length} potential duplicates`, 'success');
      }
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      onShowNotification?.('Failed to detect duplicates', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsDuplicate = async (similarityId: string, action: 'confirmed' | 'dismissed') => {
    try {
      // Get the current session token
      const supabase = (await import('@/lib/supabase-client')).getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        onShowNotification?.('Please sign in to use AI features', 'error');
        return;
      }

      // Update similarity status in database
      const response = await fetch('/api/ai/duplicate-detection', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          similarityId, 
          status: action 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update duplicate status');
      }

      // Remove from local state
      setDuplicates(prev => prev.filter(d => d.id !== similarityId));
      onShowNotification?.(
        action === 'confirmed' ? 'Marked as duplicate' : 'Dismissed duplicate',
        'success'
      );
    } catch (error) {
      console.error('Error updating duplicate status:', error);
      onShowNotification?.('Failed to update duplicate status', 'error');
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 90) return 'bg-red-100 text-red-800 border-red-200';
    if (similarity >= 80) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (similarity >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <FeatureGate feature="ai_duplicate_detection" userPlan={userPlan}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            AI Duplicate Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isAnalyzed ? (
            <div className="text-center py-4">
              <Button 
                onClick={detectDuplicates}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing for duplicates...
                  </>
                ) : (
                  'Check for Duplicates'
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                AI will analyze this post against all other posts in your project
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicates.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No duplicates found! This post appears to be unique.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Found {duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    {duplicates.map((duplicate) => (
                      <Card key={duplicate.id} className="border-l-4 border-l-orange-400">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">
                                {duplicate.title}
                              </h4>
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {duplicate.description}
                              </p>
                              <p className="text-xs text-gray-500 mb-2">
                                {duplicate.reason}
                              </p>
                            </div>
                            <Badge className={getSimilarityColor(duplicate.similarity)}>
                              {duplicate.similarity}% similar
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsDuplicate(duplicate.id, 'confirmed')}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark as Duplicate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsDuplicate(duplicate.id, 'dismissed')}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Dismiss
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`/post/${duplicate.postId}`, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
              
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsAnalyzed(false);
                    setDuplicates([]);
                  }}
                  className="w-full"
                >
                  Analyze Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
