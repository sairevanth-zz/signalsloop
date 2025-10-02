'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Loader2, 
  Send,
  RefreshCw,
  CheckCircle,
  Edit3,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import AIUpgradePrompt from './AIUpgradePrompt';

interface AIAutoResponseProps {
  postId: string;
  postTitle: string;
  postDescription?: string;
  postType: string;
  authorName?: string;
  projectId: string;
  onResponsePosted?: () => void;
}

export default function AIAutoResponse({ 
  postId, 
  postTitle, 
  postDescription, 
  postType,
  authorName,
  projectId,
  onResponsePosted 
}: AIAutoResponseProps) {
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [usageInfo, setUsageInfo] = useState<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    isPro: boolean;
  } | null>(null);

  // Don't auto-generate - let admin trigger manually
  // useEffect(() => {
  //   generateResponse();
  // }, [postId]);

  const generateResponse = async () => {
    try {
      setIsGenerating(true);
      
      // Check rate limit first
      const limitRes = await fetch(`/api/ai/check-limit?projectId=${projectId}&feature=auto_response`);
      if (limitRes.ok) {
        const limitData = await limitRes.json();
        setUsageInfo(limitData);
        
        if (!limitData.allowed) {
          toast.error('Free tier limit reached. Upgrade to Pro for unlimited AI features!');
          setIsGenerating(false);
          return;
        }
      }
      
      const res = await fetch('/api/ai/auto-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          projectId,
          title: postTitle,
          description: postDescription,
          postType,
          authorName
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await res.json();
      setResponse(data.response);
      setHasGenerated(true);

    } catch (error) {
      console.error('Error generating response:', error);
      toast.error('Failed to generate AI response');
    } finally {
      setIsGenerating(false);
    }
  };

  const postResponse = async () => {
    if (!response.trim()) {
      toast.error('Response cannot be empty');
      return;
    }

    if (!adminName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      setIsPosting(true);

      // Get auth token
      const { getSupabaseClient } = await import('@/lib/supabase-client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      console.log('Posting AI response:', { postId, adminName, responseLength: response.length });

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          content: response,
          name: adminName,
          email: session?.user?.email || null,
          parent_id: null
        }),
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to post response');
      }

      const data = await res.json();
      console.log('Success response:', data);

      toast.success('Response posted successfully!');
      
      // Clear the form
      setResponse('');
      setAdminName('');
      setHasGenerated(false);
      
      // Refresh comments
      onResponsePosted?.();
      
    } catch (error) {
      console.error('Error posting response:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to post response');
    } finally {
      setIsPosting(false);
    }
  };

  // Show upgrade prompt if limit reached
  if (usageInfo && !usageInfo.allowed) {
    return (
      <AIUpgradePrompt
        featureName="AI Auto-Response"
        current={usageInfo.current}
        limit={usageInfo.limit}
        remaining={usageInfo.remaining}
      />
    );
  }

  if (isGenerating && !hasGenerated) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            <p className="text-sm text-gray-700">AI is crafting a personalized response...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Show usage info if not Pro */}
      {usageInfo && !usageInfo.isPro && usageInfo.remaining <= 10 && (
        <div className="mb-4">
          <AIUpgradePrompt
            featureName="AI Auto-Response"
            current={usageInfo.current}
            limit={usageInfo.limit}
            remaining={usageInfo.remaining}
          />
        </div>
      )}
      
    
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base">AI Auto-Response</CardTitle>
            <Badge variant="outline" className="text-xs bg-white">Pro</Badge>
          </div>
          <div className="flex items-center gap-2">
            {hasGenerated && !isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 text-xs"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={generateResponse}
              disabled={isGenerating}
              className="h-8 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
              {hasGenerated ? 'Regenerate' : 'Generate'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* AI Generated Response */}
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          {isEditing ? (
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={6}
              className="text-sm"
            />
          ) : (
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {response}
            </p>
          )}
        </div>

        {isEditing && (
          <Button
            onClick={() => setIsEditing(false)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Done Editing
          </Button>
        )}

        {/* Admin Name Input */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Your name (will appear as comment author)
          </label>
          <input
            type="text"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 text-sm border border-purple-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Post Button */}
        <Button
          onClick={postResponse}
          disabled={isPosting || !response.trim() || !adminName.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          {isPosting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Post AI Response
            </>
          )}
        </Button>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-white/50 rounded-lg">
          <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600">
            AI generated a personalized response based on the feedback type and content. 
            Review and edit if needed, then post to engage with the user.
          </p>
        </div>
      </CardContent>
    </Card>
    </>
  );
}

