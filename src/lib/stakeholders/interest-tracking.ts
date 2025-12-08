import { getSupabaseServiceRoleClient } from '@/lib/supabase-client';
import { sendEmail } from '@/lib/email';

export type InterestType = 'feature' | 'competitor' | 'customer' | 'metric' | 'theme';

export async function trackStakeholderInterest(
  stakeholderId: string,
  interestType: InterestType,
  interestId: string,
  interestName: string
): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) throw new Error('Supabase client not available');

  await supabase.from('stakeholder_interests').insert({
    stakeholder_id: stakeholderId,
    interest_type: interestType,
    interest_id: interestId,
    interest_name: interestName
  });
}

export async function checkAndNotifyStakeholders(
  projectId: string,
  eventType: string,
  eventData: any
): Promise<void> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return;

  // Find stakeholders interested in this event
  const interestedStakeholders = await findInterestedStakeholders(
    projectId,
    eventType,
    eventData
  );

  for (const stakeholder of interestedStakeholders) {
    await sendProactiveNotification(stakeholder, eventType, eventData);
  }
}

async function findInterestedStakeholders(
  projectId: string,
  eventType: string,
  eventData: any
): Promise<any[]> {
  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) return [];

  // 1. Get all stakeholders for the project
  const { data: stakeholders } = await supabase
    .from('stakeholders')
    .select('*, interests:stakeholder_interests(*)')
    .eq('project_id', projectId)
    .eq('notification_preferences->email_enabled', true);

  if (!stakeholders) return [];

  // 2. Filter based on event type and interests
  return stakeholders.filter(stakeholder => {
    // Check global role-based rules
    if (shouldNotifyByRole(stakeholder.role, eventType)) {
      return true;
    }

    // Check specific interests
    if (stakeholder.interests && stakeholder.interests.length > 0) {
      return stakeholder.interests.some((interest: any) => 
        isInterestRelevant(interest, eventType, eventData)
      );
    }

    return false;
  });
}

function shouldNotifyByRole(role: string, eventType: string): boolean {
  const rules: Record<string, string[]> = {
    ceo: ['competitor.mentioned', 'metric.churn_risk'],
    sales: ['feature.launched', 'competitor.mentioned'],
    engineering: ['spec.ready', 'bug.critical'],
    marketing: ['feature.launched', 'theme.trending'],
    customer_success: ['customer.at_risk', 'feedback.urgent']
  };

  return rules[role]?.includes(eventType) || false;
}

function isInterestRelevant(interest: any, eventType: string, eventData: any): boolean {
  // Match interest type and ID/Name
  if (interest.interest_type === 'feature' && eventType.startsWith('feature.')) {
    return interest.interest_id === eventData.feature_id || interest.interest_name === eventData.feature_name;
  }
  
  if (interest.interest_type === 'competitor' && eventType === 'competitor.mentioned') {
    return interest.interest_id === eventData.competitor_id || interest.interest_name === eventData.competitor_name;
  }

  return false;
}

async function sendProactiveNotification(
  stakeholder: any,
  eventType: string,
  eventData: any
): Promise<void> {
  const subject = getNotificationSubject(eventType, eventData);
  const html = getNotificationHtml(stakeholder.name, eventType, eventData);

  await sendEmail({
    to: stakeholder.email,
    subject,
    html
  });
}

function getNotificationSubject(eventType: string, eventData: any): string {
  switch (eventType) {
    case 'competitor.mentioned':
      return `⚠️ Competitive Alert: ${eventData.competitor_name} mentioned`;
    case 'feature.launched':
      return `🚀 Feature Launched: ${eventData.feature_name}`;
    case 'spec.ready':
      return `📄 New Spec Ready: ${eventData.spec_title}`;
    default:
      return `SignalsLoop Notification: ${eventType}`;
  }
}

function getNotificationHtml(stakeholderName: string, eventType: string, eventData: any): string {
  // Simple template for now
  return `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Hi ${stakeholderName},</h2>
      <p>Here is a proactive update from SignalsLoop:</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Event:</strong> ${eventType}<br/>
        <strong>Details:</strong> ${JSON.stringify(eventData, null, 2)}
      </div>

      <p><a href="https://signalsloop.com/dashboard">View in Dashboard</a></p>
    </div>
  `;
}
