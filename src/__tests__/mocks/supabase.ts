/**
 * Mock Supabase client for testing
 */

import { mockThemes, mockFeedbackItems, mockThemeClusters } from './theme-data';

export const createMockSupabaseClient = () => {
  const mockSelect = jest.fn().mockReturnThis();
  const mockInsert = jest.fn().mockReturnThis();
  const mockUpdate = jest.fn().mockReturnThis();
  const mockDelete = jest.fn().mockReturnThis();
  const mockEq = jest.fn().mockReturnThis();
  const mockOrder = jest.fn().mockReturnThis();
  const mockLimit = jest.fn().mockReturnThis();
  const mockSingle = jest.fn();
  const mockIn = jest.fn().mockReturnThis();
  const mockGte = jest.fn().mockReturnThis();
  const mockLte = jest.fn().mockReturnThis();

  const mockFrom = jest.fn((table: string) => {
    // Return different data based on table
    if (table === 'themes') {
      mockSingle.mockResolvedValue({ data: mockThemes[0], error: null });
      return {
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockResolvedValue({ data: mockThemes, error: null }),
          single: mockSingle,
          order: mockOrder.mockReturnValue({
            limit: mockLimit.mockResolvedValue({ data: mockThemes, error: null }),
          }),
        }),
        insert: mockInsert.mockResolvedValue({ data: mockThemes, error: null }),
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockResolvedValue({ data: mockThemes[0], error: null }),
        }),
        delete: mockDelete.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: null }),
        }),
      };
    }

    if (table === 'feedback') {
      return {
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockResolvedValue({ data: mockFeedbackItems, error: null }),
          order: mockOrder.mockReturnValue({
            limit: mockLimit.mockResolvedValue({ data: mockFeedbackItems, error: null }),
          }),
        }),
      };
    }

    if (table === 'theme_clusters') {
      return {
        select: mockSelect.mockResolvedValue({ data: mockThemeClusters, error: null }),
      };
    }

    if (table === 'feedback_themes') {
      return {
        insert: mockInsert.mockResolvedValue({ error: null }),
        delete: mockDelete.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: null }),
        }),
      };
    }

    return {
      select: mockSelect.mockReturnThis(),
      insert: mockInsert.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      delete: mockDelete.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      order: mockOrder.mockReturnThis(),
      limit: mockLimit.mockReturnThis(),
      single: mockSingle,
      in: mockIn.mockReturnThis(),
      gte: mockGte.mockReturnThis(),
      lte: mockLte.mockReturnThis(),
    };
  });

  return {
    from: mockFrom,
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
};

export const createMockSupabaseError = () => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    })),
  })),
});
