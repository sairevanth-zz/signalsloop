/**
 * Salesforce CRM Integration
 * Syncs customer data (revenue, segment, account info) for feedback prioritization
 */

export interface SalesforceConfig {
  instanceUrl: string;
  accessToken: string;
  clientId?: string;
  clientSecret?: string;
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  AnnualRevenue?: number;
  NumberOfEmployees?: number;
  Industry?: string;
  BillingCity?: string;
  BillingCountry?: string;
  Type?: string; // 'Customer', 'Prospect', etc.
  AccountSource?: string;
  OwnerId?: string;
  Owner?: {
    Name: string;
    Email: string;
  };
  // Custom fields (adjust based on your Salesforce setup)
  MRR__c?: number;
  ARR__c?: number;
  Plan_Tier__c?: string;
  Customer_Segment__c?: string;
  Health_Score__c?: number;
  Churn_Risk__c?: string;
  Customer_Since__c?: string;
}

export interface SalesforceContact {
  Id: string;
  Email: string;
  FirstName?: string;
  LastName?: string;
  AccountId?: string;
  Account?: SalesforceAccount;
}

export interface CustomerData {
  email: string;
  externalId: string;
  name: string | null;
  companyName: string | null;
  mrr: number | null;
  arr: number | null;
  lifetimeValue: number | null;
  planTier: string | null;
  segment: string | null;
  status: 'active' | 'churned' | 'trial' | 'lead';
  healthScore: number | null;
  churnRisk: 'low' | 'medium' | 'high' | 'critical' | null;
  crmUrl: string;
  accountOwner: string | null;
  accountOwnerEmail: string | null;
  industry: string | null;
  companySize: string | null;
  location: string | null;
  customerSince: string | null;
  lastActivityAt: string | null;
  rawData: Record<string, any>;
}

export class SalesforceClient {
  private config: SalesforceConfig;

  constructor(config: SalesforceConfig) {
    this.config = config;
  }

  /**
   * Fetch all active customer accounts
   */
  async fetchAccounts(limit: number = 200): Promise<CustomerData[]> {
    const query = `
      SELECT
        Id, Name, AnnualRevenue, NumberOfEmployees, Industry,
        BillingCity, BillingCountry, Type, AccountSource,
        MRR__c, ARR__c, Plan_Tier__c, Customer_Segment__c,
        Health_Score__c, Churn_Risk__c, Customer_Since__c,
        Owner.Name, Owner.Email,
        (SELECT Email, FirstName, LastName FROM Contacts WHERE Email != null LIMIT 1)
      FROM Account
      WHERE Type = 'Customer'
      ORDER BY AnnualRevenue DESC NULLS LAST
      LIMIT ${limit}
    `;

    const response = await this.query<{ records: SalesforceAccount[] }>(query);
    return response.records.map(account => this.transformAccount(account));
  }

  /**
   * Fetch customer by email
   */
  async fetchCustomerByEmail(email: string): Promise<CustomerData | null> {
    const query = `
      SELECT
        Id, Email, FirstName, LastName, AccountId,
        Account.Id, Account.Name, Account.AnnualRevenue,
        Account.NumberOfEmployees, Account.Industry,
        Account.BillingCity, Account.BillingCountry,
        Account.MRR__c, Account.ARR__c, Account.Plan_Tier__c,
        Account.Customer_Segment__c, Account.Health_Score__c,
        Account.Churn_Risk__c, Account.Customer_Since__c,
        Account.Owner.Name, Account.Owner.Email
      FROM Contact
      WHERE Email = '${this.escapeSoql(email)}'
      LIMIT 1
    `;

    const response = await this.query<{ records: SalesforceContact[] }>(query);

    if (response.records.length === 0) {
      return null;
    }

    const contact = response.records[0];
    if (!contact.Account) {
      return null;
    }

    return this.transformAccountWithContact(contact.Account, contact);
  }

  /**
   * Transform Salesforce Account to CustomerData
   */
  private transformAccount(account: SalesforceAccount): CustomerData {
    // Get primary contact email (from nested query)
    const contacts = (account as any).Contacts?.records || [];
    const primaryContact = contacts[0];
    const email = primaryContact?.Email || `account-${account.Id}@salesforce.com`;

    return {
      email,
      externalId: account.Id,
      name: account.Name,
      companyName: account.Name,
      mrr: account.MRR__c || null,
      arr: account.ARR__c || account.AnnualRevenue || null,
      lifetimeValue: account.ARR__c || account.AnnualRevenue || null,
      planTier: account.Plan_Tier__c || this.inferPlanTier(account.ARR__c || account.AnnualRevenue),
      segment: account.Customer_Segment__c || this.inferSegment(account.NumberOfEmployees, account.ARR__c || account.AnnualRevenue),
      status: this.inferStatus(account.Type),
      healthScore: account.Health_Score__c || null,
      churnRisk: this.normalizeChurnRisk(account.Churn_Risk__c),
      crmUrl: `${this.config.instanceUrl}/${account.Id}`,
      accountOwner: account.Owner?.Name || null,
      accountOwnerEmail: account.Owner?.Email || null,
      industry: account.Industry || null,
      companySize: this.inferCompanySize(account.NumberOfEmployees),
      location: account.BillingCity && account.BillingCountry
        ? `${account.BillingCity}, ${account.BillingCountry}`
        : account.BillingCountry || null,
      customerSince: account.Customer_Since__c || null,
      lastActivityAt: null, // Would need LastActivityDate field
      rawData: account,
    };
  }

  /**
   * Transform Salesforce Account with Contact to CustomerData
   */
  private transformAccountWithContact(account: SalesforceAccount, contact: SalesforceContact): CustomerData {
    const fullName = [contact.FirstName, contact.LastName].filter(Boolean).join(' ') || null;

    return {
      email: contact.Email,
      externalId: account.Id,
      name: fullName,
      companyName: account.Name,
      mrr: account.MRR__c || null,
      arr: account.ARR__c || account.AnnualRevenue || null,
      lifetimeValue: account.ARR__c || account.AnnualRevenue || null,
      planTier: account.Plan_Tier__c || this.inferPlanTier(account.ARR__c || account.AnnualRevenue),
      segment: account.Customer_Segment__c || this.inferSegment(account.NumberOfEmployees, account.ARR__c || account.AnnualRevenue),
      status: this.inferStatus(account.Type),
      healthScore: account.Health_Score__c || null,
      churnRisk: this.normalizeChurnRisk(account.Churn_Risk__c),
      crmUrl: `${this.config.instanceUrl}/${account.Id}`,
      accountOwner: account.Owner?.Name || null,
      accountOwnerEmail: account.Owner?.Email || null,
      industry: account.Industry || null,
      companySize: this.inferCompanySize(account.NumberOfEmployees),
      location: account.BillingCity && account.BillingCountry
        ? `${account.BillingCity}, ${account.BillingCountry}`
        : account.BillingCountry || null,
      customerSince: account.Customer_Since__c || null,
      lastActivityAt: null,
      rawData: { account, contact },
    };
  }

  /**
   * Execute SOQL query
   */
  private async query<T>(soql: string): Promise<T> {
    const url = `${this.config.instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(soql)}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Salesforce API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Test connection to Salesforce
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.config.instanceUrl}/services/data/v58.0/sobjects/Account/describe`;

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

  private escapeSoql(value: string): string {
    return value.replace(/'/g, "\\'");
  }

  private inferPlanTier(arr: number | null | undefined): string | null {
    if (!arr) return null;
    if (arr >= 100000) return 'enterprise';
    if (arr >= 25000) return 'pro';
    if (arr >= 5000) return 'starter';
    return 'free';
  }

  private inferSegment(employees: number | null | undefined, arr: number | null | undefined): string | null {
    // Segment by company size and revenue
    if (employees && employees >= 1000) return 'enterprise';
    if (arr && arr >= 100000) return 'enterprise';
    if (employees && employees >= 200) return 'mid-market';
    if (arr && arr >= 25000) return 'mid-market';
    return 'smb';
  }

  private inferCompanySize(employees: number | null | undefined): string | null {
    if (!employees) return null;
    if (employees >= 1000) return '1000+';
    if (employees >= 500) return '500-999';
    if (employees >= 200) return '200-499';
    if (employees >= 50) return '50-199';
    if (employees >= 10) return '10-49';
    return '1-9';
  }

  private inferStatus(accountType: string | undefined): 'active' | 'churned' | 'trial' | 'lead' {
    if (!accountType) return 'active';
    const type = accountType.toLowerCase();
    if (type === 'customer') return 'active';
    if (type === 'former customer') return 'churned';
    if (type === 'prospect') return 'lead';
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
