/**
 * HubSpot CRM Integration
 * Syncs customer data (revenue, segment, account info) for feedback prioritization
 */

import { CustomerData } from './salesforce';

export interface HubSpotConfig {
  accessToken: string;
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    annualrevenue?: string;
    numberofemployees?: string;
    industry?: string;
    city?: string;
    country?: string;
    type?: string;
    hs_object_id?: string;
    lifecyclestage?: string;
    createdate?: string;
    // Custom properties (adjust based on your HubSpot setup)
    mrr?: string;
    arr?: string;
    plan_tier?: string;
    customer_segment?: string;
    health_score?: string;
    churn_risk?: string;
    customer_since?: string;
  };
  associations?: {
    contacts?: { results: { id: string }[] };
  };
}

export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    hs_object_id?: string;
  };
  associations?: {
    companies?: { results: { id: string }[] };
  };
}

export class HubSpotClient {
  private config: HubSpotConfig;
  private baseUrl = 'https://api.hubapi.com';

  constructor(config: HubSpotConfig) {
    this.config = config;
  }

  /**
   * Fetch all customer companies
   */
  async fetchCompanies(limit: number = 200): Promise<CustomerData[]> {
    const properties = [
      'name', 'domain', 'annualrevenue', 'numberofemployees', 'industry',
      'city', 'country', 'type', 'lifecyclestage', 'createdate',
      'mrr', 'arr', 'plan_tier', 'customer_segment',
      'health_score', 'churn_risk', 'customer_since'
    ];

    const url = `${this.baseUrl}/crm/v3/objects/companies?limit=${limit}&properties=${properties.join(',')}&associations=contacts`;

    const response = await this.request<{ results: HubSpotCompany[] }>(url);

    const companiesData: CustomerData[] = [];

    for (const company of response.results) {
      // Fetch primary contact for email
      const contactEmail = await this.getPrimaryContactEmail(company.id);

      if (contactEmail) {
        companiesData.push(this.transformCompany(company, contactEmail));
      }
    }

    return companiesData;
  }

  /**
   * Fetch customer by email
   */
  async fetchCustomerByEmail(email: string): Promise<CustomerData | null> {
    try {
      // Search for contact by email
      const contactUrl = `${this.baseUrl}/crm/v3/objects/contacts/${email}?idProperty=email&associations=companies`;
      const contactResponse = await this.request<HubSpotContact>(contactUrl);

      // Get associated company
      const companyId = contactResponse.associations?.companies?.results?.[0]?.id;

      if (!companyId) {
        return null;
      }

      // Fetch company details
      const properties = [
        'name', 'domain', 'annualrevenue', 'numberofemployees', 'industry',
        'city', 'country', 'type', 'lifecyclestage', 'createdate',
        'mrr', 'arr', 'plan_tier', 'customer_segment',
        'health_score', 'churn_risk', 'customer_since'
      ];

      const companyUrl = `${this.baseUrl}/crm/v3/objects/companies/${companyId}?properties=${properties.join(',')}`;
      const company = await this.request<HubSpotCompany>(companyUrl);

      return this.transformCompany(company, email, contactResponse);
    } catch (error) {
      console.error(`[HubSpot] Error fetching customer by email ${email}:`, error);
      return null;
    }
  }

  /**
   * Get primary contact email for a company
   */
  private async getPrimaryContactEmail(companyId: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/crm/v3/objects/companies/${companyId}/associations/contacts?limit=1`;
      const response = await this.request<{ results: { id: string }[] }>(url);

      if (response.results.length === 0) {
        return null;
      }

      const contactId = response.results[0].id;
      const contactUrl = `${this.baseUrl}/crm/v3/objects/contacts/${contactId}?properties=email`;
      const contact = await this.request<HubSpotContact>(contactUrl);

      return contact.properties.email || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Transform HubSpot Company to CustomerData
   */
  private transformCompany(
    company: HubSpotCompany,
    email: string,
    contact?: HubSpotContact
  ): CustomerData {
    const props = company.properties;

    const annualRevenue = props.annualrevenue ? parseFloat(props.annualrevenue) : null;
    const mrr = props.mrr ? parseFloat(props.mrr) : null;
    const arr = props.arr ? parseFloat(props.arr) : annualRevenue;
    const employees = props.numberofemployees ? parseInt(props.numberofemployees) : null;

    const fullName = contact
      ? [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ') || null
      : null;

    return {
      email,
      externalId: company.id,
      name: fullName,
      companyName: props.name || null,
      mrr,
      arr,
      lifetimeValue: arr,
      planTier: props.plan_tier || this.inferPlanTier(arr),
      segment: props.customer_segment || this.inferSegment(employees, arr),
      status: this.inferStatus(props.lifecyclestage),
      healthScore: props.health_score ? parseInt(props.health_score) : null,
      churnRisk: this.normalizeChurnRisk(props.churn_risk),
      crmUrl: `https://app.hubspot.com/contacts/${company.id}/company/${company.id}`,
      accountOwner: null, // Would need to fetch owner
      accountOwnerEmail: null,
      industry: props.industry || null,
      companySize: this.inferCompanySize(employees),
      location: props.city && props.country
        ? `${props.city}, ${props.country}`
        : props.country || null,
      customerSince: props.customer_since || props.createdate || null,
      lastActivityAt: null,
      rawData: { company, contact },
    };
  }

  /**
   * Make authenticated request to HubSpot API
   */
  private async request<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Test connection to HubSpot
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.baseUrl}/crm/v3/objects/companies?limit=1`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Connection failed: ${response.status} ${response.statusText}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // Helper methods
  // ============================================================================

  private inferPlanTier(arr: number | null): string | null {
    if (!arr) return null;
    if (arr >= 100000) return 'enterprise';
    if (arr >= 25000) return 'pro';
    if (arr >= 5000) return 'starter';
    return 'free';
  }

  private inferSegment(employees: number | null, arr: number | null): string | null {
    if (employees && employees >= 1000) return 'enterprise';
    if (arr && arr >= 100000) return 'enterprise';
    if (employees && employees >= 200) return 'mid-market';
    if (arr && arr >= 25000) return 'mid-market';
    return 'smb';
  }

  private inferCompanySize(employees: number | null): string | null {
    if (!employees) return null;
    if (employees >= 1000) return '1000+';
    if (employees >= 500) return '500-999';
    if (employees >= 200) return '200-499';
    if (employees >= 50) return '50-199';
    if (employees >= 10) return '10-49';
    return '1-9';
  }

  private inferStatus(lifecycleStage: string | undefined): 'active' | 'churned' | 'trial' | 'lead' {
    if (!lifecycleStage) return 'active';
    const stage = lifecycleStage.toLowerCase();
    if (stage === 'customer') return 'active';
    if (stage === 'evangelist' || stage === 'other') return 'active';
    if (stage === 'lead' || stage === 'subscriber' || stage === 'marketingqualifiedlead') return 'lead';
    if (stage === 'opportunity' || stage === 'salesqualifiedlead') return 'trial';
    return 'active';
  }

  private normalizeChurnRisk(risk: string | null | undefined): 'low' | 'medium' | 'high' | 'critical' | null {
    if (!risk) return null;
    const normalized = risk.toLowerCase();
    if (normalized === 'critical' || normalized === 'very high') return 'critical';
    if (normalized === 'high') return 'high';
    if (normalized === 'medium' || normalized === 'moderate') return 'medium';
    return 'low';
  }
}
