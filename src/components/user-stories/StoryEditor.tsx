'use client';

/**
 * Story Editor Component
 * Comprehensive editor for creating and editing user stories
 */

import { useState, useEffect } from 'react';
import { UserStory, AcceptanceCriterion, DefinitionOfDoneItem, StoryPriority } from '@/types/user-stories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X, Plus, Save, Trash2 } from 'lucide-react';
import { AcceptanceCriteriaEditor } from './AcceptanceCriteriaEditor';

interface StoryEditorProps {
  story?: Partial<UserStory>;
  projectId: string;
  themeId?: string;
  onSave: (story: Partial<UserStory>) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21];
const PRIORITIES: StoryPriority[] = ['critical', 'high', 'medium', 'low'];

export function StoryEditor({
  story,
  projectId,
  themeId,
  onSave,
  onCancel,
  isOpen,
}: StoryEditorProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: story?.title || '',
    user_type: story?.user_type || '',
    user_goal: story?.user_goal || '',
    user_benefit: story?.user_benefit || '',
    acceptance_criteria: story?.acceptance_criteria || [],
    story_points: story?.story_points,
    priority_level: story?.priority_level || 'medium' as StoryPriority,
    labels: story?.labels || [],
    technical_notes: story?.technical_notes || '',
    definition_of_done: story?.definition_of_done || [],
  });

  const [newLabel, setNewLabel] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (story) {
      setFormData({
        title: story.title || '',
        user_type: story.user_type || '',
        user_goal: story.user_goal || '',
        user_benefit: story.user_benefit || '',
        acceptance_criteria: story.acceptance_criteria || [],
        story_points: story.story_points,
        priority_level: story.priority_level || 'medium',
        labels: story.labels || [],
        technical_notes: story.technical_notes || '',
        definition_of_done: story.definition_of_done || [],
      });
    }
  }, [story]);

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.user_type.trim()) {
      newErrors.user_type = 'User type is required';
    }
    if (!formData.user_goal.trim()) {
      newErrors.user_goal = 'User goal is required';
    }
    if (!formData.user_benefit.trim()) {
      newErrors.user_benefit = 'User benefit is required';
    }
    if (formData.acceptance_criteria.length < 3) {
      newErrors.acceptance_criteria = 'At least 3 acceptance criteria required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const fullStory = `As a ${formData.user_type}, I want ${formData.user_goal} so that ${formData.user_benefit}.`;

      await onSave({
        ...formData,
        full_story: fullStory,
        project_id: projectId,
        theme_id: themeId,
      });
    } catch (error) {
      console.error('Error saving story:', error);
      setErrors({ submit: 'Failed to save story' });
    } finally {
      setSaving(false);
    }
  }

  function handleAddLabel() {
    if (newLabel.trim() && !formData.labels.includes(newLabel.trim())) {
      setFormData({
        ...formData,
        labels: [...formData.labels, newLabel.trim()],
      });
      setNewLabel('');
    }
  }

  function handleRemoveLabel(label: string) {
    setFormData({
      ...formData,
      labels: formData.labels.filter((l) => l !== label),
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {story?.id ? 'Edit User Story' : 'Create User Story'}
            </h2>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Story Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief, action-oriented title"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1">{errors.title}</p>
              )}
            </div>

            {/* User Story Components */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="user_type">User Type *</Label>
                <Input
                  id="user_type"
                  value={formData.user_type}
                  onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                  placeholder="e.g., enterprise customer"
                  className={errors.user_type ? 'border-red-500' : ''}
                />
                {errors.user_type && (
                  <p className="text-sm text-red-600 mt-1">{errors.user_type}</p>
                )}
              </div>

              <div>
                <Label htmlFor="user_goal">I want to... *</Label>
                <Input
                  id="user_goal"
                  value={formData.user_goal}
                  onChange={(e) => setFormData({ ...formData, user_goal: e.target.value })}
                  placeholder="what the user wants to do"
                  className={errors.user_goal ? 'border-red-500' : ''}
                />
                {errors.user_goal && (
                  <p className="text-sm text-red-600 mt-1">{errors.user_goal}</p>
                )}
              </div>

              <div>
                <Label htmlFor="user_benefit">So that... *</Label>
                <Input
                  id="user_benefit"
                  value={formData.user_benefit}
                  onChange={(e) => setFormData({ ...formData, user_benefit: e.target.value })}
                  placeholder="why they want it"
                  className={errors.user_benefit ? 'border-red-500' : ''}
                />
                {errors.user_benefit && (
                  <p className="text-sm text-red-600 mt-1">{errors.user_benefit}</p>
                )}
              </div>
            </div>

            {/* Preview */}
            {formData.user_type && formData.user_goal && formData.user_benefit && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Story Preview:</p>
                <p className="text-gray-800">
                  As a <strong>{formData.user_type}</strong>, I want{' '}
                  <strong>{formData.user_goal}</strong> so that{' '}
                  <strong>{formData.user_benefit}</strong>.
                </p>
              </div>
            )}

            {/* Acceptance Criteria */}
            <div>
              <Label className="mb-2 block">Acceptance Criteria * (minimum 3)</Label>
              <AcceptanceCriteriaEditor
                criteria={formData.acceptance_criteria}
                onChange={(criteria) =>
                  setFormData({ ...formData, acceptance_criteria: criteria })
                }
              />
              {errors.acceptance_criteria && (
                <p className="text-sm text-red-600 mt-2">{errors.acceptance_criteria}</p>
              )}
            </div>

            {/* Story Points and Priority */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="story_points">Story Points</Label>
                <Select
                  value={formData.story_points?.toString() || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, story_points: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select story points" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORY_POINTS.map((points) => (
                      <SelectItem key={points} value={points.toString()}>
                        {points} points
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority Level</Label>
                <Select
                  value={formData.priority_level}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority_level: value as StoryPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Labels */}
            <div>
              <Label>Labels</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Add a label"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddLabel} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.labels.map((label) => (
                  <Badge key={label} variant="secondary" className="gap-1">
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Technical Notes */}
            <div>
              <Label htmlFor="technical_notes">Technical Notes</Label>
              <Textarea
                id="technical_notes"
                value={formData.technical_notes}
                onChange={(e) =>
                  setFormData({ ...formData, technical_notes: e.target.value })
                }
                placeholder="Implementation guidance, architectural considerations, dependencies, risks..."
                rows={4}
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Story
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
