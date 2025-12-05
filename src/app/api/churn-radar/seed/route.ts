/**
 * Seed Sample Customer Data for Churn Radar Testing
 * POST /api/churn-radar/seed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { ChurnRadarService } from '@/lib/churn-radar/churn-radar-service';

const SAMPLE_CUSTOMERS = [
  {
    name: 'Acme Corp',
    email: 'john@acme.com',
    company: 'Acme Corporation',
    mrr: 499,
    planName: 'Professional',
    lastLoginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    loginCount7d: 5,
    loginCount30d: 18,
    featureAdoptionRate: 0.75,
    keyFeaturesUsed: ['analytics', 'reports', 'integrations'],
    openTickets: 0,
    ticketsLast30d: 1,
    feedbackCount30d: 3,
    avgSentiment30d: 0.7,
    negativeFeedbackCount30d: 0,
    npsScore: 9,
    paymentFailures90d: 0,
    subscriptionStatus: 'active',
  },
  {
    name: 'TechStart Inc',
    email: 'sarah@techstart.io',
    company: 'TechStart Inc',
    mrr: 199,
    planName: 'Starter',
    lastLoginAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago - at risk!
    loginCount7d: 0,
    loginCount30d: 3,
    featureAdoptionRate: 0.25,
    keyFeaturesUsed: ['dashboard'],
    openTickets: 2,
    ticketsLast30d: 4,
    feedbackCount30d: 2,
    avgSentiment30d: -0.3,
    negativeFeedbackCount30d: 2,
    npsScore: 4,
    paymentFailures90d: 1,
    subscriptionStatus: 'active',
  },
  {
    name: 'Enterprise Solutions',
    email: 'mike@enterprise.co',
    company: 'Enterprise Solutions Ltd',
    mrr: 2499,
    planName: 'Enterprise',
    lastLoginAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    loginCount7d: 12,
    loginCount30d: 45,
    featureAdoptionRate: 0.9,
    keyFeaturesUsed: ['analytics', 'reports', 'integrations', 'api', 'sso'],
    openTickets: 1,
    ticketsLast30d: 2,
    feedbackCount30d: 5,
    avgSentiment30d: 0.8,
    negativeFeedbackCount30d: 0,
    npsScore: 10,
    paymentFailures90d: 0,
    subscriptionStatus: 'active',
  },
  {
    name: 'Startup Labs',
    email: 'alex@startuplabs.dev',
    company: 'Startup Labs',
    mrr: 99,
    planName: 'Starter',
    lastLoginAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago - critical!
    loginCount7d: 0,
    loginCount30d: 0,
    featureAdoptionRate: 0.1,
    keyFeaturesUsed: [],
    openTickets: 0,
    ticketsLast30d: 0,
    feedbackCount30d: 1,
    avgSentiment30d: -0.8,
    negativeFeedbackCount30d: 1,
    npsScore: 2,
    paymentFailures90d: 2,
    subscriptionStatus: 'past_due',
  },
  {
    name: 'GrowthCo',
    email: 'lisa@growthco.com',
    company: 'GrowthCo',
    mrr: 799,
    planName: 'Professional',
    lastLoginAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    loginCount7d: 2,
    loginCount30d: 10,
    featureAdoptionRate: 0.5,
    keyFeaturesUsed: ['analytics', 'reports'],
    openTickets: 1,
    ticketsLast30d: 3,
    feedbackCount30d: 2,
    avgSentiment30d: 0.2,
    negativeFeedbackCount30d: 1,
    npsScore: 6,
    paymentFailures90d: 0,
    subscriptionStatus: 'active',
  },
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    
    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const service = new ChurnRadarService();
    const results = [];
    
    for (const customer of SAMPLE_CUSTOMERS) {
      try {
        const health = await service.calculateAndUpdateHealth(projectId, {
          customerId: `sample-${customer.email}`,
          ...customer,
          lastLoginAt: customer.lastLoginAt,
        });
        results.push({ email: customer.email, healthScore: health.healthScore, status: 'created' });
      } catch (err) {
        console.error(`[Seed] Error creating ${customer.email}:`, err);
        results.push({ email: customer.email, status: 'error', error: String(err) });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Seeded ${results.filter(r => r.status === 'created').length} sample customers`,
      results,
    });
  } catch (error) {
    console.error('[Seed] Error:', error);
    return NextResponse.json(
      { error: 'Failed to seed sample data' },
      { status: 500 }
    );
  }
}
