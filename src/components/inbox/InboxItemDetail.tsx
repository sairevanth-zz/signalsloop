/**
 * Inbox Item Detail Component
 * Detailed view of a single unified feedback item
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UnifiedFeedbackItem,
  Customer,
  INTEGRATION_CONFIGS,
} from '@/lib/inbox/types';
import {
  Star,
  Archive,
  ExternalLink,
  MessageSquare,
  Send,
  X,
  Clock,
  User,
  Building,
  Mail,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Activity,
  CheckCircle,
  Tag,
  Link2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface InboxItemDetailProps {
  item: UnifiedFeedbackItem;
  onClose?: () => void;
  onAction?: (action: string, data?: any) => void;
  className?: string;
}

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  bug: { label: 'Bug', emoji: '🐛', color: 'bg-red-100 text-red-800 border-red-200' },
  feature_request: { label: 'Feature Request', emoji: '✨', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  praise: { label: 'Praise', emoji: '🎉', color: 'bg-green-100 text-green-800 border-green-200' },
  complaint: { label: 'Complaint', emoji: '😤', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  question: { label: 'Question', emoji: '❓', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  churn_risk: { label: 'Churn Risk', emoji: '⚠️', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  other: { label: 'Other', emoji: '📝', color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

export function InboxItemDetail({
  item,
  onClose,
  onAction,
  className,
}: InboxItemDetailProps) {
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [similarItems, setSimilarItems] = useState<UnifiedFeedbackItem[]>([]);
  const [customerFeedback, setCustomerFeedback] = useState<UnifiedFeedbackItem[]>([]);
  
  const categoryMeta = CATEGORY_META[item.category || 'other'];
  const sourceConfig = INTEGRATION_CONFIGS[item.sourceType];
  
  // Load similar items and customer feedback
  useEffect(() => {
    // Mark as read when opened
    if (!item.readAt) {
      onAction?.('markRead');
    }
    
    // Load similar items
    if (item.projectId) {
      fetch(`/api/inbox/items?projectId=${item.projectId}&tags=${item.tags?.join(',')}&limit=5`)
        .then(res => res.json())
        .then(data => {
          const filtered = (data.items || []).filter((i: any) => i.id !== item.id);
          setSimilarItems(filtered.slice(0, 3));
        })
        .catch(console.error);
      
      // Load customer feedback if customer exists
      if (item.customerId) {
        fetch(`/api/inbox/customers/${item.customerId}`)
          .then(res => res.json())
          .then(data => {
            const filtered = (data.feedback || []).filter((i: any) => i.id !== item.id);
            setCustomerFeedback(filtered.slice(0, 5));
          })
          .catch(console.error);
      }
    }
  }, [item.id, item.projectId, item.customerId, item.readAt, item.tags, onAction]);
  
  const handleReply = async () => {
    if (!replyContent.trim()) return;
    
    setIsReplying(true);
    try {
      await onAction?.('reply', {
        content: replyContent,
        sentVia: item.sourceType,
      });
      setReplyContent('');
    } finally {
      setIsReplying(false);
    }
  };
  
  const getSentimentIcon = () => {
    if (!item.sentimentScore) return <Minus className="h-4 w-4 text-gray-400" />;
    if (item.sentimentScore > 0.3) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (item.sentimentScore < -0.3) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };
  
  const getSentimentLabel = () => {
    if (!item.sentimentScore) return 'Unknown';
    if (item.sentimentScore > 0.3) return 'Positive';
    if (item.sentimentScore < -0.3) return 'Negative';
    return 'Neutral';
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded-full border ${categoryMeta.color}`}>
              {categoryMeta.emoji} {categoryMeta.label}
            </span>
            <Badge variant="outline" className="text-xs">
              {sourceConfig?.name || item.sourceType}
            </Badge>
            {item.urgencyScore && item.urgencyScore >= 4 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgent
              </Badge>
            )}
          </div>
          {item.title && (
            <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction?.('toggleStarred')}
            className={item.starred ? 'text-yellow-500' : 'text-gray-400'}
          >
            <Star className="h-4 w-4" fill={item.starred ? 'currentColor' : 'none'} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction?.('archive')}
          >
            <Archive className="h-4 w-4" />
          </Button>
          {item.sourceUrl && (
            <Button variant="ghost" size="sm" asChild>
              <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="content" className="h-full">
          <TabsList className="px-4 pt-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            {item.customer && <TabsTrigger value="customer">Customer</TabsTrigger>}
            {similarItems.length > 0 && <TabsTrigger value="similar">Similar</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="content" className="p-4 space-y-4">
            {/* Author Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {item.authorAvatarUrl && (
                      <AvatarImage src={item.authorAvatarUrl} alt={item.authorName || ''} />
                    )}
                    <AvatarFallback>
                      {(item.authorName || item.authorUsername || 'A')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {item.authorName || item.authorUsername || 'Anonymous'}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-3">
                      {item.authorEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {item.authorEmail}
                        </span>
                      )}
                      {item.sourceChannel && (
                        <span>#{item.sourceChannel}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(item.originalCreatedAt), 'PPp')}
                    </div>
                    <div className="text-xs">
                      {formatDistanceToNow(new Date(item.originalCreatedAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Main Content */}
            <Card>
              <CardContent className="p-4">
                <div className="prose prose-sm max-w-none">
                  {item.contentHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: item.contentHtml }} />
                  ) : (
                    <p className="whitespace-pre-wrap">{item.content}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4 text-gray-400" />
                {item.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Engagement Metrics */}
            {item.engagementMetrics && Object.keys(item.engagementMetrics).length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Engagement</h4>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    {item.engagementMetrics.likes !== undefined && (
                      <div>
                        <div className="text-lg font-semibold">{item.engagementMetrics.likes}</div>
                        <div className="text-xs text-gray-500">Likes</div>
                      </div>
                    )}
                    {item.engagementMetrics.replies !== undefined && (
                      <div>
                        <div className="text-lg font-semibold">{item.engagementMetrics.replies}</div>
                        <div className="text-xs text-gray-500">Replies</div>
                      </div>
                    )}
                    {item.engagementMetrics.shares !== undefined && (
                      <div>
                        <div className="text-lg font-semibold">{item.engagementMetrics.shares}</div>
                        <div className="text-xs text-gray-500">Shares</div>
                      </div>
                    )}
                    {item.engagementMetrics.upvotes !== undefined && (
                      <div>
                        <div className="text-lg font-semibold">{item.engagementMetrics.upvotes}</div>
                        <div className="text-xs text-gray-500">Upvotes</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Reply Section */}
            {item.status !== 'replied' && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Reply</h4>
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      onClick={handleReply}
                      disabled={!replyContent.trim() || isReplying}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isReplying ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Previous Reply */}
            {item.replyContent && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Replied via {item.replySentVia} •{' '}
                    {item.repliedAt && formatDistanceToNow(new Date(item.repliedAt), { addSuffix: true })}
                  </div>
                  <p className="text-sm text-green-800 whitespace-pre-wrap">{item.replyContent}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="analysis" className="p-4 space-y-4">
            {/* AI Summary */}
            {item.aiSummary && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{item.aiSummary}</p>
                </CardContent>
              </Card>
            )}
            
            {/* Classification Confidence */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Classification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Category</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full border ${categoryMeta.color}`}>
                        {categoryMeta.emoji} {categoryMeta.label}
                      </span>
                      {item.categoryConfidence && (
                        <span className="text-xs text-gray-500">
                          {Math.round(item.categoryConfidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sentiment</span>
                    <div className="flex items-center gap-2">
                      {getSentimentIcon()}
                      <span className="text-sm">{getSentimentLabel()}</span>
                      {item.sentimentScore !== undefined && (
                        <span className="text-xs text-gray-500">
                          ({item.sentimentScore.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Urgency</span>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`w-2 h-4 mx-0.5 rounded ${
                              (item.urgencyScore || 0) >= level
                                ? level >= 4
                                  ? 'bg-red-500'
                                  : level >= 3
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm">{item.urgencyScore || 0}/5</span>
                    </div>
                  </div>
                  
                  {item.urgencyReason && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      {item.urgencyReason}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {item.customer && (
            <TabsContent value="customer" className="p-4 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-14 w-14">
                      {item.customer.avatarUrl && (
                        <AvatarImage src={item.customer.avatarUrl} alt={item.customer.name || ''} />
                      )}
                      <AvatarFallback className="text-lg">
                        {(item.customer.name || item.customer.email || 'C')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {item.customer.name || 'Unknown'}
                      </h3>
                      {item.customer.company && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {item.customer.company}
                        </div>
                      )}
                      {item.customer.email && (
                        <div className="text-sm text-gray-500">{item.customer.email}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {item.customer.mrr !== undefined && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 uppercase">MRR</div>
                        <div className="text-lg font-semibold text-green-600 flex items-center">
                          <DollarSign className="h-4 w-4" />
                          {item.customer.mrr.toLocaleString()}
                        </div>
                      </div>
                    )}
                    
                    {item.customer.healthScore !== undefined && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 uppercase">Health Score</div>
                        <div className={`text-lg font-semibold flex items-center ${
                          item.customer.healthScore >= 70
                            ? 'text-green-600'
                            : item.customer.healthScore >= 40
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}>
                          <Activity className="h-4 w-4 mr-1" />
                          {item.customer.healthScore}
                        </div>
                      </div>
                    )}
                    
                    {item.customer.totalFeedbackCount !== undefined && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 uppercase">Total Feedback</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {item.customer.totalFeedbackCount}
                        </div>
                      </div>
                    )}
                    
                    {item.customer.churnRisk && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500 uppercase">Churn Risk</div>
                        <Badge
                          variant={
                            item.customer.churnRisk === 'critical'
                              ? 'destructive'
                              : item.customer.churnRisk === 'high'
                              ? 'destructive'
                              : item.customer.churnRisk === 'medium'
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {item.customer.churnRisk}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Customer's Other Feedback */}
              {customerFeedback.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recent Feedback from Customer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {customerFeedback.map((feedback) => (
                        <div
                          key={feedback.id}
                          className="p-2 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-900 truncate">
                              {feedback.aiSummary || feedback.content.substring(0, 100)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(feedback.originalCreatedAt), { addSuffix: true })}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
          
          {similarItems.length > 0 && (
            <TabsContent value="similar" className="p-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Similar Feedback
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {similarItems.map((similar) => (
                      <div
                        key={similar.id}
                        className="p-3 hover:bg-gray-50 rounded border cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {INTEGRATION_CONFIGS[similar.sourceType]?.name || similar.sourceType}
                          </Badge>
                          {similar.category && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              CATEGORY_META[similar.category]?.color || 'bg-gray-100'
                            }`}>
                              {CATEGORY_META[similar.category]?.emoji}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(similar.originalCreatedAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {similar.aiSummary || similar.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
