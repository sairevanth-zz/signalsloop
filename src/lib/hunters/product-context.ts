/**
 * Product Context System
 * Builds rich product context for injection into all hunter prompts
 * This eliminates false positives by providing disambiguation rules
 */

/**
 * Product context interface - injected into all prompts
 */
export interface ProductContext {
    name: string;                    // "SignalsLoop"
    tagline: string;                 // "AI-powered product feedback management"
    category: string;                // "B2B SaaS, Product Management Tools"
    description: string;             // 2-3 sentence description
    keyFeatures: string[];           // ["Feedback boards", "AI categorization", "Public roadmaps"]
    targetAudience: string;          // "Product managers, indie makers, startups"
    competitors: string[];           // ["Canny", "ProductBoard", "UserVoice"]
    websiteUrl: string;              // "signalsloop.com"
    socialHandles: {                 // For direct mention detection
        twitter?: string;              // "@signalsloop"
        reddit?: string;               // "r/signalsloop" or "u/signalsloop"
    };
    excludeTerms: string[];          // Terms that cause false positives
    includeTerms: string[];          // Alternative names, common misspellings
}

/**
 * Extended HunterConfig with product context fields
 */
export interface ExtendedHunterConfig {
    id: string;
    project_id: string;
    company_name: string;
    name_variations: string[];
    competitors: string[];
    industry?: string;
    keywords: string[];
    excluded_keywords: string[];
    // New product context fields
    product_tagline?: string;
    product_category?: string;
    product_description?: string;
    target_audience?: string;
    website_url?: string;
    social_handles?: {
        twitter?: string;
        reddit?: string;
    };
    exclude_terms?: string[];
}

/**
 * Build ProductContext from HunterConfig
 */
export function buildProductContext(config: ExtendedHunterConfig): ProductContext {
    return {
        name: config.company_name,
        tagline: config.product_tagline || '',
        category: config.product_category || config.industry || '',
        description: config.product_description || '',
        keyFeatures: config.keywords || [],
        targetAudience: config.target_audience || '',
        competitors: config.competitors || [],
        websiteUrl: config.website_url || '',
        socialHandles: config.social_handles || {},
        excludeTerms: config.exclude_terms || config.excluded_keywords || [],
        includeTerms: config.name_variations || [],
    };
}

/**
 * Format ProductContext as a string block for prompt injection
 */
export function formatContextBlock(context: ProductContext): string {
    const lines = [
        'PRODUCT CONTEXT:',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `Product: ${context.name}`,
    ];

    if (context.tagline) {
        lines.push(`Tagline: ${context.tagline}`);
    }

    if (context.category) {
        lines.push(`Category: ${context.category}`);
    }

    if (context.websiteUrl) {
        const twitterHandle = context.socialHandles?.twitter || '';
        lines.push(`Website: ${context.websiteUrl}${twitterHandle ? ` | Twitter: ${twitterHandle}` : ''}`);
    }

    if (context.description) {
        lines.push('');
        lines.push(`Description: ${context.description}`);
    }

    if (context.targetAudience) {
        lines.push('');
        lines.push(`Target Audience: ${context.targetAudience}`);
    }

    if (context.keyFeatures.length > 0) {
        lines.push('');
        lines.push('Key Features:');
        context.keyFeatures.forEach(feature => {
            lines.push(`- ${feature}`);
        });
    }

    if (context.competitors.length > 0) {
        lines.push('');
        lines.push(`Known Competitors: ${context.competitors.join(', ')}`);
    }

    // Disambiguation rules
    lines.push('');
    lines.push('DISAMBIGUATION RULES:');

    // Include terms
    const includeItems = [context.name];
    if (context.includeTerms.length > 0) {
        includeItems.push(...context.includeTerms);
    }
    if (context.websiteUrl) {
        includeItems.push(context.websiteUrl);
    }
    if (context.socialHandles?.twitter) {
        includeItems.push(context.socialHandles.twitter);
    }
    lines.push(`✓ INCLUDE mentions of: ${includeItems.join(', ')}`);

    // Category discussions
    if (context.category || context.keyFeatures.length > 0) {
        const categoryTerms = [
            context.category,
            ...context.keyFeatures.slice(0, 3),
        ].filter(Boolean);
        lines.push(`✓ INCLUDE discussions about: ${categoryTerms.join(', ')} (when comparing alternatives)`);
    }

    // Exclude terms
    if (context.excludeTerms.length > 0) {
        lines.push(`✗ EXCLUDE: ${context.excludeTerms.join(', ')}`);
    } else {
        // Generate common false positive terms based on product name
        const commonFalsePositives = generateFalsePositiveHints(context.name);
        if (commonFalsePositives.length > 0) {
            lines.push(`✗ EXCLUDE: ${commonFalsePositives.join(', ')}`);
        }
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return lines.join('\n');
}

/**
 * Generate common false positive hints based on product name
 */
function generateFalsePositiveHints(productName: string): string[] {
    const hints: string[] = [];
    const nameLower = productName.toLowerCase();

    // Common word associations that cause false positives
    const wordAssociations: Record<string, string[]> = {
        'signal': ['trading signals', 'traffic signals', 'radio signals', 'Signal messenger'],
        'loop': ['Loop email', 'feedback loop (generic)', 'loop antenna', 'music loops'],
        'flow': ['cash flow', 'traffic flow', 'workflow (generic)'],
        'hub': ['GitHub', 'hub (generic)'],
        'board': ['bulletin board (generic)', 'whiteboard'],
        'track': ['music track', 'GPS tracking'],
    };

    // Check if product name contains common words
    for (const [word, associations] of Object.entries(wordAssociations)) {
        if (nameLower.includes(word)) {
            hints.push(...associations);
        }
    }

    // Add generic exclusions
    hints.push('job postings', 'press releases without user reactions');

    return hints;
}

/**
 * Auto-generate product context using Grok web search
 */
export async function autoGenerateProductContext(
    companyName: string,
    websiteUrl?: string,
    apiKey?: string
): Promise<Partial<ProductContext>> {
    if (!apiKey) {
        apiKey = process.env.XAI_API_KEY;
    }

    if (!apiKey) {
        console.warn('[ProductContext] No XAI_API_KEY, returning minimal context');
        return {
            name: companyName,
            websiteUrl: websiteUrl || '',
        };
    }

    const searchTarget = websiteUrl || `${companyName} software`;

    const systemPrompt = `You are a product research assistant. Given a product name and optionally a website, 
extract key information about the product.

Return a JSON object with:
- tagline: The product's tagline or value proposition (1 line)
- category: Product category (e.g., "B2B SaaS - Product Management")
- description: 2-3 sentence description of what the product does
- keyFeatures: Array of 3-5 main features
- targetAudience: Who uses this product
- competitors: Array of 3-5 known competitors

Return ONLY valid JSON. No explanations.`;

    const userPrompt = `Research this product and extract information:
Product Name: ${companyName}
${websiteUrl ? `Website: ${websiteUrl}` : ''}

Find information from the product's website and review sites.`;

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'grok-3-fast',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                search_parameters: {
                    mode: 'on',
                    sources: [{ type: 'web' }],
                    max_search_results: 10,
                },
                temperature: 0.1,
            }),
        });

        if (!response.ok) {
            console.error('[ProductContext] Grok API error:', response.status);
            return { name: companyName };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                name: companyName,
                tagline: parsed.tagline || '',
                category: parsed.category || '',
                description: parsed.description || '',
                keyFeatures: parsed.keyFeatures || [],
                targetAudience: parsed.targetAudience || '',
                competitors: parsed.competitors || [],
                websiteUrl: websiteUrl || '',
            };
        }

        return { name: companyName };
    } catch (error) {
        console.error('[ProductContext] Error auto-generating context:', error);
        return { name: companyName };
    }
}

/**
 * Check if product context is complete enough for high-quality filtering
 */
export function isContextComplete(context: ProductContext): boolean {
    return !!(
        context.name &&
        context.category &&
        context.description &&
        context.keyFeatures.length > 0 &&
        context.competitors.length > 0
    );
}

/**
 * Get context completeness score (0-100)
 */
export function getContextCompleteness(context: ProductContext): number {
    let score = 0;

    if (context.name) score += 20;
    if (context.tagline) score += 10;
    if (context.category) score += 15;
    if (context.description) score += 15;
    if (context.keyFeatures.length > 0) score += 10;
    if (context.keyFeatures.length >= 3) score += 5;
    if (context.targetAudience) score += 5;
    if (context.competitors.length > 0) score += 10;
    if (context.competitors.length >= 3) score += 5;
    if (context.websiteUrl) score += 5;

    return score;
}
