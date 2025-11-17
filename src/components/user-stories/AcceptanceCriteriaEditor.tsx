'use client';

/**
 * Acceptance Criteria Editor Component
 * Edit acceptance criteria with details
 */

import { useState } from 'react';
import { AcceptanceCriterion } from '@/types/user-stories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

interface AcceptanceCriteriaEditorProps {
  criteria: AcceptanceCriterion[];
  onChange: (criteria: AcceptanceCriterion[]) => void;
  readOnly?: boolean;
  className?: string;
}

export function AcceptanceCriteriaEditor({
  criteria,
  onChange,
  readOnly = false,
  className = '',
}: AcceptanceCriteriaEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function addCriterion() {
    const newCriterion: AcceptanceCriterion = {
      id: `ac-${Date.now()}`,
      text: '',
      details: [],
    };
    onChange([...criteria, newCriterion]);
  }

  function updateCriterion(id: string, updates: Partial<AcceptanceCriterion>) {
    onChange(
      criteria.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }

  function removeCriterion(id: string) {
    onChange(criteria.filter((c) => c.id !== id));
  }

  function addDetail(criterionId: string) {
    const criterion = criteria.find((c) => c.id === criterionId);
    if (criterion) {
      updateCriterion(criterionId, {
        details: [...criterion.details, ''],
      });
    }
  }

  function updateDetail(criterionId: string, detailIndex: number, value: string) {
    const criterion = criteria.find((c) => c.id === criterionId);
    if (criterion) {
      const newDetails = [...criterion.details];
      newDetails[detailIndex] = value;
      updateCriterion(criterionId, { details: newDetails });
    }
  }

  function removeDetail(criterionId: string, detailIndex: number) {
    const criterion = criteria.find((c) => c.id === criterionId);
    if (criterion) {
      updateCriterion(criterionId, {
        details: criterion.details.filter((_, i) => i !== detailIndex),
      });
    }
  }

  if (readOnly) {
    return (
      <div className={`space-y-3 ${className}`}>
        {criteria.map((criterion, index) => (
          <div key={criterion.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-700 flex-shrink-0">
                {index + 1}.
              </span>
              <div className="flex-1">
                <p className="text-gray-900">{criterion.text}</p>
                {criterion.details && criterion.details.length > 0 && (
                  <ul className="mt-2 space-y-1 ml-4">
                    {criterion.details.map((detail, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-1">
                        <span className="text-gray-400">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {criteria.map((criterion, index) => {
        const isExpanded = expandedId === criterion.id;

        return (
          <div key={criterion.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-700 flex-shrink-0 mt-2">
                {index + 1}.
              </span>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={criterion.text}
                  onChange={(e) => updateCriterion(criterion.id, { text: e.target.value })}
                  placeholder="Acceptance criterion (e.g., Given... When... Then...)"
                  rows={2}
                  className="resize-none"
                />

                {/* Details Section */}
                {isExpanded && (
                  <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                    {criterion.details.map((detail, detailIdx) => (
                      <div key={detailIdx} className="flex items-center gap-2">
                        <Input
                          value={detail}
                          onChange={(e) =>
                            updateDetail(criterion.id, detailIdx, e.target.value)
                          }
                          placeholder="Additional detail"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDetail(criterion.id, detailIdx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addDetail(criterion.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Detail
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(isExpanded ? null : criterion.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Add Details
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCriterion(criterion.id)}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" onClick={addCriterion} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Acceptance Criterion
      </Button>
    </div>
  );
}
