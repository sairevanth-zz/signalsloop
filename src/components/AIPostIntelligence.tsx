'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Loader2, 
  TrendingUp,
  Zap,
  AlertCircle,
  Smile,
  Meh,
  Frown,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface PostIntelligence {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentScore: number;
  primaryEmotion: string;
  impactScore: number;
  urgency: number;
  businessValue: number;
  userPain: number;
  summary: string;
}

interface AIPostIntelligenceProps {
  title: string;
  description?: string;
  postType?: string;
}

export default function AIPostIntelligence({ title, description, postType }: AIPostIntelligenceProps) {
  const [intelligence, setIntelligence] = useState<PostIntelligence | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const analyzePost = async () => {
    if (!title.trim()) {
      toast.error('Please provide a title first');
      return;
    }

    try {
      setIsAnalyzing(true);
      
      const response = await fetch('/api/ai/post-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          postType: postType || 'general'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze post');
      }

      const data = await response.json();
      setIntelligence(data.intelligence);
      setIsVisible(true);
      toast.success('Analysis complete!');

    } catch (error) {
      console.error('Error analyzing post:', error);
      toast.error('Failed to analyze post');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="h-5 w-5 text-green-600" />;
      case 'negative':
        return <Frown className="h-5 w-5 text-red-600" />;
      case 'mixed':
        return <Meh className="h-5 w-5 text-yellow-600" />;
      default:
        return <Meh className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'negative':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'mixed':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImpactLevel = (score: number) => {
    if (score >= 70) return { label: 'HIGH', color: 'bg-red-100 text-red-700 border-red-300' };
    if (score >= 40) return { label: 'MEDIUM', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
    return { label: 'LOW', color: 'bg-gray-100 text-gray-700 border-gray-300' };
  };

  return (
    <div>
      {/* Analyze Button */}
      {!isVisible && (
        <Button
          onClick={analyzePost}
          disabled={isAnalyzing || !title.trim()}
          variant="outline"
          size="sm"
          className="w-full border-purple-200 text-purple-600 hover:bg-purple-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Analyze with AI
            </>
          )}
        </Button>
      )}

      {/* Intelligence Display */}
      {isVisible && intelligence && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base">AI Post Intelligence</CardTitle>
                <Badge variant="outline" className="text-xs">Pro</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Sentiment */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${getSentimentColor(intelligence.sentiment)}`}>
              <div className="flex items-center gap-2">
                {getSentimentIcon(intelligence.sentiment)}
                <div>
                  <p className="text-sm font-medium capitalize">{intelligence.sentiment} Sentiment</p>
                  <p className="text-xs opacity-75">Emotion: {intelligence.primaryEmotion}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{intelligence.sentimentScore}%</p>
              </div>
            </div>

            {/* Impact Score */}
            <div className="bg-white rounded-lg border border-purple-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Impact Score</span>
                </div>
                <Badge className={`text-xs ${getImpactLevel(intelligence.impactScore).color}`}>
                  {getImpactLevel(intelligence.impactScore).label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${intelligence.impactScore}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${getScoreColor(intelligence.impactScore)}`}>
                  {intelligence.impactScore}
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg border border-purple-100 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="h-3 w-3 text-orange-600" />
                  <p className="text-xs text-gray-600">Urgency</p>
                </div>
                <p className={`text-lg font-bold ${getScoreColor(intelligence.urgency)}`}>
                  {intelligence.urgency}
                </p>
              </div>
              
              <div className="bg-white rounded-lg border border-purple-100 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-blue-600" />
                  <p className="text-xs text-gray-600">Value</p>
                </div>
                <p className={`text-lg font-bold ${getScoreColor(intelligence.businessValue)}`}>
                  {intelligence.businessValue}
                </p>
              </div>
              
              <div className="bg-white rounded-lg border border-purple-100 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <p className="text-xs text-gray-600">Pain</p>
                </div>
                <p className={`text-lg font-bold ${getScoreColor(intelligence.userPain)}`}>
                  {intelligence.userPain}
                </p>
              </div>
            </div>

            {/* AI Summary */}
            <div className="bg-white rounded-lg border border-purple-200 p-3">
              <p className="text-xs font-medium text-purple-700 mb-1">💡 AI Recommendation</p>
              <p className="text-sm text-gray-700 leading-relaxed">{intelligence.summary}</p>
            </div>

            {/* Reanalyze Button */}
            <Button
              onClick={analyzePost}
              disabled={isAnalyzing}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Reanalyze'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

