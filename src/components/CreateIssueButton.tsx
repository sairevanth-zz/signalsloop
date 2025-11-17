'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateIssueModal } from './CreateIssueModal';
import { JiraIssueBadge } from './JiraIssueBadge';
import { useJiraConnection, useJiraIssueLink } from '@/hooks/useJira';

interface CreateIssueButtonProps {
  feedbackId: string;
  feedbackContent: string;
  projectId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onSuccess?: () => void;
}

export function CreateIssueButton({
  feedbackId,
  feedbackContent,
  projectId,
  variant = 'outline',
  size = 'sm',
  className,
  onSuccess
}: CreateIssueButtonProps) {
  const { connection, isConnected } = useJiraConnection(projectId);
  const { issueLink, hasIssue, refetch } = useJiraIssueLink(feedbackId);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSuccess = () => {
    refetch();
    setModalOpen(false);
    onSuccess?.();
  };

  // If not connected to Jira, don't show button
  if (!isConnected || !connection) {
    return null;
  }

  // If issue already exists, show badge instead
  if (hasIssue && issueLink) {
    return <JiraIssueBadge issueLink={issueLink} showStatus />;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setModalOpen(true)}
        className={className}
        title="Create a Jira issue from this feedback"
      >
        <Plus className="h-4 w-4 mr-1" />
        Create Jira Issue
      </Button>

      <CreateIssueModal
        feedbackId={feedbackId}
        feedbackContent={feedbackContent}
        connectionId={connection.id}
        projectKey={connection.default_project_key}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}
