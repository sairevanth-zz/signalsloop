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

import { getOpenAI } from './openai-client';

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

/**
 * Use LLM to synthesize all collected data into structured output
 * IMPORTANT: This uses strict matching criteria to avoid false positives
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

  // IMPORTANT: For personal email domains, we cannot reliably enrich
  // Web search results are highly unreliable for common names
  const isPersonalEmail = collectedData.emailDomain.isPersonal;

  // Calculate a preliminary confidence based on data quality
  let hasReliableData = false;
  const reliableSources: string[] = [];

  // GitHub is only reliable if email matches OR if GitHub profile name closely matches input name
  if (collectedData.github) {
    const githubName = collectedData.github.name?.toLowerCase() || '';
    const inputName = input.name?.toLowerCase() || '';
    // Only count GitHub as reliable if names are very similar
    if (inputName && githubName && (
      githubName.includes(inputName) ||
      inputName.includes(githubName) ||
      githubName === inputName
    )) {
      hasReliableData = true;
      reliableSources.push('github');
    }
  }

  // Hunter.io data is reliable (they verify emails)
  if (collectedData.hunter?.data?.company) {
    hasReliableData = true;
    reliableSources.push('hunter');
  }

  // Work email domain is reliable
  if (!isPersonalEmail) {
    hasReliableData = true;
    reliableSources.push('email_domain');
  }

  const prompt = `You are an EXTREMELY CAREFUL user intelligence analyst. Your job is to extract ACCURATE information about a specific person. 

⚠️ CRITICAL RULES - READ CAREFULLY:
1. You MUST only include information that you are 100% CERTAIN belongs to THIS SPECIFIC PERSON
2. Web search results often return DIFFERENT PEOPLE with similar names - DO NOT assume they are the same person
3. For personal email domains (@gmail.com, @yahoo.com, etc), you CANNOT determine company/role from web search alone
4. LinkedIn/Twitter/GitHub profiles found via search may belong to DIFFERENT people with similar names
5. A name match is NOT sufficient - you need MULTIPLE corroborating data points

PERSON TO ANALYZE:
- Email: ${input.email}
- Name: ${input.name || 'Unknown'}
- Plan: ${input.plan || 'free'}
- Email Type: ${isPersonalEmail ? '⚠️ PERSONAL EMAIL - BE EXTRA CAUTIOUS' : 'Work email - domain can be trusted'}

COLLECTED DATA:

Email Domain Analysis:
- Domain: ${collectedData.emailDomain.domain}
- Is Personal Email: ${collectedData.emailDomain.isPersonal}
- Company from Domain: ${collectedData.emailDomain.company || 'N/A (personal email)'}

${collectedData.github ? `
GitHub Profile (verify name match!):
- Username: ${collectedData.github.login}
- Profile Name: ${collectedData.github.name || 'N/A'}
- Company: ${collectedData.github.company || 'N/A'}
- Bio: ${collectedData.github.bio || 'N/A'}
- Location: ${collectedData.github.location || 'N/A'}
- Does profile name match input name "${input.name || 'Unknown'}"? CHECK THIS!
` : 'GitHub Profile: Not found'}

${collectedData.webSearch?.organic ? `
Web Search Results (⚠️ MAY BE DIFFERENT PEOPLE - verify carefully):
${collectedData.webSearch.organic.slice(0, 5).map((r, i) => `
${i + 1}. ${r.title}
   ${r.snippet}
   ${r.link}
`).join('\n')}
` : 'Web Search: No results'}

LinkedIn URL Found: ${collectedData.linkedinUrl || 'Not found'}
Twitter URL Found: ${collectedData.twitterUrl || 'Not found'}

${collectedData.hunter?.data ? `
Hunter.io Data (✓ Verified by email):
- Name: ${collectedData.hunter.data.first_name || ''} ${collectedData.hunter.data.last_name || ''}
- Position: ${collectedData.hunter.data.position || 'N/A'}
- Seniority: ${collectedData.hunter.data.seniority || 'N/A'}
- Company: ${collectedData.hunter.data.company || 'N/A'}
` : 'Hunter.io: No verified data'}

CONFIDENCE SCORING RULES:
- 0.8+ (High): Work email domain confirms company, OR Hunter.io verifies data, OR GitHub name matches exactly
- 0.5-0.7 (Medium): Multiple sources corroborate each other for the same exact person
- 0.3-0.4 (Low): Only web search results, may be a different person with similar name
- 0.1-0.2 (Very Low): Personal email with web search only - HIGH chance of wrong person
- 0.0: No reliable data at all

For personal emails (@gmail, @yahoo, etc) with only web search data:
- Set company_name, role, seniority_level to NULL unless you have VERIFIED sources (Hunter, GitHub with matching name)
- Cap confidence at 0.3 maximum
- In reasoning, explicitly state if you're uncertain

Return JSON:
{
  "company_name": "string or null - ONLY if verified",
  "company_domain": "string or null",
  "company_size": "string or null (small/medium/large/enterprise)",
  "industry": "string or null",
  "role": "string or null - ONLY if verified",
  "seniority_level": "string or null (junior/mid/senior/lead/executive)",
  "bio": "string or null",
  "location": "string or null",
  "website": "string or null",
  "confidence_score": number (0.0 to 1.0),
  "is_likely_wrong_person": boolean,
  "reasoning": "explain your confidence and any concerns about data accuracy"
}

IMPORTANT: Return ONLY valid JSON. Err on the side of NULL values rather than guessing!`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a data verification expert. Your PRIMARY goal is ACCURACY over completeness. Never guess. When in doubt, return null. A false positive (wrong person) is MUCH WORSE than a false negative (missing data).'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Lower temperature for more conservative responses
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in LLM response');
    }

    const synthesized = JSON.parse(content);

    // Build data sources array (only include truly used sources)
    const dataSources: string[] = [];
    if (collectedData.github) dataSources.push('github');
    if (collectedData.webSearch) dataSources.push('web_search');
    if (collectedData.linkedinUrl) dataSources.push('linkedin');
    if (collectedData.emailRep) dataSources.push('emailrep');
    if (collectedData.twitterUrl) dataSources.push('twitter');
    if (collectedData.hunter) dataSources.push('hunter');
    if (!collectedData.emailDomain.isPersonal) dataSources.push('email_domain');

    // Apply additional confidence penalties for unreliable scenarios
    let finalConfidence = Math.min(Math.max(synthesized.confidence_score || 0, 0), 1);

    // If it's a personal email and we only have web search, cap confidence at 0.3
    if (isPersonalEmail && !hasReliableData) {
      finalConfidence = Math.min(finalConfidence, 0.3);
      console.log('[Enrichment] Personal email with unreliable data - capping confidence at 0.3');
    }

    // If LLM flagged potential wrong person, cap at 0.25
    if (synthesized.is_likely_wrong_person) {
      finalConfidence = Math.min(finalConfidence, 0.25);
      console.log('[Enrichment] LLM flagged potential wrong person match');
    }

    return {
      company_name: synthesized.is_likely_wrong_person ? null : (synthesized.company_name || null),
      company_domain: collectedData.emailDomain.isPersonal ? null : collectedData.emailDomain.domain,
      company_size: synthesized.is_likely_wrong_person ? null : (synthesized.company_size || null),
      industry: synthesized.is_likely_wrong_person ? null : (synthesized.industry || null),
      role: synthesized.is_likely_wrong_person ? null : (synthesized.role || null),
      seniority_level: synthesized.is_likely_wrong_person ? null : (synthesized.seniority_level || null),
      linkedin_url: collectedData.linkedinUrl || null,
      twitter_url: collectedData.twitterUrl || null,
      github_url: collectedData.github ? `https://github.com/${collectedData.github.login}` : null,
      github_username: collectedData.github?.login || null,
      bio: synthesized.bio || null,
      location: synthesized.location || collectedData.github?.location || null,
      website: synthesized.website || collectedData.github?.blog || null,
      confidence_score: finalConfidence,
      data_sources: dataSources,
      raw_data: {
        emailDomain: collectedData.emailDomain,
        github: collectedData.github,
        webSearch: collectedData.webSearch,
        linkedinUrl: collectedData.linkedinUrl,
        emailRep: collectedData.emailRep,
        twitterUrl: collectedData.twitterUrl,
        hunter: collectedData.hunter,
        llm_reasoning: synthesized.reasoning,
        is_likely_wrong_person: synthesized.is_likely_wrong_person,
        reliable_sources: reliableSources
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
