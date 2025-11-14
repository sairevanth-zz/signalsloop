'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmergingThemesAlertProps, EmergingTheme } from '@/types/themes';
import { Flame, TrendingUp, X, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';

/**
 * EmergingThemesAlert Component
 * Displays alert cards for new or rapidly growing themes
 */
export function EmergingThemesAlert({
  projectId,
  projectSlug,
  onInvestigate,
  onDismiss,
  className = '',
}: EmergingThemesAlertProps) {
  const [emergingThemes, setEmergingThemes] = useState<EmergingTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEmergingThemes();

    // Load dismissed themes from localStorage
    const stored = localStorage.getItem(`dismissed_themes_${projectId}`);
    if (stored) {
      setDismissed(new Set(JSON.parse(stored)));
    }
  }, [projectId]);

  const loadEmergingThemes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/detect-themes?projectId=${projectId}`);
      const data = await response.json();

      if (data.success) {
        // Filter for emerging themes
        const emerging = (data.themes || []).filter(
          (theme: any) => theme.is_emerging
        );
        setEmergingThemes(emerging);
      }
    } catch (error) {
      console.error('Error loading emerging themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (themeId: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(themeId);
    setDismissed(newDismissed);

    // Save to localStorage
    localStorage.setItem(
      `dismissed_themes_${projectId}`,
      JSON.stringify(Array.from(newDismissed))
    );

    if (onDismiss) {
      onDismiss(themeId);
    }
  };

  const handleInvestigate = (theme: EmergingTheme) => {
    if (onInvestigate) {
      onInvestigate(theme);
    } else {
      // Default: navigate to theme details
      window.location.href = `/${projectSlug}/theme/${theme.id}`;
    }
  };

  const visibleThemes = emergingThemes.filter(theme => !dismissed.has(theme.id));

  if (loading) {
    return (
      <Card className={`border-orange-200 ${className}`}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleThemes.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Flame className="w-5 h-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Emerging Themes ({visibleThemes.length})
        </h3>
      </div>

      <div className="space-y-3">
        {visibleThemes.map((theme) => (
          <Alert
            key={theme.id}
            className="border-l-4 border-l-orange-500 bg-orange-50 border-orange-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <h4 className="font-semibold text-orange-900">
                    {theme.theme_name}
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-200 text-orange-900 text-xs font-medium">
                    <TrendingUp className="w-3 h-3" />
                    {theme.growth_label}
                  </span>
                </div>

                <AlertDescription className="text-sm text-orange-800 mb-3">
                  {theme.description}
                </AlertDescription>

                <div className="flex flex-wrap items-center gap-2 text-xs text-orange-700">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{theme.frequency}</span>
                    <span>total mentions</span>
                  </div>
                  <span>•</span>
                  <div>
                    Last seen: {new Date(theme.last_seen).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInvestigate(theme)}
                    className="gap-1 bg-white hover:bg-orange-100"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Investigate
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      toast.info('Jira integration coming soon!');
                    }}
                    className="gap-1 bg-white hover:bg-orange-100"
                  >
                    <FileText className="w-3 h-3" />
                    Create Issue
                  </Button>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(theme.id)}
                className="flex-shrink-0 h-6 w-6 p-0 hover:bg-orange-200"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Alert>
        ))}
      </div>

      {dismissed.size > 0 && (
        <div className="text-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDismissed(new Set());
              localStorage.removeItem(`dismissed_themes_${projectId}`);
              toast.success('Dismissed themes restored');
            }}
            className="text-xs text-gray-600"
          >
            Show {dismissed.size} dismissed theme{dismissed.size > 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}
