'use client';

/**
 * Story Card Component
 * Displays a user story with all its details
 */

import { useState } from 'react';
import { UserStoryWithDetails } from '@/types/user-stories';
import { Button } from '@/components/ui/button';
import {
  FileText,
  CheckSquare,
  Target,
  Tag,
  ExternalLink,
  Zap,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
} from 'lucide-react';
import { getPriorityColorScheme } from '@/types/user-stories';
import { StoryEditor } from './StoryEditor';

interface StoryCardProps {
  story: UserStoryWithDetails;
  showTheme?: boolean;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export function StoryCard({ story, showTheme = false, onUpdate, onDelete }: StoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const priorityColors = getPriorityColorScheme(story.priority_level);

  async function handleSave(updatedStory: Partial<typeof story>) {
    try {
      const response = await fetch(
        `/api/user-stories/${story.project_id}?story_id=${story.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStory),
        }
      );

      if (response.ok) {
        setShowEditor(false);
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error updating story:', error);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this story?')) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/user-stories/${story.project_id}?story_id=${story.id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        if (onDelete) onDelete();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error deleting story:', error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={`bg-white border-l-4 ${priorityColors.border} rounded-lg shadow-sm`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {story.generated_by_ai && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  <Zap className="w-3 h-3 mr-1" />
                  AI Generated
                </span>
              )}
              {story.exported_to_jira && story.jira_issue_key && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  {story.jira_issue_key}
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColors.bg} ${priorityColors.text}`}>
                {story.priority_level}
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-2">{story.title}</h3>
            <p className="text-gray-700 mb-3">{story.full_story}</p>

            {showTheme && story.theme_name && (
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Theme: {story.theme_name}</span>
              </div>
            )}

            {/* Story Points */}
            <div className="flex items-center gap-4 text-sm">
              {story.story_points && (
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{story.story_points} points</span>
                </div>
              )}
              {story.acceptance_criteria && (
                <div className="flex items-center gap-1">
                  <CheckSquare className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">
                    {story.acceptance_criteria.length} acceptance criteria
                  </span>
                </div>
              )}
              {story.feedback_count > 0 && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    {story.feedback_count} feedback items
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                More
              </>
            )}
          </Button>
        </div>

        {/* Labels */}
        {story.labels && story.labels.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {story.labels.map((label, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4 bg-gray-50">
          {/* Acceptance Criteria */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Acceptance Criteria
            </h4>
            <ul className="space-y-2">
              {story.acceptance_criteria.map((criterion, index) => (
                <li key={criterion.id} className="text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-gray-700 flex-shrink-0">
                      {index + 1}.
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-900">{criterion.text}</p>
                      {criterion.details && criterion.details.length > 0 && (
                        <ul className="mt-1 space-y-1 ml-4">
                          {criterion.details.map((detail, idx) => (
                            <li key={idx} className="text-gray-600 text-xs flex items-start gap-1">
                              <span className="text-gray-400">•</span>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Technical Notes */}
          {story.technical_notes && (
            <div>
              <h4 className="font-semibold mb-2">Technical Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {story.technical_notes}
              </p>
            </div>
          )}

          {/* Estimation Details */}
          {story.estimation_reasoning && (
            <div>
              <h4 className="font-semibold mb-2">Estimation Reasoning</h4>
              <p className="text-sm text-gray-700">{story.estimation_reasoning}</p>
              <div className="mt-2 grid grid-cols-3 gap-4">
                <div className="text-xs">
                  <span className="text-gray-600">Complexity:</span>{' '}
                  <span className="font-medium">
                    {((story.complexity_score || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-gray-600">Uncertainty:</span>{' '}
                  <span className="font-medium">
                    {((story.uncertainty_score || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-gray-600">Effort:</span>{' '}
                  <span className="font-medium">
                    {((story.effort_score || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Definition of Done */}
          {story.definition_of_done && story.definition_of_done.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Definition of Done</h4>
              <ul className="space-y-1">
                {story.definition_of_done.map((item) => (
                  <li key={item.id} className="text-sm flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-gray-200 flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditor(true)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
            {story.jira_issue_key ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(story.jira_issue_key, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                View in Jira
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Export to Jira
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Story Editor Modal */}
      <StoryEditor
        story={story}
        projectId={story.project_id}
        themeId={story.theme_id}
        onSave={handleSave}
        onCancel={() => setShowEditor(false)}
        isOpen={showEditor}
      />
    </div>
  );
}
