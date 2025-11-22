/**
 * User Engagement Agent (Phase 3)
 *
 * Listens to: feedback.created, feedback.voted
 * Actions: Tracks user engagement, identifies power users and at-risk users
 * Triggers: user.engaged, user.at_risk events
 *
 * This agent helps identify your most valuable users and those who need attention
 */

import { DomainEvent } from '@/lib/events/types';
import { getServiceRoleClient } from '@/lib/supabase-singleton';
import { publishEvent } from '@/lib/events/publisher';
import { EventType } from '@/lib/events/types';

// Thresholds for user segmentation
const POWER_USER_THRESHOLD = {
  feedback_count: 5,    // 5+ feedback items
  vote_count: 10,       // 10+ votes cast
  days_active: 30,      // Active for 30+ days
};

const AT_RISK_THRESHOLD = {
  negative_feedback_ratio: 0.6,  // >60% negative feedback
  days_since_last_activity: 30,   // No activity in 30 days
  declining_engagement: true,     // Engagement decreasing over time
};

/**
 * Handle feedback.created event
 * Track user engagement when they submit feedback
 */
export async function handleUserFeedback(event: DomainEvent): Promise<void> {
  const startTime = Date.now();
  const { payload, metadata } = event;

  console.log(`[USER ENGAGEMENT AGENT] 📨 User feedback activity detected`);

  try {
    const supabase = getServiceRoleClient();

    // Update user engagement metrics
    await updateUserEngagement(
      metadata.user_id,
      metadata.project_id,
      'feedback_submitted'
    );

    // Check if user has become a power user
    const engagement = await getUserEngagement(metadata.user_id, metadata.project_id);

    if (isPowerUser(engagement)) {
      // Publish user.engaged event for power users
      await publishEvent({
        type: EventType.USER_ENGAGED,
        aggregate_type: 'user' as any,
        aggregate_id: metadata.user_id,
        payload: {
          engagement_level: 'power_user',
          feedback_count: engagement.feedback_count,
          vote_count: engagement.vote_count,
          days_active: engagement.days_active,
        },
        metadata: {
          project_id: metadata.project_id,
          source: 'user_engagement_agent',
        },
        version: 1,
      });

      console.log(`[USER ENGAGEMENT AGENT] ⭐ Power user identified: ${metadata.user_id}`);
    }

    // Check if user is at risk (chronically negative feedback)
    if (engagement.negative_feedback_ratio > AT_RISK_THRESHOLD.negative_feedback_ratio) {
      await publishEvent({
        type: EventType.USER_AT_RISK,
        aggregate_type: 'user' as any,
        aggregate_id: metadata.user_id,
        payload: {
          risk_level: 'high',
          negative_feedback_ratio: engagement.negative_feedback_ratio,
          recent_negative_count: engagement.recent_negative_count,
          reason: 'High negative feedback ratio',
        },
        metadata: {
          project_id: metadata.project_id,
          source: 'user_engagement_agent',
        },
        version: 1,
      });

      console.log(`[USER ENGAGEMENT AGENT] ⚠️  At-risk user identified: ${metadata.user_id}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[USER ENGAGEMENT AGENT] ✅ Processed in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[USER ENGAGEMENT AGENT] ❌ Error after ${duration}ms:`, error);
  }
}

/**
 * Handle feedback.voted event
 * Track user engagement when they vote
 */
export async function handleUserVote(event: DomainEvent): Promise<void> {
  const { metadata } = event;

  try {
    // Update user engagement for voting activity
    // Note: We'd need to track who voted (requires votes table with user_id)
    // For now, log the activity
    console.log(`[USER ENGAGEMENT AGENT] 📊 Vote activity on post: ${event.aggregate_id}`);

    // In a full implementation, you would:
    // 1. Look up who cast the vote from a votes table
    // 2. Update their engagement metrics
    // 3. Check if they've become a power user
  } catch (error) {
    console.error(`[USER ENGAGEMENT AGENT] ❌ Error:`, error);
  }
}

/**
 * Update user engagement metrics
 */
async function updateUserEngagement(
  userId: string,
  projectId: string,
  activityType: string
): Promise<void> {
  const supabase = getServiceRoleClient();

  // Try to update or insert user engagement record
  await supabase
    .from('user_engagement')
    .upsert({
      user_id: userId,
      project_id: projectId,
      last_activity_at: new Date().toISOString(),
      last_activity_type: activityType,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,project_id',
    })
    .catch((error) => {
      console.log('[USER ENGAGEMENT AGENT] Note: user_engagement table not found (optional)');
    });
}

/**
 * Get user engagement metrics
 */
async function getUserEngagement(userId: string, projectId: string): Promise<{
  feedback_count: number;
  vote_count: number;
  days_active: number;
  negative_feedback_ratio: number;
  recent_negative_count: number;
  first_activity: Date;
  last_activity: Date;
}> {
  const supabase = getServiceRoleClient();

  // Get user's feedback count
  const { count: feedbackCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('project_id', projectId);

  // Get user's feedback with sentiment
  const { data: feedbackWithSentiment } = await supabase
    .from('posts')
    .select(`
      id,
      created_at,
      sentiment_analysis (
        sentiment_score
      )
    `)
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  const negativeFeedback = feedbackWithSentiment?.filter(
    (f: any) => f.sentiment_analysis?.[0]?.sentiment_score < -0.3
  ) || [];

  const negative_feedback_ratio = feedbackCount && feedbackCount > 0
    ? negativeFeedback.length / feedbackCount
    : 0;

  // Calculate days active
  const firstActivity = feedbackWithSentiment?.[0]?.created_at
    ? new Date(feedbackWithSentiment[0].created_at)
    : new Date();
  const lastActivity = feedbackWithSentiment?.[feedbackWithSentiment.length - 1]?.created_at
    ? new Date(feedbackWithSentiment[feedbackWithSentiment.length - 1].created_at)
    : new Date();

  const daysActive = Math.floor(
    (lastActivity.getTime() - firstActivity.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    feedback_count: feedbackCount || 0,
    vote_count: 0, // Would need votes table
    days_active: daysActive,
    negative_feedback_ratio,
    recent_negative_count: negativeFeedback.length,
    first_activity: firstActivity,
    last_activity: lastActivity,
  };
}

/**
 * Check if user is a power user
 */
function isPowerUser(engagement: any): boolean {
  return (
    engagement.feedback_count >= POWER_USER_THRESHOLD.feedback_count ||
    engagement.vote_count >= POWER_USER_THRESHOLD.vote_count ||
    engagement.days_active >= POWER_USER_THRESHOLD.days_active
  );
}

/**
 * Get user engagement summary for a project
 */
export async function getUserEngagementSummary(projectId: string): Promise<{
  totalUsers: number;
  powerUsers: number;
  atRiskUsers: number;
  activeUsers: number;
  churnedUsers: number;
}> {
  const supabase = getServiceRoleClient();

  // Get all users who have submitted feedback
  const { data: users } = await supabase
    .from('posts')
    .select('user_id, created_at')
    .eq('project_id', projectId);

  if (!users) {
    return {
      totalUsers: 0,
      powerUsers: 0,
      atRiskUsers: 0,
      activeUsers: 0,
      churnedUsers: 0,
    };
  }

  const uniqueUsers = [...new Set(users.map(u => u.user_id))];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let powerUsers = 0;
  let atRiskUsers = 0;
  let activeUsers = 0;

  for (const userId of uniqueUsers) {
    const engagement = await getUserEngagement(userId, projectId);

    if (isPowerUser(engagement)) {
      powerUsers++;
    }

    if (engagement.negative_feedback_ratio > AT_RISK_THRESHOLD.negative_feedback_ratio) {
      atRiskUsers++;
    }

    if (engagement.last_activity > thirtyDaysAgo) {
      activeUsers++;
    }
  }

  return {
    totalUsers: uniqueUsers.length,
    powerUsers,
    atRiskUsers,
    activeUsers,
    churnedUsers: uniqueUsers.length - activeUsers,
  };
}
