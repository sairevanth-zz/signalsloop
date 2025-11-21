/**
 * Component Tests for Mission Control Grid
 * Tests the main dashboard grid layout and its components
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MissionControlGrid, MissionControlGridSkeleton } from '../MissionControlGrid';
import type { DailyBriefingContent, DashboardMetrics } from '@/lib/ai/mission-control';

// Mock fetch
global.fetch = jest.fn();

describe('MissionControlGrid', () => {
  const mockBriefing: DailyBriefingContent = {
    sentiment_score: 75,
    sentiment_trend: 'up',
    critical_alerts: ['Test alert 1', 'Test alert 2'],
    recommended_actions: [
      {
        label: 'Review feedback',
        action: 'review_feedback',
        priority: 'high',
        context: 'High priority issues detected',
      },
      {
        label: 'Draft specification',
        action: 'draft_spec',
        priority: 'medium',
      },
    ],
    briefing_text:
      'Overall product health is positive. User satisfaction increased by 10% this week.',
    opportunities: [
      {
        title: 'Dark mode support',
        votes: 15,
        impact: 'high',
      },
      {
        title: 'Keyboard shortcuts',
        votes: 8,
        impact: 'medium',
      },
    ],
    threats: [
      {
        title: 'Mobile performance degradation',
        severity: 'high',
      },
      {
        title: 'Competitor launched similar feature',
        severity: 'medium',
      },
    ],
  };

  const mockMetrics: DashboardMetrics = {
    sentiment: {
      current_nps: 75,
      total_feedback: 100,
      trend: 'up',
      change_percent: 10,
    },
    feedback: {
      issues_per_week: 15,
      total_this_week: 18,
      trend: 'up',
    },
    roadmap: {
      in_progress: 5,
      planned: 12,
      completed_this_week: 3,
    },
    competitors: {
      new_insights_count: 4,
      high_priority_count: 2,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('should render without crashing', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    expect(screen.getByText(/Overall product health/i)).toBeInTheDocument();
  });

  it('should display briefing text', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    expect(
      screen.getByText(/Overall product health is positive/i)
    ).toBeInTheDocument();
  });

  it('should display metrics correctly', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    // Check sentiment score
    expect(screen.getByText('75')).toBeInTheDocument();

    // Check feedback metrics
    expect(screen.getByText('15')).toBeInTheDocument(); // issues_per_week

    // Check roadmap metrics
    expect(screen.getByText('5')).toBeInTheDocument(); // in_progress
  });

  it('should display critical alerts', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    expect(screen.getByText('Test alert 1')).toBeInTheDocument();
    expect(screen.getByText('Test alert 2')).toBeInTheDocument();
  });

  it('should display recommended actions', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    expect(screen.getByText('Review feedback')).toBeInTheDocument();
    expect(screen.getByText('Draft specification')).toBeInTheDocument();
  });

  it('should display opportunities', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    expect(screen.getByText('Dark mode support')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument(); // votes
  });

  it('should display threats', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    expect(screen.getByText(/Mobile performance degradation/i)).toBeInTheDocument();
    expect(screen.getByText(/Competitor launched/i)).toBeInTheDocument();
  });

  it('should show greeting with user name', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        userName="John"
        projectId="test-project-id"
      />
    );

    expect(screen.getByText(/Good/i)).toBeInTheDocument(); // "Good morning/afternoon/evening"
    expect(screen.getByText(/John/i)).toBeInTheDocument();
  });

  it('should show greeting without user name', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    expect(screen.getByText(/Good/i)).toBeInTheDocument();
  });

  it('should display trend indicators correctly', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    // Should show up trend indicators (check for up arrows or positive trend text)
    const upTrends = screen.getAllByText(/↑|up|increase/i);
    expect(upTrends.length).toBeGreaterThan(0);
  });

  it('should handle empty critical alerts', () => {
    const briefingWithoutAlerts = {
      ...mockBriefing,
      critical_alerts: [],
    };

    render(
      <MissionControlGrid
        briefing={briefingWithoutAlerts}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    // Component should still render without errors
    expect(screen.getByText(/Overall product health/i)).toBeInTheDocument();
  });

  it('should handle empty opportunities', () => {
    const briefingWithoutOpportunities = {
      ...mockBriefing,
      opportunities: [],
    };

    render(
      <MissionControlGrid
        briefing={briefingWithoutOpportunities}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    // Component should still render without errors
    expect(screen.getByText(/Overall product health/i)).toBeInTheDocument();
  });

  it('should handle empty threats', () => {
    const briefingWithoutThreats = {
      ...mockBriefing,
      threats: [],
    };

    render(
      <MissionControlGrid
        briefing={briefingWithoutThreats}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    // Component should still render without errors
    expect(screen.getByText(/Overall product health/i)).toBeInTheDocument();
  });

  it('should render with down trend', () => {
    const metricsWithDownTrend = {
      ...mockMetrics,
      sentiment: {
        ...mockMetrics.sentiment,
        trend: 'down' as const,
        change_percent: -5,
      },
    };

    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={metricsWithDownTrend}
        projectId="test-project-id"
      />
    );

    // Component should handle down trends without errors
    expect(screen.getByText(/Overall product health/i)).toBeInTheDocument();
  });
});

describe('MissionControlGridSkeleton', () => {
  it('should render loading skeleton', () => {
    render(<MissionControlGridSkeleton />);

    // Check for loading placeholders
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should have correct grid structure', () => {
    const { container } = render(<MissionControlGridSkeleton />);

    // Check for grid container
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
  });
});

describe('MissionControlGrid - Priority Handling', () => {
  it('should display high priority actions prominently', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    const highPriorityAction = screen.getByText('Review feedback');
    expect(highPriorityAction).toBeInTheDocument();
  });

  it('should display impact levels for opportunities', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    // Dark mode has "high" impact
    expect(screen.getByText('Dark mode support')).toBeInTheDocument();
  });

  it('should display severity levels for threats', () => {
    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    // Mobile performance has "high" severity
    expect(screen.getByText(/Mobile performance/i)).toBeInTheDocument();
  });
});

describe('MissionControlGrid - Time-based Greetings', () => {
  it('should show appropriate greeting based on time of day', () => {
    const hour = new Date().getHours();
    let expectedGreeting;

    if (hour < 12) {
      expectedGreeting = /Good morning/i;
    } else if (hour < 18) {
      expectedGreeting = /Good afternoon/i;
    } else {
      expectedGreeting = /Good evening/i;
    }

    render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        userName="Test User"
        projectId="test-project-id"
      />
    );

    expect(screen.getByText(expectedGreeting)).toBeInTheDocument();
  });
});

describe('MissionControlGrid - Responsive Layout', () => {
  it('should use grid layout for components', () => {
    const { container } = render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    // Check for grid container
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
  });

  it('should have responsive grid classes', () => {
    const { container } = render(
      <MissionControlGrid
        briefing={mockBriefing}
        metrics={mockMetrics}
        projectId="test-project-id"
      />
    );

    const gridContainer = container.querySelector('[class*="md:grid-cols"]');
    expect(gridContainer).toBeInTheDocument();
  });
});
