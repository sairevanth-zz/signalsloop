/**
 * Sprint Planning Service
 * Sprint management, capacity planning, and workload balancing
 */

import {
  Sprint,
  UserStory,
  SprintCapacity,
  SprintVelocity,
  VelocityTrend,
  StoryAssignment,
  TeamMember,
} from '@/types/user-stories';

/**
 * Calculate sprint capacity analysis
 */
export function analyzeSprintCapacity(
  sprint: Sprint,
  stories: UserStory[]
): SprintCapacity {
  const totalCapacity = sprint.capacity_points;
  const usedCapacity = stories.reduce(
    (sum, story) => sum + (story.story_points || 0),
    0
  );
  const availableCapacity = Math.max(0, totalCapacity - usedCapacity);
  const capacityPercentage = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;
  const overCapacity = usedCapacity > totalCapacity;

  // Analyze team member workload
  const teamMemberWorkload = analyzeTeamMemberWorkload(sprint, stories);

  return {
    total_capacity: totalCapacity,
    used_capacity: usedCapacity,
    available_capacity: availableCapacity,
    capacity_percentage: Math.round(capacityPercentage * 100) / 100,
    over_capacity: overCapacity,
    team_members: teamMemberWorkload,
  };
}

/**
 * Analyze team member workload distribution
 */
function analyzeTeamMemberWorkload(
  sprint: Sprint,
  stories: UserStory[]
): Array<{
  member: TeamMember;
  assigned_points: number;
  capacity_used: number;
}> {
  return sprint.team_members.map((member) => {
    // Find stories assigned to this member
    const assignedStories = stories.filter(
      (story) => story.assigned_to === member.id
    );

    const assignedPoints = assignedStories.reduce(
      (sum, story) => sum + (story.story_points || 0),
      0
    );

    const capacityUsed =
      member.capacity > 0 ? (assignedPoints / member.capacity) * 100 : 0;

    return {
      member,
      assigned_points: assignedPoints,
      capacity_used: Math.round(capacityUsed * 100) / 100,
    };
  });
}

/**
 * Calculate sprint velocity (actual completion rate)
 */
export function calculateSprintVelocity(
  sprint: Sprint,
  stories: UserStory[]
): SprintVelocity {
  const plannedPoints = sprint.committed_points || sprint.current_points;
  const completedPoints = stories
    .filter((story) => story.sprint_status === 'done')
    .reduce((sum, story) => sum + (story.story_points || 0), 0);

  const completionPercentage =
    plannedPoints > 0 ? (completedPoints / plannedPoints) * 100 : 0;

  return {
    sprint_id: sprint.id,
    sprint_number: sprint.sprint_number,
    planned_points: plannedPoints,
    completed_points: completedPoints,
    completion_percentage: Math.round(completionPercentage * 100) / 100,
    velocity: completedPoints, // Velocity = points completed
  };
}

/**
 * Analyze velocity trends across multiple sprints
 */
export function analyzeVelocityTrend(
  sprints: Sprint[],
  allStories: Map<string, UserStory[]>
): VelocityTrend {
  // Calculate velocity for each sprint
  const sprintVelocities: SprintVelocity[] = sprints.map((sprint) => {
    const stories = allStories.get(sprint.id) || [];
    return calculateSprintVelocity(sprint, stories);
  });

  // Calculate average velocity
  const totalVelocity = sprintVelocities.reduce(
    (sum, sv) => sum + sv.velocity,
    0
  );
  const averageVelocity =
    sprintVelocities.length > 0 ? totalVelocity / sprintVelocities.length : 0;

  // Determine trend direction
  const recentSprints = sprintVelocities.slice(-3); // Last 3 sprints
  const trendDirection = determineTrendDirection(recentSprints);

  // Suggest capacity for next sprint
  const suggestedCapacity = calculateSuggestedCapacity(
    sprintVelocities,
    averageVelocity
  );

  return {
    average_velocity: Math.round(averageVelocity * 100) / 100,
    trend_direction: trendDirection,
    recent_sprints: recentSprints,
    suggested_capacity: Math.round(suggestedCapacity),
  };
}

/**
 * Determine trend direction from recent sprints
 */
function determineTrendDirection(
  recentSprints: SprintVelocity[]
): 'up' | 'down' | 'stable' {
  if (recentSprints.length < 2) return 'stable';

  const velocities = recentSprints.map((s) => s.velocity);
  const firstHalf = velocities.slice(0, Math.floor(velocities.length / 2));
  const secondHalf = velocities.slice(Math.floor(velocities.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

  if (changePercent > 10) return 'up';
  if (changePercent < -10) return 'down';
  return 'stable';
}

/**
 * Calculate suggested capacity for next sprint
 */
function calculateSuggestedCapacity(
  sprintVelocities: SprintVelocity[],
  averageVelocity: number
): number {
  if (sprintVelocities.length === 0) return 0;

  // Use recent performance (last 3 sprints) with more weight
  const recentSprints = sprintVelocities.slice(-3);
  const recentAvg =
    recentSprints.reduce((sum, sv) => sum + sv.velocity, 0) /
    recentSprints.length;

  // Weighted average: 70% recent, 30% historical
  const suggestedCapacity = recentAvg * 0.7 + averageVelocity * 0.3;

  // Add 10% buffer for safety
  return suggestedCapacity * 0.9;
}

/**
 * Recommend story assignments to team members
 */
export function recommendStoryAssignments(
  stories: UserStory[],
  teamMembers: TeamMember[],
  currentAssignments: Map<string, number> // member_id -> current points
): StoryAssignment[] {
  const recommendations: StoryAssignment[] = [];

  // Sort stories by priority and points
  const sortedStories = [...stories].sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority_level] || 0;
    const bPriority = priorityOrder[b.priority_level] || 0;

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    // Then by story points (smaller first for better distribution)
    return (a.story_points || 0) - (b.story_points || 0);
  });

  // Calculate current workload for each team member
  const memberWorkload = new Map<string, number>(currentAssignments);
  teamMembers.forEach((member) => {
    if (!memberWorkload.has(member.id)) {
      memberWorkload.set(member.id, 0);
    }
  });

  // Assign stories to team members
  for (const story of sortedStories) {
    if (story.assigned_to) continue; // Skip already assigned stories

    const storyPoints = story.story_points || 0;

    // Find best team member for this story
    let bestMember: TeamMember | null = null;
    let bestScore = -1;

    for (const member of teamMembers) {
      const currentLoad = memberWorkload.get(member.id) || 0;
      const availableCapacity = member.capacity - currentLoad;

      // Skip if member doesn't have capacity
      if (availableCapacity < storyPoints) continue;

      // Calculate workload balance score (0-1, higher is better)
      const capacityUtilization = (currentLoad + storyPoints) / member.capacity;
      const idealUtilization = 0.8; // Aim for 80% capacity
      const balanceScore =
        1 - Math.abs(capacityUtilization - idealUtilization);

      if (balanceScore > bestScore) {
        bestScore = balanceScore;
        bestMember = member;
      }
    }

    // Create recommendation
    if (bestMember) {
      recommendations.push({
        story_id: story.id,
        recommended_assignee: bestMember.id,
        reasoning: `Best workload balance for ${bestMember.name} (${Math.round(bestScore * 100)}% optimal)`,
        workload_balance_score: Math.round(bestScore * 100) / 100,
      });

      // Update workload tracking
      const currentLoad = memberWorkload.get(bestMember.id) || 0;
      memberWorkload.set(bestMember.id, currentLoad + storyPoints);
    } else {
      // No team member has capacity
      recommendations.push({
        story_id: story.id,
        reasoning: 'No team member has available capacity for this story',
        workload_balance_score: 0,
      });
    }
  }

  return recommendations;
}

/**
 * Validate sprint can accommodate stories
 */
export function validateSprintCapacity(
  sprint: Sprint,
  stories: UserStory[]
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const totalPoints = stories.reduce(
    (sum, story) => sum + (story.story_points || 0),
    0
  );

  // Check if over capacity
  if (totalPoints > sprint.capacity_points) {
    errors.push(
      `Sprint is over capacity: ${totalPoints} points planned, ${sprint.capacity_points} points available`
    );
  }

  // Check if significantly under capacity (< 60%)
  const utilizationPercent = (totalPoints / sprint.capacity_points) * 100;
  if (utilizationPercent < 60) {
    warnings.push(
      `Sprint is under-utilized: ${Math.round(utilizationPercent)}% capacity used`
    );
  }

  // Check for unestimated stories
  const unestimatedStories = stories.filter(
    (s) => !s.story_points || s.story_points === 0
  );
  if (unestimatedStories.length > 0) {
    warnings.push(
      `${unestimatedStories.length} stories have no story point estimate`
    );
  }

  // Check for very large stories (potential epics)
  const largeStories = stories.filter((s) => (s.story_points || 0) > 13);
  if (largeStories.length > 0) {
    warnings.push(
      `${largeStories.length} stories have 13+ points - consider breaking them down`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate optimal sprint duration based on workload
 */
export function calculateOptimalSprintDuration(
  totalPoints: number,
  teamVelocity: number,
  standardDuration: number = 14
): {
  recommended_days: number;
  reasoning: string;
} {
  if (teamVelocity === 0) {
    return {
      recommended_days: standardDuration,
      reasoning: 'Using standard duration due to no velocity data',
    };
  }

  // Calculate how many standard sprints worth of work this is
  const workloadRatio = totalPoints / teamVelocity;

  if (workloadRatio < 0.5) {
    return {
      recommended_days: 7,
      reasoning: `Light workload (${Math.round(workloadRatio * 100)}% of normal capacity) - 1 week sprint recommended`,
    };
  } else if (workloadRatio <= 1.2) {
    return {
      recommended_days: standardDuration,
      reasoning: `Normal workload - standard ${standardDuration} day sprint recommended`,
    };
  } else if (workloadRatio <= 2.0) {
    return {
      recommended_days: 21,
      reasoning: `Heavy workload (${Math.round(workloadRatio * 100)}% of normal capacity) - 3 week sprint recommended`,
    };
  } else {
    return {
      recommended_days: standardDuration,
      reasoning: `Very heavy workload - consider breaking into ${Math.ceil(workloadRatio)} sprints`,
    };
  }
}

/**
 * Generate sprint planning insights
 */
export function generateSprintInsights(
  sprint: Sprint,
  stories: UserStory[],
  historicalVelocity?: number
): string[] {
  const insights: string[] = [];

  const capacity = analyzeSprintCapacity(sprint, stories);

  // Capacity insights
  if (capacity.over_capacity) {
    insights.push(
      `⚠️ Sprint is ${Math.round(capacity.capacity_percentage - 100)}% over capacity`
    );
  } else if (capacity.capacity_percentage > 90) {
    insights.push('✓ Sprint is at optimal capacity (90-100%)');
  } else if (capacity.capacity_percentage < 60) {
    insights.push(
      `💡 Consider adding more stories - currently at ${Math.round(capacity.capacity_percentage)}% capacity`
    );
  }

  // Team balance insights
  const imbalancedMembers = capacity.team_members.filter(
    (tm) => tm.capacity_used > 120 || tm.capacity_used < 50
  );
  if (imbalancedMembers.length > 0) {
    insights.push(
      `⚖️ ${imbalancedMembers.length} team members have unbalanced workload`
    );
  }

  // Story distribution insights
  const criticalStories = stories.filter((s) => s.priority_level === 'critical');
  if (criticalStories.length > 0) {
    insights.push(
      `🔥 ${criticalStories.length} critical priority stories in sprint`
    );
  }

  const largeStories = stories.filter((s) => (s.story_points || 0) >= 13);
  if (largeStories.length > 0) {
    insights.push(
      `📏 ${largeStories.length} large stories (13+ points) - consider breaking down`
    );
  }

  // Velocity comparison
  if (historicalVelocity && capacity.used_capacity) {
    const comparison =
      ((capacity.used_capacity - historicalVelocity) / historicalVelocity) *
      100;
    if (Math.abs(comparison) > 20) {
      insights.push(
        `📊 Sprint commitment is ${Math.abs(Math.round(comparison))}% ${comparison > 0 ? 'higher' : 'lower'} than historical velocity`
      );
    }
  }

  return insights;
}

/**
 * Detect sprint risks
 */
export function detectSprintRisks(
  sprint: Sprint,
  stories: UserStory[]
): Array<{ risk: string; severity: 'high' | 'medium' | 'low' }> {
  const risks: Array<{ risk: string; severity: 'high' | 'medium' | 'low' }> =
    [];

  // Over-capacity risk
  const totalPoints = stories.reduce(
    (sum, s) => sum + (s.story_points || 0),
    0
  );
  if (totalPoints > sprint.capacity_points * 1.2) {
    risks.push({
      risk: 'Sprint is significantly over capacity - high risk of incomplete work',
      severity: 'high',
    });
  }

  // Unestimated stories
  const unestimated = stories.filter((s) => !s.story_points);
  if (unestimated.length > stories.length * 0.2) {
    risks.push({
      risk: `${Math.round((unestimated.length / stories.length) * 100)}% of stories are unestimated`,
      severity: 'high',
    });
  }

  // High uncertainty stories
  const highUncertainty = stories.filter(
    (s) => (s.uncertainty_score || 0) > 0.7
  );
  if (highUncertainty.length > 0) {
    risks.push({
      risk: `${highUncertainty.length} stories have high uncertainty`,
      severity: 'medium',
    });
  }

  // Dependencies
  const storiesWithDeps = stories.filter(
    (s) => s.technical_notes?.toLowerCase().includes('depends') ||
           s.technical_notes?.toLowerCase().includes('blocked')
  );
  if (storiesWithDeps.length > 0) {
    risks.push({
      risk: `${storiesWithDeps.length} stories have dependencies - coordinate carefully`,
      severity: 'medium',
    });
  }

  // New team members
  const teamMembersWithLowCapacity = sprint.team_members.filter(
    (m) => m.capacity < 5
  );
  if (teamMembersWithLowCapacity.length > 0) {
    risks.push({
      risk: `${teamMembersWithLowCapacity.length} team members have reduced capacity`,
      severity: 'low',
    });
  }

  return risks;
}
