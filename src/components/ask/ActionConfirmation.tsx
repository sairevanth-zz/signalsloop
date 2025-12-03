/**
 * Action Confirmation Component
 * Shows action intent and allows user to confirm or cancel
 */

'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getActionTypeDescription } from '@/lib/ask/action-router';
import type { ActionIntent, ActionResult } from '@/types/ask';

interface ActionConfirmationProps {
  intent: ActionIntent;
  projectId: string;
  messageId: string;
  onConfirm?: (result: ActionResult) => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * Component for confirming and executing actions
 *
 * @param props - Component props
 * @returns Action confirmation component
 */
export function ActionConfirmation({
  intent,
  projectId,
  messageId,
  onConfirm,
  onCancel,
  className = '',
}: ActionConfirmationProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!intent.requires_action || !intent.action_type) {
    return null;
  }

  const handleConfirm = async () => {
    try {
      setIsExecuting(true);
      setError(null);

      const response = await fetch('/api/ask/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          projectId,
          actionType: intent.action_type,
          parameters: intent.parameters,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute action');
      }

      setResult(data.result);
      onConfirm?.(data.result);
    } catch (err) {
      console.error('Action execution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
  };

  // Show result if action was executed
  if (result) {
    return (
      <div
        className={`border rounded-lg p-4 bg-green-500/5 border-green-500/20 ${className}`}
      >
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white mb-1">Action Completed</div>
            <div className="text-sm text-slate-300 mb-2">
              {getActionTypeDescription(result.action_type)} executed successfully.
            </div>

            {/* Show created resource link if available */}
            {result.created_resource_url && (
              <a
                href={result.created_resource_url}
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View created resource →
              </a>
            )}

            {/* Show report content if available */}
            {result.action_type === 'generate_report' &&
              result.data?.report_content && (
                <div className="mt-3 p-3 bg-slate-800/50 rounded border border-slate-700 text-sm text-slate-300 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {result.data.report_content}
                  </pre>
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }

  // Show error if action failed
  if (error) {
    return (
      <div
        className={`border rounded-lg p-4 bg-red-500/5 border-red-500/20 ${className}`}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white mb-1">Action Failed</div>
            <div className="text-sm text-red-300 mb-3">{error}</div>
            <button
              onClick={handleCancel}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show confirmation prompt
  return (
    <div
      className={`border rounded-lg p-4 bg-blue-500/5 border-blue-500/20 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white mb-1">
            Confirm Action
          </div>
          <div className="text-sm text-slate-300 mb-1">
            {intent.confirmation_message ||
              `I'll ${getActionTypeDescription(intent.action_type)}. Should I proceed?`}
          </div>

          {/* Show parameters if available */}
          {intent.parameters && Object.keys(intent.parameters).length > 0 && (
            <div className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-700">
              <div className="text-xs font-medium text-slate-400 mb-1">
                Parameters:
              </div>
              {Object.entries(intent.parameters).map(([key, value]) => (
                <div key={key} className="text-xs text-slate-300">
                  <span className="text-slate-500">{key}:</span>{' '}
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </div>
              ))}
            </div>
          )}

          {/* Confidence indicator */}
          {intent.confidence < 0.8 && (
            <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Low confidence ({Math.round(intent.confidence * 100)}%) - please
              review carefully
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleConfirm}
              disabled={isExecuting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm
                </>
              )}
            </button>

            <button
              onClick={handleCancel}
              disabled={isExecuting}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
