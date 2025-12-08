/**
 * Churn Radar Service
 * Main service for managing customer health and churn predictions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HealthCalculator, CustomerData, HealthCalculationResult } from './health-calculator';

export interface CustomerHealth {
  id: string;
  projectId: string;
  customerId?: string;
  email?: string;
  name?: string;
  company?: string;

  healthScore: number;
  previousHealthScore?: number;
  healthGrade: string;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  churnProbability: number;

  engagementScore: number;
  sentimentScore: number;
  supportScore: number;
  productUsageScore: number;
  paymentScore: number;

  mrr?: number;
  arr?: number;
  planName?: string;

  riskFactors: Array<{ factor: string; severity: string; weight: number }>;
  positiveSignals: Array<{ signal: string; strength: string }>;
  healthSummary: string;
  recommendedActions: string[];

  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChurnAlert {
  id: string;
  projectId: string;
  customerHealthId: string;
  alertType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  triggerData: any;
  recommendedAction?: string;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  revenueAtRisk?: number;
  createdAt: Date;
  customer?: CustomerHealth;
}

export interface ChurnRadarSummary {
  totalCustomers: number;
  healthyCustomers: number;
  atRiskCustomers: number;
  criticalCustomers: number;
  avgHealthScore: number;
  totalRevenueAtRisk: number;
  openAlerts: number;
  criticalAlerts: number;
}

export class ChurnRadarService {
  private supabase: SupabaseClient;
  private calculator: HealthCalculator;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.calculator = new HealthCalculator();
  }

  /**
   * Get churn radar summary for a project
   */
  async getSummary(projectId: string): Promise<ChurnRadarSummary> {
    const { data, error } = await this.supabase
      .rpc('get_churn_radar_summary', { p_project_id: projectId });

    if (error || !data || data.length === 0) {
      return {
        totalCustomers: 0,
        healthyCustomers: 0,
        atRiskCustomers: 0,
        criticalCustomers: 0,
        avgHealthScore: 0,
        totalRevenueAtRisk: 0,
        openAlerts: 0,
        criticalAlerts: 0,
      };
    }

    const row = data[0];
    return {
      totalCustomers: row.total_customers || 0,
      healthyCustomers: row.healthy_customers || 0,
      atRiskCustomers: row.at_risk_customers || 0,
      criticalCustomers: row.critical_customers || 0,
      avgHealthScore: row.avg_health_score || 0,
      totalRevenueAtRisk: row.total_revenue_at_risk || 0,
      openAlerts: row.open_alerts || 0,
      criticalAlerts: row.critical_alerts || 0,
    };
  }

  /**
   * List customers by health status
   */
  async listCustomers(
    projectId: string,
    options: {
      riskLevel?: 'low' | 'medium' | 'high' | 'critical' | 'all';
      sortBy?: 'healthScore' | 'mrr' | 'name' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ customers: CustomerHealth[]; total: number }> {
    const {
      riskLevel = 'all',
      sortBy = 'healthScore',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = options;

    let query = this.supabase
      .from('customer_health')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    if (riskLevel !== 'all') {
      query = query.eq('churn_risk', riskLevel);
    }

    // Sorting
    const sortColumn = {
      healthScore: 'health_score',
      mrr: 'mrr',
      name: 'name',
      updatedAt: 'updated_at',
    }[sortBy];

    query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

    // Pagination
    const start = (page - 1) * limit;
    query = query.range(start, start + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[ChurnRadarService] Error listing customers:', error);
      return { customers: [], total: 0 };
    }

    return {
      customers: (data || []).map(this.mapCustomerHealth),
      total: count || 0,
    };
  }

  /**
   * Get a single customer's health details
   */
  async getCustomerHealth(customerHealthId: string): Promise<CustomerHealth | null> {
    const { data, error } = await this.supabase
      .from('customer_health')
      .select('*')
      .eq('id', customerHealthId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapCustomerHealth(data);
  }

  /**
   * Get customer health by email
   */
  async getCustomerHealthByEmail(projectId: string, email: string): Promise<CustomerHealth | null> {
    const { data, error } = await this.supabase
      .from('customer_health')
      .select('*')
      .eq('project_id', projectId)
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapCustomerHealth(data);
  }

  /**
   * Calculate and update health for a customer
   */
  async calculateAndUpdateHealth(
    projectId: string,
    customerData: CustomerData
  ): Promise<CustomerHealth> {
    // Calculate health score
    const result = this.calculator.calculate(customerData);

    // Prepare data for upsert
    const healthData = {
      project_id: projectId,
      customer_id: customerData.customerId,
      email: customerData.email,
      name: customerData.name,
      company: customerData.company,
      health_score: result.overallScore,
      health_grade: result.grade,
      churn_risk: result.churnRisk,
      churn_probability: result.churnProbability,
      engagement_score: result.signals.engagement.score,
      sentiment_score: result.signals.sentiment.score,
      support_score: result.signals.support.score,
      product_usage_score: result.signals.productUsage.score,
      payment_score: result.signals.payment.score,
      mrr: customerData.mrr,
      plan_name: customerData.planName,
      last_login_at: customerData.lastLoginAt?.toISOString(),
      login_frequency_7d: customerData.loginCount7d,
      login_frequency_30d: customerData.loginCount30d,
      feature_adoption_rate: customerData.featureAdoptionRate,
      key_features_used: customerData.keyFeaturesUsed,
      support_tickets_open: customerData.openTickets,
      support_tickets_30d: customerData.ticketsLast30d,
      feedback_count_30d: customerData.feedbackCount30d,
      avg_sentiment_30d: customerData.avgSentiment30d,
      negative_feedback_count_30d: customerData.negativeFeedbackCount30d,
      nps_score: customerData.npsScore,
      payment_failures_90d: customerData.paymentFailures90d,
      subscription_status: customerData.subscriptionStatus,
      contract_end_date: customerData.contractEndDate?.toISOString(),
      risk_factors: result.riskFactors,
      positive_signals: result.positiveSignals,
      health_summary: result.summary,
      recommended_actions: result.recommendedActions,
      calculated_at: new Date().toISOString(),
    };

    // Upsert customer health
    const { data, error } = await this.supabase
      .from('customer_health')
      .upsert(healthData, {
        onConflict: customerData.email ? 'project_id,email' : 'project_id,customer_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[ChurnRadarService] Error upserting health:', error);
      throw error;
    }

    // Check if we need to create alerts
    await this.checkAndCreateAlerts(data.id, projectId, result);

    return this.mapCustomerHealth(data);
  }

  /**
   * Batch calculate health for all customers
   */
  async batchCalculateHealth(projectId: string): Promise<{ processed: number; errors: number }> {
    // Get customers from unified inbox
    const { data: customers, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('project_id', projectId);

    if (error || !customers) {
      return { processed: 0, errors: 1 };
    }

    let processed = 0;
    let errors = 0;

    for (const customer of customers) {
      try {
        const customerData: CustomerData = {
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          company: customer.company,
          mrr: customer.mrr,
          avgSentiment30d: customer.average_sentiment,
          feedbackCount30d: customer.total_feedback_count,
        };

        await this.calculateAndUpdateHealth(projectId, customerData);
        processed++;
      } catch (err) {
        console.error('[ChurnRadarService] Error processing customer:', err);
        errors++;
      }
    }

    return { processed, errors };
  }

  /**
   * Check and create alerts based on health result
   */
  private async checkAndCreateAlerts(
    customerHealthId: string,
    projectId: string,
    result: HealthCalculationResult
  ): Promise<void> {
    const alerts: any[] = [];

    // Critical health score alert
    if (result.churnRisk === 'critical') {
      alerts.push({
        project_id: projectId,
        customer_health_id: customerHealthId,
        alert_type: 'health_drop',
        severity: 'critical',
        title: 'Critical Churn Risk Detected',
        description: result.summary,
        trigger_data: { health_score: result.overallScore, risk_factors: result.riskFactors },
        recommended_action: result.recommendedActions[0],
      });
    }

    // Payment issue alert
    if (result.signals.payment.score < 50) {
      alerts.push({
        project_id: projectId,
        customer_health_id: customerHealthId,
        alert_type: 'payment_failure',
        severity: result.signals.payment.score < 30 ? 'critical' : 'high',
        title: 'Payment Issues Detected',
        description: result.signals.payment.factors.join('. '),
        trigger_data: { payment_score: result.signals.payment.score },
        recommended_action: 'Contact customer to resolve payment issues',
      });
    }

    // Engagement drop alert
    if (result.signals.engagement.score < 30) {
      alerts.push({
        project_id: projectId,
        customer_health_id: customerHealthId,
        alert_type: 'engagement_drop',
        severity: 'high',
        title: 'Low Engagement Alert',
        description: result.signals.engagement.factors.join('. '),
        trigger_data: { engagement_score: result.signals.engagement.score },
        recommended_action: 'Send re-engagement campaign or schedule check-in',
      });
    }

    // Insert alerts (avoid duplicates by checking existing)
    for (const alert of alerts) {
      // Check if similar alert exists
      const { data: existing } = await this.supabase
        .from('churn_alerts')
        .select('id')
        .eq('customer_health_id', customerHealthId)
        .eq('alert_type', alert.alert_type)
        .eq('status', 'new')
        .single();

      if (!existing) {
        await this.supabase.from('churn_alerts').insert(alert);
      }
    }
  }

  /**
   * List alerts for a project
   */
  async listAlerts(
    projectId: string,
    options: {
      status?: string;
      severity?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ alerts: ChurnAlert[]; total: number }> {
    const { status, severity, page = 1, limit = 20 } = options;

    let query = this.supabase
      .from('churn_alerts')
      .select(`
        *,
        customer:customer_health(id, name, email, company, health_score, mrr, churn_risk)
      `, { count: 'exact' })
      .eq('project_id', projectId);

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.not('status', 'in', '("resolved","dismissed")');
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    query = query.order('created_at', { ascending: false });

    const start = (page - 1) * limit;
    query = query.range(start, start + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[ChurnRadarService] Error listing alerts:', error);
      return { alerts: [], total: 0 };
    }

    return {
      alerts: (data || []).map(this.mapAlert),
      total: count || 0,
    };
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(
    alertId: string,
    status: 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed',
    userId: string,
    notes?: string
  ): Promise<boolean> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'acknowledged') {
      updates.acknowledged_at = new Date().toISOString();
      updates.acknowledged_by = userId;
    } else if (status === 'resolved' || status === 'dismissed') {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = userId;
      if (notes) {
        updates.resolution_notes = notes;
      }
    }

    const { error } = await this.supabase
      .from('churn_alerts')
      .update(updates)
      .eq('id', alertId);

    return !error;
  }

  /**
   * Get customer health history
   */
  async getHealthHistory(
    customerHealthId: string,
    limit = 30
  ): Promise<Array<{ date: Date; score: number; risk: string }>> {
    const { data, error } = await this.supabase
      .from('customer_health_history')
      .select('recorded_at, health_score, churn_risk')
      .eq('customer_health_id', customerHealthId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(row => ({
      date: new Date(row.recorded_at),
      score: row.health_score,
      risk: row.churn_risk,
    }));
  }

  /**
   * Map database row to CustomerHealth object
   */
  private mapCustomerHealth(row: any): CustomerHealth {
    return {
      id: row.id,
      projectId: row.project_id,
      customerId: row.customer_id,
      email: row.email,
      name: row.name,
      company: row.company,
      healthScore: row.health_score,
      previousHealthScore: row.previous_health_score,
      healthGrade: row.health_grade,
      churnRisk: row.churn_risk,
      churnProbability: row.churn_probability,
      engagementScore: row.engagement_score,
      sentimentScore: row.sentiment_score,
      supportScore: row.support_score,
      productUsageScore: row.product_usage_score,
      paymentScore: row.payment_score,
      mrr: row.mrr,
      arr: row.arr,
      planName: row.plan_name,
      riskFactors: row.risk_factors || [],
      positiveSignals: row.positive_signals || [],
      healthSummary: row.health_summary,
      recommendedActions: row.recommended_actions || [],
      calculatedAt: new Date(row.calculated_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to ChurnAlert object
   */
  private mapAlert(row: any): ChurnAlert {
    return {
      id: row.id,
      projectId: row.project_id,
      customerHealthId: row.customer_health_id,
      alertType: row.alert_type,
      severity: row.severity,
      title: row.title,
      description: row.description,
      triggerData: row.trigger_data,
      recommendedAction: row.recommended_action,
      status: row.status,
      revenueAtRisk: row.revenue_at_risk,
      createdAt: new Date(row.created_at),
      customer: row.customer ? {
        id: row.customer.id,
        name: row.customer.name,
        email: row.customer.email,
        company: row.customer.company,
        healthScore: row.customer.health_score,
        mrr: row.customer.mrr,
        churnRisk: row.customer.churn_risk,
      } as any : undefined,
    };
  }
}

// Lazy singleton pattern to avoid build-time initialization
let _churnRadarServiceInstance: ChurnRadarService | null = null;

function getChurnRadarService(): ChurnRadarService {
  if (!_churnRadarServiceInstance) {
    _churnRadarServiceInstance = new ChurnRadarService();
  }
  return _churnRadarServiceInstance;
}

// For backwards compatibility - proxy object that delays instantiation
export const churnRadarService = {
  getSummary: (...args: Parameters<ChurnRadarService['getSummary']>) =>
    getChurnRadarService().getSummary(...args),
  listCustomers: (...args: Parameters<ChurnRadarService['listCustomers']>) =>
    getChurnRadarService().listCustomers(...args),
  getCustomerHealth: (...args: Parameters<ChurnRadarService['getCustomerHealth']>) =>
    getChurnRadarService().getCustomerHealth(...args),
  getCustomerHealthByEmail: (...args: Parameters<ChurnRadarService['getCustomerHealthByEmail']>) =>
    getChurnRadarService().getCustomerHealthByEmail(...args),
  calculateAndUpdateHealth: (...args: Parameters<ChurnRadarService['calculateAndUpdateHealth']>) =>
    getChurnRadarService().calculateAndUpdateHealth(...args),
  batchCalculateHealth: (...args: Parameters<ChurnRadarService['batchCalculateHealth']>) =>
    getChurnRadarService().batchCalculateHealth(...args),
  listAlerts: (...args: Parameters<ChurnRadarService['listAlerts']>) =>
    getChurnRadarService().listAlerts(...args),
  updateAlertStatus: (...args: Parameters<ChurnRadarService['updateAlertStatus']>) =>
    getChurnRadarService().updateAlertStatus(...args),
  getHealthHistory: (...args: Parameters<ChurnRadarService['getHealthHistory']>) =>
    getChurnRadarService().getHealthHistory(...args),
};
