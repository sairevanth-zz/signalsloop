/**
 * Seed Sample Customer Data for Churn Radar Testing
 * POST /api/churn-radar/seed
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-client';
import { createClient } from '@supabase/supabase-js';

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

// Calculate health score from customer data
function calculateHealthScore(customer: typeof SAMPLE_CUSTOMERS[0]): {
  healthScore: number;
  healthGrade: string;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  churnProbability: number;
  engagementScore: number;
  sentimentScore: number;
  supportScore: number;
  productUsageScore: number;
  paymentScore: number;
  riskFactors: Array<{ factor: string; severity: string; weight: number }>;
  positiveSignals: Array<{ signal: string; strength: string }>;
  healthSummary: string;
  recommendedActions: string[];
} {
  const riskFactors: Array<{ factor: string; severity: string; weight: number }> = [];
  const positiveSignals: Array<{ signal: string; strength: string }> = [];
  
  // Engagement score (0-100)
  let engagementScore = 50;
  const daysSinceLogin = Math.floor((Date.now() - customer.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceLogin <= 1) engagementScore = 100;
  else if (daysSinceLogin <= 3) engagementScore = 85;
  else if (daysSinceLogin <= 7) engagementScore = 70;
  else if (daysSinceLogin <= 14) engagementScore = 40;
  else if (daysSinceLogin <= 30) engagementScore = 20;
  else engagementScore = 5;
  
  if (daysSinceLogin > 14) riskFactors.push({ factor: `No login in ${daysSinceLogin} days`, severity: 'high', weight: 0.3 });
  if (customer.loginCount7d >= 5) positiveSignals.push({ signal: 'Active user this week', strength: 'strong' });
  
  // Sentiment score (0-100)
  const sentimentScore = Math.round((customer.avgSentiment30d + 1) * 50); // Convert -1..1 to 0..100
  if (customer.negativeFeedbackCount30d > 0) riskFactors.push({ factor: `${customer.negativeFeedbackCount30d} negative feedback in 30 days`, severity: 'medium', weight: 0.2 });
  if (customer.npsScore >= 8) positiveSignals.push({ signal: 'High NPS score', strength: 'strong' });
  
  // Support score (100 - penalty for tickets)
  const supportScore = Math.max(0, 100 - (customer.openTickets * 20) - (customer.ticketsLast30d * 5));
  if (customer.openTickets >= 2) riskFactors.push({ factor: `${customer.openTickets} open support tickets`, severity: 'medium', weight: 0.15 });
  
  // Product usage score
  const productUsageScore = Math.round(customer.featureAdoptionRate * 100);
  if (customer.featureAdoptionRate < 0.3) riskFactors.push({ factor: 'Low feature adoption', severity: 'medium', weight: 0.15 });
  if (customer.featureAdoptionRate > 0.7) positiveSignals.push({ signal: 'High feature adoption', strength: 'strong' });
  
  // Payment score
  const paymentScore = Math.max(0, 100 - (customer.paymentFailures90d * 30));
  if (customer.paymentFailures90d > 0) riskFactors.push({ factor: `${customer.paymentFailures90d} payment failures`, severity: 'high', weight: 0.25 });
  if (customer.subscriptionStatus === 'past_due') riskFactors.push({ factor: 'Subscription past due', severity: 'critical', weight: 0.3 });
  
  // Calculate overall health score (weighted average)
  const healthScore = Math.round(
    engagementScore * 0.25 +
    sentimentScore * 0.25 +
    supportScore * 0.2 +
    productUsageScore * 0.2 +
    paymentScore * 0.1
  );
  
  // Determine grade and risk
  let healthGrade: string;
  let churnRisk: 'low' | 'medium' | 'high' | 'critical';
  let churnProbability: number;
  
  if (healthScore >= 80) { healthGrade = 'A'; churnRisk = 'low'; churnProbability = 0.05; }
  else if (healthScore >= 60) { healthGrade = 'B'; churnRisk = 'low'; churnProbability = 0.15; }
  else if (healthScore >= 40) { healthGrade = 'C'; churnRisk = 'medium'; churnProbability = 0.35; }
  else if (healthScore >= 20) { healthGrade = 'D'; churnRisk = 'high'; churnProbability = 0.6; }
  else { healthGrade = 'F'; churnRisk = 'critical'; churnProbability = 0.85; }
  
  // Generate summary and actions
  const healthSummary = churnRisk === 'critical' 
    ? `Critical churn risk. ${riskFactors.length} risk factors identified.`
    : churnRisk === 'high'
    ? `High churn risk. Immediate attention recommended.`
    : churnRisk === 'medium'
    ? `Moderate health. Monitor for changes.`
    : `Healthy customer with ${positiveSignals.length} positive signals.`;
  
  const recommendedActions: string[] = [];
  if (daysSinceLogin > 7) recommendedActions.push('Send re-engagement email');
  if (customer.openTickets > 0) recommendedActions.push('Prioritize support ticket resolution');
  if (customer.paymentFailures90d > 0) recommendedActions.push('Contact about payment issues');
  if (customer.featureAdoptionRate < 0.5) recommendedActions.push('Schedule product training session');
  if (recommendedActions.length === 0) recommendedActions.push('Continue current engagement strategy');
  
  return {
    healthScore,
    healthGrade,
    churnRisk,
    churnProbability,
    engagementScore,
    sentimentScore,
    supportScore,
    productUsageScore,
    paymentScore,
    riskFactors,
    positiveSignals,
    healthSummary,
    recommendedActions,
  };
}

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
    
    // Use service role client for direct inserts
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );
    
    const results = [];
    
    for (const customer of SAMPLE_CUSTOMERS) {
      try {
        const health = calculateHealthScore(customer);
        
        // Insert directly into customer_health table
        const { data, error } = await serviceClient
          .from('customer_health')
          .upsert({
            project_id: projectId,
            email: customer.email,
            name: customer.name,
            company: customer.company,
            health_score: health.healthScore,
            health_grade: health.healthGrade,
            churn_risk: health.churnRisk,
            churn_probability: health.churnProbability,
            engagement_score: health.engagementScore,
            sentiment_score: health.sentimentScore,
            support_score: health.supportScore,
            product_usage_score: health.productUsageScore,
            payment_score: health.paymentScore,
            mrr: customer.mrr,
            plan_name: customer.planName,
            last_login_at: customer.lastLoginAt.toISOString(),
            login_frequency_7d: customer.loginCount7d,
            login_frequency_30d: customer.loginCount30d,
            feature_adoption_rate: customer.featureAdoptionRate * 100,
            key_features_used: customer.keyFeaturesUsed,
            support_tickets_open: customer.openTickets,
            support_tickets_30d: customer.ticketsLast30d,
            feedback_count_30d: customer.feedbackCount30d,
            avg_sentiment_30d: customer.avgSentiment30d,
            negative_feedback_count_30d: customer.negativeFeedbackCount30d,
            nps_score: customer.npsScore,
            payment_failures_90d: customer.paymentFailures90d,
            subscription_status: customer.subscriptionStatus,
            risk_factors: health.riskFactors,
            positive_signals: health.positiveSignals,
            health_summary: health.healthSummary,
            recommended_actions: health.recommendedActions,
            calculated_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id,email',
          })
          .select()
          .single();
        
        if (error) {
          console.error(`[Seed] Error creating ${customer.email}:`, error);
          results.push({ email: customer.email, status: 'error', error: error.message });
        } else {
          results.push({ email: customer.email, healthScore: health.healthScore, status: 'created' });
        }
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
      { error: 'Failed to seed sample data', details: String(error) },
      { status: 500 }
    );
  }
}
