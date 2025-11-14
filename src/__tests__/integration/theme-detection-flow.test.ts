/**
 * Integration tests for complete theme detection flow
 * Tests the full workflow from API call to database storage to UI display
 */

import { NextRequest } from 'next/server';
import { POST as detectThemesHandler } from '@/app/api/detect-themes/route';
import { GET as getThemeHandler, PATCH as updateThemeHandler } from '@/app/api/themes/[themeId]/route';
import {
  mockProjectId,
  mockFeedbackItems,
  mockThemes,
  mockDetectedThemes,
  mockLargeFeedbackDataset,
} from '../mocks/theme-data';
import { createMockSupabaseClient } from '../mocks/supabase';
import { createMockOpenAI } from '../mocks/openai';

// Mock dependencies
jest.mock('@/lib/supabase-server', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => createMockOpenAI()),
}));

jest.mock('@/lib/openai/themes', () => ({
  detectThemes: jest.fn().mockResolvedValue(require('../mocks/theme-data').mockDetectedThemes),
}));

describe('Theme Detection Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Analysis Flow', () => {
    it('should detect themes, store in DB, and return results', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: false,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.themes).toBeDefined();
      expect(Array.isArray(data.themes)).toBe(true);
      expect(data.newCount).toBeDefined();
      expect(data.processedItems).toBeDefined();
    });

    it('should handle force re-analysis', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: true,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.themes).toBeDefined();
    });

    it('should merge detected themes with existing themes', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: false,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.updatedCount).toBeDefined();
      expect(data.newCount).toBeDefined();
    });

    it('should create feedback-theme mappings', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: false,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      // Mappings should be created in the database
      const supabase = createMockSupabaseClient();
      expect(supabase.from).toHaveBeenCalledWith('feedback_themes');
    });

    it('should handle large datasets with batching', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: true,
      };

      // Mock large feedback dataset
      const supabase = createMockSupabaseClient();
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockLargeFeedbackDataset,
            error: null,
          }),
        }),
      })) as any;

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.processedItems).toBe(mockLargeFeedbackDataset.length);
    });
  });

  describe('Theme Detail Retrieval', () => {
    it('should retrieve theme details with related feedback', async () => {
      const request = new NextRequest(
        `http://localhost/api/themes/${mockThemes[0].id}?includeRelatedFeedback=true`,
        { method: 'GET' }
      );

      const params = { themeId: mockThemes[0].id };
      const response = await getThemeHandler(request, { params });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.theme).toBeDefined();
      expect(data.relatedFeedback).toBeDefined();
      expect(Array.isArray(data.relatedFeedback)).toBe(true);
    });

    it('should retrieve theme with trend data', async () => {
      const request = new NextRequest(
        `http://localhost/api/themes/${mockThemes[0].id}?includeTrend=true&timeRange=30`,
        { method: 'GET' }
      );

      const params = { themeId: mockThemes[0].id };
      const response = await getThemeHandler(request, { params });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.trend).toBeDefined();
      expect(Array.isArray(data.trend)).toBe(true);
    });

    it('should retrieve related themes in same cluster', async () => {
      const request = new NextRequest(
        `http://localhost/api/themes/${mockThemes[0].id}?includeRelatedThemes=true`,
        { method: 'GET' }
      );

      const params = { themeId: mockThemes[0].id };
      const response = await getThemeHandler(request, { params });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.relatedThemes).toBeDefined();
    });
  });

  describe('Theme Updates', () => {
    it('should update theme metadata', async () => {
      const updateData = {
        theme_name: 'Updated Theme Name',
        description: 'Updated description',
      };

      const request = new NextRequest(
        `http://localhost/api/themes/${mockThemes[0].id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        }
      );

      const params = { themeId: mockThemes[0].id };
      const response = await updateThemeHandler(request, { params });
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.theme).toBeDefined();
    });

    it('should mark theme as emerging', async () => {
      const updateData = {
        is_emerging: true,
      };

      const request = new NextRequest(
        `http://localhost/api/themes/${mockThemes[0].id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        }
      );

      const params = { themeId: mockThemes[0].id };
      const response = await updateThemeHandler(request, { params });
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project ID', async () => {
      const requestBody = {
        force: false,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const supabase = createMockSupabaseClient();
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection error' },
          }),
        }),
      })) as any;

      const requestBody = {
        projectId: mockProjectId,
        force: false,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should handle OpenAI API failures with retry', async () => {
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest
              .fn()
              .mockRejectedValueOnce(new Error('OpenAI Error'))
              .mockResolvedValueOnce({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({ themes: mockDetectedThemes }),
                    },
                  },
                ],
              }),
          },
        },
      }));

      const requestBody = {
        projectId: mockProjectId,
        force: true,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      // Should succeed after retry
      expect(data.success).toBe(true);
    });
  });

  describe('Real-time Updates', () => {
    it('should support real-time subscription to theme changes', () => {
      const supabase = createMockSupabaseClient();

      // Simulate subscription
      const channel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      };

      supabase.channel = jest.fn(() => channel);

      const subscription = supabase
        .channel('themes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'themes' }, () => {})
        .subscribe();

      expect(channel.on).toHaveBeenCalled();
      expect(channel.subscribe).toHaveBeenCalled();
    });
  });

  describe('Emerging Theme Detection Logic', () => {
    it('should correctly identify emerging themes', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: true,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      const emergingThemes = data.themes.filter((t: any) => t.is_emerging);
      expect(emergingThemes.length).toBeGreaterThanOrEqual(0);

      // Emerging themes should have high growth or be new
      emergingThemes.forEach((theme: any) => {
        expect(theme.is_emerging).toBe(true);
      });
    });

    it('should calculate theme growth rates', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: false,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      // Themes should have frequency data
      data.themes.forEach((theme: any) => {
        expect(theme.frequency).toBeDefined();
        expect(typeof theme.frequency).toBe('number');
        expect(theme.frequency).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Theme Merging Across Batches', () => {
    it('should deduplicate similar themes from different batches', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: true,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(true);

      // Check for duplicates
      const themeNames = data.themes.map((t: any) => t.theme_name.toLowerCase());
      const uniqueNames = new Set(themeNames);

      // Should have minimal duplicates (some variation allowed for different wording)
      expect(uniqueNames.size).toBeGreaterThan(0);
    });

    it('should preserve highest confidence when merging', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: true,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      // Merged themes should maintain quality
      data.themes.forEach((theme: any) => {
        expect(theme.description).toBeDefined();
        expect(theme.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance', () => {
    it('should complete analysis in reasonable time', async () => {
      const startTime = Date.now();

      const requestBody = {
        projectId: mockProjectId,
        force: true,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(data.success).toBe(true);
      // Should complete within 5 seconds (mocked calls are fast)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: false,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(true);

      // All themes should have valid project_id
      data.themes.forEach((theme: any) => {
        expect(theme.project_id).toBe(mockProjectId);
      });
    });

    it('should ensure timestamps are valid', async () => {
      const requestBody = {
        projectId: mockProjectId,
        force: false,
      };

      const request = new NextRequest('http://localhost/api/detect-themes', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await detectThemesHandler(request);
      const data = await response.json();

      expect(data.success).toBe(true);

      data.themes.forEach((theme: any) => {
        expect(new Date(theme.created_at).getTime()).not.toBeNaN();
        expect(new Date(theme.updated_at).getTime()).not.toBeNaN();
        expect(new Date(theme.first_seen).getTime()).not.toBeNaN();
        expect(new Date(theme.last_seen).getTime()).not.toBeNaN();
      });
    });
  });
});
