'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, ThumbsUp, ThumbsDown, User, Calendar, ExternalLink } from 'lucide-react';

interface Review {
  id: string;
  platform: 'g2' | 'capterra' | 'trustradius';
  title: string;
  content: string;
  rating: number;
  reviewer_name: string;
  reviewer_role?: string;
  reviewer_company_size?: string;
  published_at: string;
  sentiment_category?: 'positive' | 'negative' | 'neutral' | 'mixed';
  mentioned_features?: string[];
  pros?: string[];
  cons?: string[];
  verified_reviewer: boolean;
}

interface ExternalReviewsPanelProps {
  competitorProductId: string;
  productName?: string;
}

export function ExternalReviewsPanel({
  competitorProductId,
  productName,
}: ExternalReviewsPanelProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');

  useEffect(() => {
    loadReviews();
  }, [competitorProductId, platformFilter, sentimentFilter]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        competitorProductId,
        ...(platformFilter !== 'all' && { platform: platformFilter }),
        ...(sentimentFilter !== 'all' && { sentiment: sentimentFilter }),
      });

      const res = await fetch(`/api/competitive/external/reviews?${params}`);
      const result = await res.json();

      if (result.success) {
        setReviews(result.reviews);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformBadge = (platform: string) => {
    const badges = {
      g2: { label: 'G2', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      capterra: { label: 'Capterra', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      trustradius: { label: 'TrustRadius', className: 'bg-green-100 text-green-700 border-green-200' },
    };
    return badges[platform as keyof typeof badges] || { label: platform, className: '' };
  };

  const getSentimentColor = (sentiment?: string) => {
    const colors = {
      positive: 'text-green-600',
      negative: 'text-red-600',
      neutral: 'text-gray-600',
      mixed: 'text-yellow-600',
    };
    return colors[sentiment as keyof typeof colors] || 'text-gray-600';
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="g2">G2</SelectItem>
            <SelectItem value="capterra">Capterra</SelectItem>
            <SelectItem value="trustradius">TrustRadius</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiment</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-gray-600 ml-auto">
          {reviews.length} review{reviews.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No reviews found matching your filters</p>
          </Card>
        ) : (
          reviews.map((review) => {
            const platformBadge = getPlatformBadge(review.platform);
            return (
              <Card key={review.id} className="p-6">
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{review.title || 'Untitled Review'}</h4>
                      <Badge variant="outline" className={platformBadge.className}>
                        {platformBadge.label}
                      </Badge>
                      {review.verified_reviewer && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm font-medium text-gray-700 ml-1">
                          {review.rating.toFixed(1)}
                        </span>
                      </div>
                      {review.sentiment_category && (
                        <span className={`text-sm font-medium ${getSentimentColor(review.sentiment_category)}`}>
                          {review.sentiment_category}
                        </span>
                      )}
                    </div>

                    {/* Reviewer Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {review.reviewer_name}
                      </span>
                      {review.reviewer_role && <span>{review.reviewer_role}</span>}
                      {review.reviewer_company_size && (
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {review.reviewer_company_size}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(review.published_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                <p className="text-gray-700 mb-4 leading-relaxed">{review.content}</p>

                {/* Pros & Cons */}
                {(review.pros && review.pros.length > 0) || (review.cons && review.cons.length > 0) ? (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {review.pros && review.pros.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <ThumbsUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-900">Pros</span>
                        </div>
                        <ul className="space-y-1">
                          {review.pros.map((pro, idx) => (
                            <li key={idx} className="text-sm text-gray-700">• {pro}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {review.cons && review.cons.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <ThumbsDown className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-gray-900">Cons</span>
                        </div>
                        <ul className="space-y-1">
                          {review.cons.map((con, idx) => (
                            <li key={idx} className="text-sm text-gray-700">• {con}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Mentioned Features */}
                {review.mentioned_features && review.mentioned_features.length > 0 && (
                  <div className="border-t pt-3">
                    <span className="text-xs font-medium text-gray-600 mb-2 block">
                      Mentioned Features:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {review.mentioned_features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
