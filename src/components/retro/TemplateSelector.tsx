'use client';

/**
 * Template Selector Component
 * Tab selector for retrospective templates
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
    templates: string[];
    selected: string | null;
    onSelect: (template: string | null) => void;
}

export function TemplateSelector({ templates, selected, onSelect }: TemplateSelectorProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
                <button
                    key={template}
                    onClick={() => onSelect(selected === template ? null : template)}
                    className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        selected === template
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    )}
                >
                    {template}
                </button>
            ))}
        </div>
    );
}

export default TemplateSelector;
