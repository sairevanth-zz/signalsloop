/**
 * User Intelligence Enrichment Library
 *
 * Multi-level enrichment pipeline:
 * - Level 1: Email domain analysis + GitHub API
 * - Level 2: Web search + LLM extraction
 * - Level 3: EmailRep.io + Twitter search + Hunter.io
 *
 * Uses LLM to synthesize all data sources with confidence scoring
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Types
// ============================================================================

export interface EnrichmentInput {
  email: string;
  name?: string | null;
  plan?: string | null;
}

export interface EnrichmentResult {
  // Company Info
  company_name: string | null;
  company_domain: string | null;
  company_size: string | null;
  industry: string | null;

  // Role Info
  role: string | null;
  seniority_level: string | null;

  // Social Profiles
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  github_username: string | null;

  // Additional Context
  bio: string | null;
  location: string | null;
  website: string | null;

  // Metadata
  confidence_score: number;
  data_sources: string[];
  raw_data: Record<string, unknown>;
}

interface GitHubProfile {
  login: string;
  name: string | null;
  company: string | null;
  bio: string | null;
  location: string | null;
  blog: string | null;
  twitter_username: string | null;
  public_repos: number;
  followers: number;
}

interface SerperResult {
  organic?: Array<{
    title: string;
    snippet: string;
    link: string;
  }>;
}

interface EmailRepResult {
  email: string;
  reputation: string;
  suspicious: boolean;
  references: number;
  details: {
    profiles?: string[];
  };
}

interface HunterResult {
  data?: {
    first_name?: string;
    last_name?: string;
    position?: string;
    seniority?: string;
    department?: string;
    linkedin?: string;
    twitter?: string;
    phone_number?: string;
    company?: string;
  };
}

// ============================================================================
// Level 1: Email Domain Analysis + GitHub Lookup
// ============================================================================

/**
 * Extract company domain from email address
 */
export function extractCompanyFromEmail(email: string): {
  domain: string;
  isPersonal: boolean;
  company: string | null;
} {
  const emailLower = email.toLowerCase();
  const domain = emailLower.split('@')[1];

  const personalDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'me.com', 'protonmail.com', 'hey.com',
    'aol.com', 'mail.com', 'zoho.com'
  ];

  const isPersonal = personalDomains.includes(domain);

  if (isPersonal) {
    return { domain, isPersonal: true, company: null };
  }

  // Extract company name from domain (e.g., "acme.com" -> "Acme")
  const companyName = domain
    .split('.')[0]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    domain,
    isPersonal: false,
    company: companyName
  };
}

/**
 * Fetch GitHub profile by email or name
 */
export async function fetchGitHubProfile(
  email: string,
  name?: string | null
): Promise<GitHubProfile | null> {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.log('[GitHub] No token configured, skipping');
      return null;
    }

    // Try to find user by email first
    let username: string | null = null;

    // Search by email
    const emailSearchUrl = `https://api.github.com/search/users?q=${encodeURIComponent(email)}`;
    const emailResponse = await fetch(emailSearchUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      if (emailData.items && emailData.items.length > 0) {
        username = emailData.items[0].login;
      }
    }

    // If not found by email and name is provided, search by name
    if (!username && name) {
      const nameSearchUrl = `https://api.github.com/search/users?q=${encodeURIComponent(name)}`;
      const nameResponse = await fetch(nameSearchUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (nameResponse.ok) {
        const nameData = await nameResponse.json();
        if (nameData.items && nameData.items.length > 0) {
          username = nameData.items[0].login;
        }
      }
    }

    if (!username) {
      return null;
    }

    // Fetch full profile
    const profileResponse = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!profileResponse.ok) {
      return null;
    }

    const profile = await profileResponse.json();
    return profile;
  } catch (error) {
    console.error('[GitHub] Error fetching profile:', error);
    return null;
  }
}

// ============================================================================
// Level 2: Web Search + LLM Extraction
// ============================================================================

/**
 * Search web using Serper API
 */
export async function searchWeb(query: string): Promise<SerperResult | null> {
  try {
    const serperApiKey = process.env.SERPER_API_KEY;
    if (!serperApiKey) {
      console.log('[Serper] No API key configured, skipping');
      return null;
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10,
      }),
    });

    if (!response.ok) {
      console.error('[Serper] API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Serper] Error searching web:', error);
    return null;
  }
}

/**
 * Search for LinkedIn profile
 */
export async function searchLinkedIn(name: string, company?: string): Promise<string | null> {
  const query = company
    ? `"${name}" "${company}" site:linkedin.com/in`
    : `"${name}" site:linkedin.com/in`;

  const results = await searchWeb(query);
  if (!results?.organic || results.organic.length === 0) {
    return null;
  }

  // Find first LinkedIn profile URL
  for (const result of results.organic) {
    if (result.link.includes('linkedin.com/in/')) {
      return result.link;
    }
  }

  return null;
}

// ============================================================================
// Level 3: EmailRep + Twitter Search + Hunter.io
// ============================================================================

/**
 * Fetch data from EmailRep.io (free, no auth)
 */
export async function fetchEmailRep(email: string): Promise<EmailRepResult | null> {
  try {
    const response = await fetch(`https://emailrep.io/${email}`, {
      headers: {
        'User-Agent': 'SignalsLoop-Enrichment',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[EmailRep] Error:', error);
    return null;
  }
}

/**
 * Search Twitter/X profiles
 */
export async function searchTwitter(name: string): Promise<string | null> {
  const query = `"${name}" site:twitter.com OR site:x.com`;
  const results = await searchWeb(query);

  if (!results?.organic || results.organic.length === 0) {
    return null;
  }

  // Find first Twitter/X profile URL
  for (const result of results.organic) {
    if (result.link.includes('twitter.com/') || result.link.includes('x.com/')) {
      // Exclude status URLs, only profile pages
      if (!result.link.includes('/status/')) {
        return result.link;
      }
    }
  }

  return null;
}

/**
 * Fetch data from Hunter.io (50 free requests/month)
 */
export async function fetchHunterData(email: string): Promise<HunterResult | null> {
  try {
    const hunterApiKey = process.env.HUNTER_API_KEY;
    if (!hunterApiKey) {
      console.log('[Hunter] No API key configured, skipping');
      return null;
    }

    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${hunterApiKey}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Hunter] Error:', error);
    return null;
  }
}

// ============================================================================
// LLM Synthesis
// ============================================================================

/**
 * Use LLM to synthesize all collected data into structured output
 */
export async function synthesizeWithLLM(
  input: EnrichmentInput,
  collectedData: {
    emailDomain: ReturnType<typeof extractCompanyFromEmail>;
    github: GitHubProfile | null;
    webSearch: SerperResult | null;
    linkedinUrl: string | null;
    emailRep: EmailRepResult | null;
    twitterUrl: string | null;
    hunter: HunterResult | null;
  }
): Promise<EnrichmentResult> {
  const prompt = `You are a user intelligence analyst. Analyze the following data about a user and extract structured information.

User Email: ${input.email}
User Name: ${input.name || 'Unknown'}
Plan: ${input.plan || 'free'}

COLLECTED DATA:

Email Domain Analysis:
- Domain: ${collectedData.emailDomain.domain}
- Is Personal Email: ${collectedData.emailDomain.isPersonal}
- Extracted Company: ${collectedData.emailDomain.company || 'N/A'}

${collectedData.github ? `
GitHub Profile:
- Username: ${collectedData.github.login}
- Name: ${collectedData.github.name || 'N/A'}
- Company: ${collectedData.github.company || 'N/A'}
- Bio: ${collectedData.github.bio || 'N/A'}
- Location: ${collectedData.github.location || 'N/A'}
- Website: ${collectedData.github.blog || 'N/A'}
- Twitter: ${collectedData.github.twitter_username || 'N/A'}
- Repos: ${collectedData.github.public_repos}
- Followers: ${collectedData.github.followers}
` : 'GitHub Profile: Not found'}

${collectedData.webSearch?.organic ? `
Web Search Results:
${collectedData.webSearch.organic.slice(0, 5).map((r, i) => `
${i + 1}. ${r.title}
   ${r.snippet}
   ${r.link}
`).join('\n')}
` : 'Web Search: No results'}

LinkedIn URL: ${collectedData.linkedinUrl || 'Not found'}
Twitter URL: ${collectedData.twitterUrl || 'Not found'}

${collectedData.emailRep ? `
EmailRep Data:
- Reputation: ${collectedData.emailRep.reputation}
- Profiles: ${collectedData.emailRep.details?.profiles?.join(', ') || 'None'}
` : 'EmailRep: No data'}

${collectedData.hunter?.data ? `
Hunter.io Data:
- Name: ${collectedData.hunter.data.first_name || ''} ${collectedData.hunter.data.last_name || ''}
- Position: ${collectedData.hunter.data.position || 'N/A'}
- Seniority: ${collectedData.hunter.data.seniority || 'N/A'}
- Company: ${collectedData.hunter.data.company || 'N/A'}
` : 'Hunter.io: No data'}

TASK:
Extract the following information in JSON format. Use null for unknown fields. Be conservative - only include information you're confident about.

Return JSON with these exact fields:
{
  "company_name": "string or null",
  "company_domain": "string or null",
  "company_size": "string or null (small/medium/large/enterprise)",
  "industry": "string or null",
  "role": "string or null (job title)",
  "seniority_level": "string or null (junior/mid/senior/lead/executive)",
  "bio": "string or null (brief professional summary)",
  "location": "string or null",
  "website": "string or null",
  "confidence_score": number (0.0 to 1.0),
  "reasoning": "string explaining your confidence score and data quality"
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a data extraction expert. You analyze user data from multiple sources and extract structured information with confidence scores. Always return valid JSON only, no markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in LLM response');
    }

    const synthesized = JSON.parse(content);

    // Build data sources array
    const dataSources: string[] = [];
    if (collectedData.github) dataSources.push('github');
    if (collectedData.webSearch) dataSources.push('web_search');
    if (collectedData.linkedinUrl) dataSources.push('linkedin');
    if (collectedData.emailRep) dataSources.push('emailrep');
    if (collectedData.twitterUrl) dataSources.push('twitter');
    if (collectedData.hunter) dataSources.push('hunter');
    if (!collectedData.emailDomain.isPersonal) dataSources.push('email_domain');

    return {
      company_name: synthesized.company_name || null,
      company_domain: collectedData.emailDomain.isPersonal ? null : collectedData.emailDomain.domain,
      company_size: synthesized.company_size || null,
      industry: synthesized.industry || null,
      role: synthesized.role || null,
      seniority_level: synthesized.seniority_level || null,
      linkedin_url: collectedData.linkedinUrl || null,
      twitter_url: collectedData.twitterUrl || null,
      github_url: collectedData.github ? `https://github.com/${collectedData.github.login}` : null,
      github_username: collectedData.github?.login || null,
      bio: synthesized.bio || null,
      location: synthesized.location || collectedData.github?.location || null,
      website: synthesized.website || collectedData.github?.blog || null,
      confidence_score: Math.min(Math.max(synthesized.confidence_score || 0, 0), 1),
      data_sources: dataSources,
      raw_data: {
        emailDomain: collectedData.emailDomain,
        github: collectedData.github,
        webSearch: collectedData.webSearch,
        linkedinUrl: collectedData.linkedinUrl,
        emailRep: collectedData.emailRep,
        twitterUrl: collectedData.twitterUrl,
        hunter: collectedData.hunter,
        llm_reasoning: synthesized.reasoning
      }
    };
  } catch (error) {
    console.error('[LLM] Error synthesizing data:', error);

    // Fallback: manual extraction
    const dataSources: string[] = [];
    if (collectedData.github) dataSources.push('github');
    if (!collectedData.emailDomain.isPersonal) dataSources.push('email_domain');

    return {
      company_name: collectedData.emailDomain.company || collectedData.github?.company || null,
      company_domain: collectedData.emailDomain.isPersonal ? null : collectedData.emailDomain.domain,
      company_size: null,
      industry: null,
      role: collectedData.hunter?.data?.position || null,
      seniority_level: collectedData.hunter?.data?.seniority || null,
      linkedin_url: collectedData.linkedinUrl || null,
      twitter_url: collectedData.twitterUrl || null,
      github_url: collectedData.github ? `https://github.com/${collectedData.github.login}` : null,
      github_username: collectedData.github?.login || null,
      bio: collectedData.github?.bio || null,
      location: collectedData.github?.location || null,
      website: collectedData.github?.blog || null,
      confidence_score: 0.3,
      data_sources: dataSources,
      raw_data: collectedData
    };
  }
}

// ============================================================================
// Main Enrichment Pipeline
// ============================================================================

/**
 * Execute full enrichment pipeline (Levels 1-3 + LLM synthesis)
 */
export async function enrichUser(input: EnrichmentInput): Promise<EnrichmentResult> {
  console.log('[Enrichment] Starting enrichment for:', input.email);

  // Level 1: Email domain + GitHub
  console.log('[Enrichment] Level 1: Email domain + GitHub');
  const emailDomain = extractCompanyFromEmail(input.email);
  const github = await fetchGitHubProfile(input.email, input.name);

  // Level 2: Web search + LinkedIn
  console.log('[Enrichment] Level 2: Web search + LinkedIn');
  const searchQuery = emailDomain.company
    ? `"${input.name}" "${emailDomain.company}" role`
    : `"${input.name}" ${input.email.split('@')[0]}`;

  const webSearch = await searchWeb(searchQuery);
  const linkedinUrl = await searchLinkedIn(input.name || input.email.split('@')[0], emailDomain.company || undefined);

  // Level 3: EmailRep + Twitter + Hunter
  console.log('[Enrichment] Level 3: EmailRep + Twitter + Hunter');
  const emailRep = await fetchEmailRep(input.email);
  const twitterUrl = input.name ? await searchTwitter(input.name) : null;
  const hunter = await fetchHunterData(input.email);

  // LLM Synthesis
  console.log('[Enrichment] Synthesizing with LLM');
  const result = await synthesizeWithLLM(input, {
    emailDomain,
    github,
    webSearch,
    linkedinUrl,
    emailRep,
    twitterUrl,
    hunter
  });

  console.log('[Enrichment] Completed with confidence:', result.confidence_score);
  console.log('[Enrichment] Data sources:', result.data_sources.join(', '));

  return result;
}
