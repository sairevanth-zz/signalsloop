'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Bot, 
  Loader2, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface SmartReply {
  id?: string;
  reply_text: string;
  reply_type: 'follow_up' | 'clarification' | 'details';
  is_used?: boolean;
  created_at?: string;
}

interface SmartRepliesProps {
  postId: string;
  postTitle: string;
  postDescription?: string;
  onReplySelect?: (reply: string) => void;
  showSettings?: boolean;
}

export default function SmartReplies({ 
  postId, 
  postTitle, 
  postDescription,
  onReplySelect,
  showSettings = false 
}: SmartRepliesProps) {
  const [replies, setReplies] = useState<SmartReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing smart replies
  useEffect(() => {
    loadSmartReplies();
  }, [postId]);

  const loadSmartReplies = async () => {
    try {
      setLoading(true);
      // For now, skip loading existing replies since database might not be set up
      // We'll generate fresh replies each time
      setReplies([]);
    } catch (err) {
      console.error('Error loading smart replies:', err);
      setError('Failed to load smart replies');
    } finally {
      setLoading(false);
    }
  };

  const generateSmartReplies = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      // Generate smart replies directly using OpenAI API
      const response = await fetch('/api/ai/smart-replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          postId,
          title: postTitle,
          description: postDescription || ''
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate smart replies');
      }
      
      const data = await response.json();
      setReplies(data.replies || []);
      toast.success('Smart replies generated successfully!');
      
    } catch (err) {
      console.error('Error generating smart replies:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate smart replies');
      toast.error('Failed to generate smart replies');
    } finally {
      setGenerating(false);
    }
  };

  const markReplyAsUsed = async (replyId: string) => {
    try {
      // This would typically update the database
      // For now, we'll just update the local state
      setReplies(prev => prev.map(reply => 
        reply.id === replyId ? { ...reply, is_used: true } : reply
      ));
      
      toast.success('Reply marked as used');
    } catch (err) {
      console.error('Error marking reply as used:', err);
      toast.error('Failed to mark reply as used');
    }
  };

  const getReplyTypeColor = (type: string) => {
    switch (type) {
      case 'follow_up':
        return 'bg-blue-100 text-blue-800';
      case 'clarification':
        return 'bg-yellow-100 text-yellow-800';
      case 'details':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReplyTypeLabel = (type: string) => {
    switch (type) {
      case 'follow_up':
        return 'Follow-up';
      case 'clarification':
        return 'Clarification';
      case 'details':
        return 'Details';
      default:
        return 'Question';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-600">Loading smart replies...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Smart Replies</CardTitle>
            <Badge variant="outline" className="text-xs">
              AI Generated
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {showSettings && (
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button 
              onClick={generateSmartReplies}
              disabled={generating}
              size="sm"
              variant="outline"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}
        
        {replies.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Smart Replies Yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate AI-powered follow-up questions to gather more details about this feedback.
            </p>
            <Button onClick={generateSmartReplies} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Generate Smart Replies
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {replies.map((reply, index) => (
              <div 
                key={reply.id || index}
                className={`p-4 border rounded-lg transition-all duration-200 ${
                  reply.is_used 
                    ? 'bg-gray-50 border-gray-200 opacity-75' 
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getReplyTypeColor(reply.reply_type)}`}
                  >
                    {getReplyTypeLabel(reply.reply_type)}
                  </Badge>
                  
                  {reply.is_used && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-xs">Used</span>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-800 mb-3 leading-relaxed">
                  {reply.reply_text}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (onReplySelect) {
                          onReplySelect(reply.reply_text);
                        }
                        if (reply.id) {
                          markReplyAsUsed(reply.id);
                        }
                      }}
                      disabled={reply.is_used}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Use Reply
                    </Button>
                  </div>
                  
                  {reply.created_at && (
                    <span className="text-xs text-gray-500">
                      {new Date(reply.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
