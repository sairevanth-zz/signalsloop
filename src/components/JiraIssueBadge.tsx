'use client';

import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckCircle2, Clock, Play, XCircle } from 'lucide-react';
import type { JiraIssueLink } from '@/types/jira';

interface JiraIssueBadgeProps {
  issueLink: JiraIssueLink;
  showStatus?: boolean;
  showPriority?: boolean;
  onClick?: () => void;
  className?: string;
}

const statusColors: Record<string, string> = {
  'To Do': 'bg-gray-500',
  'In Progress': 'bg-blue-500',
  'Done': 'bg-green-500',
  'Closed': 'bg-green-600',
  'Resolved': 'bg-green-600',
  'default': 'bg-gray-400'
};

const priorityColors: Record<string, string> = {
  'Highest': 'bg-red-600',
  'High': 'bg-orange-500',
  'Medium': 'bg-yellow-500',
  'Low': 'bg-blue-500',
  'Lowest': 'bg-gray-500',
  'default': 'bg-gray-400'
};

const statusIcons: Record<string, any> = {
  'To Do': Clock,
  'In Progress': Play,
  'Done': CheckCircle2,
  'Closed': CheckCircle2,
  'Resolved': CheckCircle2,
  'default': Clock
};

export function JiraIssueBadge({
  issueLink,
  showStatus = true,
  showPriority = false,
  onClick,
  className
}: JiraIssueBadgeProps) {
  const statusColor = statusColors[issueLink.status] || statusColors.default;
  const priorityColor = priorityColors[issueLink.priority || ''] || priorityColors.default;
  const StatusIcon = statusIcons[issueLink.status] || statusIcons.default;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(issueLink.issue_url, '_blank');
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ''}`}>
      {/* Issue Key Badge */}
      <Badge
        variant="outline"
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={handleClick}
      >
        <ExternalLink className="mr-1 h-3 w-3" />
        {issueLink.issue_key}
      </Badge>

      {/* Status Badge */}
      {showStatus && (
        <Badge className={`${statusColor} text-white`}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {issueLink.status}
        </Badge>
      )}

      {/* Priority Badge */}
      {showPriority && issueLink.priority && (
        <Badge className={`${priorityColor} text-white`} variant="outline">
          {issueLink.priority}
        </Badge>
      )}

      {/* Assignee */}
      {issueLink.assignee && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {issueLink.assignee.avatar && (
            <img
              src={issueLink.assignee.avatar}
              alt={issueLink.assignee.name}
              className="h-5 w-5 rounded-full"
            />
          )}
          <span>{issueLink.assignee.name}</span>
        </div>
      )}
    </div>
  );
}

export function JiraIssueBadgeCompact({ issueLink }: { issueLink: JiraIssueLink }) {
  return (
    <Badge
      variant="outline"
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={() => window.open(issueLink.issue_url, '_blank')}
    >
      <ExternalLink className="mr-1 h-3 w-3" />
      {issueLink.issue_key}
    </Badge>
  );
}
