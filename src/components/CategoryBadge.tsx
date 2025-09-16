import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';

export type FeedbackCategory = 
  | 'Bug' 
  | 'Feature Request' 
  | 'Improvement' 
  | 'UI/UX' 
  | 'Integration' 
  | 'Performance' 
  | 'Documentation' 
  | 'Other';

export interface CategoryBadgeProps {
  category: FeedbackCategory | string | null | undefined;
  aiCategorized?: boolean;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showConfidence?: boolean;
  className?: string;
}

const categoryConfig: Record<FeedbackCategory, {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  'Bug': {
    icon: '🐛',
    color: 'bg-red-100 text-red-800 border-red-200',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800'
  },
  'Feature Request': {
    icon: '✨',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800'
  },
  'Improvement': {
    icon: '⚡',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800'
  },
  'UI/UX': {
    icon: '🎨',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800'
  },
  'Integration': {
    icon: '🔗',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-800'
  },
  'Performance': {
    icon: '🚀',
    color: 'bg-green-100 text-green-800 border-green-200',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800'
  },
  'Documentation': {
    icon: '📚',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800'
  },
  'Other': {
    icon: '📝',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800'
  }
};

export function CategoryBadge({ 
  category, 
  aiCategorized = false, 
  confidence, 
  size = 'md',
  showIcon = true,
  showConfidence = false,
  className = ''
}: CategoryBadgeProps) {
  if (!category) return null;

  const config = categoryConfig[category as FeedbackCategory] || categoryConfig['Other'];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge 
        variant="outline" 
        className={`${config.color} ${sizeClasses[size]} flex items-center gap-1.5`}
      >
        {showIcon && (
          <span className={iconSizeClasses[size]}>
            {config.icon}
          </span>
        )}
        <span>{category}</span>
        {aiCategorized && (
          <Brain className={`w-3 h-3 ${size === 'sm' ? 'w-2.5 h-2.5' : ''}`} />
        )}
      </Badge>
      
      {showConfidence && confidence !== undefined && aiCategorized && (
        <Badge 
          variant="outline" 
          className={`${sizeClasses[size]} bg-gray-100 text-gray-600 border-gray-200`}
        >
          {Math.round(confidence * 100)}%
        </Badge>
      )}
    </div>
  );
}

// Export the category config for use in other components
export { categoryConfig };
