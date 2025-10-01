'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, 
  Loader2, 
  Wand2,
  ListOrdered,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface AIWritingAssistantProps {
  currentText: string;
  context: string; // The comment/post being replied to
  onTextImprove: (improvedText: string) => void;
  placeholder?: string;
}

export default function AIWritingAssistant({ 
  currentText, 
  context, 
  onTextImprove,
  placeholder = "Start typing your thoughts..."
}: AIWritingAssistantProps) {
  const [isImproving, setIsImproving] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const improveText = async (action: 'improve' | 'expand' | 'clarify' | 'professional') => {
    if (!currentText.trim()) {
      toast.error('Please type something first');
      return;
    }

    try {
      setIsImproving(true);
      
      const response = await fetch('/api/ai/writing-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: currentText,
          context: context,
          action: action
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to improve text');
      }

      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      } else if (data.improved) {
        onTextImprove(data.improved);
        toast.success('Text improved!');
      }

    } catch (error) {
      console.error('Error improving text:', error);
      toast.error('Failed to improve text');
    } finally {
      setIsImproving(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    onTextImprove(suggestion);
    setSuggestions([]);
    toast.success('Applied! Edit further if needed.');
  };

  return (
    <div className="space-y-2">
      {/* AI Badge - Always Visible */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-md">
          <Sparkles className="h-3 w-3 text-purple-600" />
          <span className="text-xs font-medium text-purple-700">AI Writing Assistant</span>
        </div>
        {!currentText.trim() && (
          <span className="text-xs text-gray-500 italic">Type something to get AI suggestions</span>
        )}
      </div>

      {/* Quick Actions */}
      {currentText.trim() && !suggestions.length && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => improveText('improve')}
            disabled={isImproving}
            size="sm"
            variant="outline"
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            {isImproving ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Wand2 className="h-3 w-3 mr-1" />
            )}
            Improve Writing
          </Button>
          
          <Button
            onClick={() => improveText('expand')}
            disabled={isImproving}
            size="sm"
            variant="outline"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <ArrowRight className="h-3 w-3 mr-1" />
            Expand Ideas
          </Button>
          
          <Button
            onClick={() => improveText('clarify')}
            disabled={isImproving}
            size="sm"
            variant="outline"
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <ListOrdered className="h-3 w-3 mr-1" />
            Make Clearer
          </Button>
          
          <Button
            onClick={() => improveText('professional')}
            disabled={isImproving}
            size="sm"
            variant="outline"
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            More Professional
          </Button>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <h4 className="font-medium text-sm text-gray-900">AI Suggestions</h4>
            </div>
            
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className="p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-300 transition-colors cursor-pointer group"
                  onClick={() => applySuggestion(suggestion)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800 flex-1">{suggestion}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        applySuggestion(suggestion);
                      }}
                    >
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Button
              onClick={() => setSuggestions([])}
              size="sm"
              variant="ghost"
              className="mt-2 text-xs text-gray-600"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

