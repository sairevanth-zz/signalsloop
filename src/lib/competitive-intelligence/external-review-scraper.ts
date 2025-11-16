/**
 * External Review Scraper
 * Scrapes and processes reviews from G2, Capterra, and TrustRadius
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ReviewData {
  platform: 'g2' | 'capterra' | 'trustradius';
  external_review_id: string;
  title: string;
  content: string;
  rating: number;
  reviewer_name: string;
  reviewer_role?: string;
  reviewer_company_size?: string;
  published_at: string;
  verified_reviewer?: boolean;
  incentivized_review?: boolean;
}

interface ExtractedData {
  sentiment_score: number;
  sentiment_category: 'positive' | 'negative' | 'neutral' | 'mixed';
  mentioned_features: string[];
  pros: string[];
  cons: string[];
  use_cases: string[];
}

/**
 * Scrape reviews for a competitor product
 * NOTE: This is a placeholder - actual implementation would use:
 * - Official APIs where available (G2, Capterra might have partner APIs)
 * - Web scraping with proper rate limiting and respect for robots.txt
 * - Consider using services like ScraperAPI or Bright Data for production
 */
export async function scrapeCompetitorReviews(
  competitorProductId: string,
  platform: 'g2' | 'capterra' | 'trustradius',
  limit: number = 50
): Promise<{ success: boolean; reviewsScraped: number; error?: string }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get competitor product details
    const { data: product, error: productError } = await supabase
      .from('competitor_products')
      .select('*')
      .eq('id', competitorProductId)
      .single();

    if (productError || !product) {
      return { success: false, reviewsScraped: 0, error: 'Product not found' };
    }

    // Get platform URL
    const platformUrl = getPlatformUrl(product, platform);
    if (!platformUrl) {
      return { success: false, reviewsScraped: 0, error: `No ${platform} URL configured` };
    }

    // IMPORTANT: In production, implement actual scraping logic here
    // For now, we'll return a placeholder response
    // Real implementation options:
    // 1. Use official APIs if available
    // 2. Use web scraping libraries (puppeteer, playwright)
    // 3. Use third-party scraping services (ScraperAPI, Bright Data)

    console.log(`[External Scraper] Would scrape ${limit} reviews from ${platform} for ${product.product_name}`);
    console.log(`[External Scraper] URL: ${platformUrl}`);

    // Placeholder: Return success but don't actually scrape yet
    // In production, this would call the actual scraping function
    const reviews = await mockScrapeReviews(platform, product.product_name, limit);

    // Process and save each review
    let savedCount = 0;
    for (const review of reviews) {
      const saved = await processAndSaveReview(competitorProductId, product.project_id, review);
      if (saved) savedCount++;
    }

    // Update last synced timestamp
    await supabase
      .from('competitor_products')
      .update({
        last_synced_at: new Date().toISOString(),
        total_reviews_synced: product.total_reviews_synced + savedCount,
      })
      .eq('id', competitorProductId);

    return {
      success: true,
      reviewsScraped: savedCount,
    };
  } catch (error: any) {
    console.error('[External Scraper] Error scraping reviews:', error);
    return {
      success: false,
      reviewsScraped: 0,
      error: error.message,
    };
  }
}

/**
 * Process and save a single review
 */
async function processAndSaveReview(
  competitorProductId: string,
  projectId: string,
  review: ReviewData
): Promise<boolean> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if review already exists
    const { data: existing } = await supabase
      .from('competitor_reviews')
      .select('id')
      .eq('platform', review.platform)
      .eq('external_review_id', review.external_review_id)
      .maybeSingle();

    if (existing) {
      console.log(`[External Scraper] Review ${review.external_review_id} already exists, skipping`);
      return false;
    }

    // Extract features, sentiment, pros/cons using AI
    const extracted = await extractReviewData(review.content, review.title);

    // Save review
    const { error } = await supabase
      .from('competitor_reviews')
      .insert({
        competitor_product_id: competitorProductId,
        project_id: projectId,
        platform: review.platform,
        external_review_id: review.external_review_id,
        title: review.title,
        content: review.content,
        rating: review.rating,
        reviewer_name: review.reviewer_name,
        reviewer_role: review.reviewer_role,
        reviewer_company_size: review.reviewer_company_size,
        published_at: review.published_at,
        verified_reviewer: review.verified_reviewer || false,
        incentivized_review: review.incentivized_review || false,
        sentiment_score: extracted.sentiment_score,
        sentiment_category: extracted.sentiment_category,
        mentioned_features: extracted.mentioned_features,
        pros: extracted.pros,
        cons: extracted.cons,
        use_cases: extracted.use_cases,
        processed: true,
        processed_at: new Date().toISOString(),
        ai_extracted_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[External Scraper] Error saving review:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[External Scraper] Error processing review:', error);
    return false;
  }
}

/**
 * Extract features, sentiment, pros/cons from review using AI
 */
async function extractReviewData(content: string, title: string): Promise<ExtractedData> {
  try {
    const prompt = `Analyze this product review and extract:
1. Overall sentiment (-1 to 1 scale)
2. Sentiment category (positive/negative/neutral/mixed)
3. Mentioned features (list of specific features discussed)
4. Pros (list of positive points)
5. Cons (list of negative points)
6. Use cases (what the reviewer uses the product for)

Review Title: ${title}
Review Content: ${content}

Return as JSON:
{
  "sentiment_score": <-1 to 1>,
  "sentiment_category": "<positive|negative|neutral|mixed>",
  "mentioned_features": ["feature1", "feature2"],
  "pros": ["pro1", "pro2"],
  "cons": ["con1", "con2"],
  "use_cases": ["use case1", "use case2"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a product review analyzer. Extract structured data from reviews accurately and concisely.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      sentiment_score: result.sentiment_score || 0,
      sentiment_category: result.sentiment_category || 'neutral',
      mentioned_features: result.mentioned_features || [],
      pros: result.pros || [],
      cons: result.cons || [],
      use_cases: result.use_cases || [],
    };
  } catch (error) {
    console.error('[External Scraper] Error extracting review data:', error);
    return {
      sentiment_score: 0,
      sentiment_category: 'neutral',
      mentioned_features: [],
      pros: [],
      cons: [],
      use_cases: [],
    };
  }
}

/**
 * Analyze reviews to identify strengths and weaknesses
 */
export async function analyzeStrengthsAndWeaknesses(competitorProductId: string): Promise<{
  success: boolean;
  strengthsFound: number;
  weaknessesFound: number;
  error?: string;
}> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all reviews for this product
    const { data: reviews } = await supabase
      .from('competitor_reviews')
      .select('*')
      .eq('competitor_product_id', competitorProductId);

    if (!reviews || reviews.length === 0) {
      return { success: false, strengthsFound: 0, weaknessesFound: 0, error: 'No reviews to analyze' };
    }

    // Get competitor product details
    const { data: product } = await supabase
      .from('competitor_products')
      .select('project_id')
      .eq('id', competitorProductId)
      .single();

    if (!product) {
      return { success: false, strengthsFound: 0, weaknessesFound: 0, error: 'Product not found' };
    }

    // Aggregate all pros and cons
    const allPros = reviews.flatMap(r => r.pros || []);
    const allCons = reviews.flatMap(r => r.cons || []);

    // Use AI to cluster similar feedback into strengths/weaknesses
    const strengths = await clusterStrengths(allPros, reviews);
    const weaknesses = await clusterWeaknesses(allCons, reviews);

    // Save strengths
    let strengthsCreated = 0;
    for (const strength of strengths) {
      const { error } = await supabase
        .from('competitor_strengths')
        .upsert({
          competitor_product_id: competitorProductId,
          project_id: product.project_id,
          ...strength,
        }, {
          onConflict: 'competitor_product_id,feature_name',
        });

      if (!error) strengthsCreated++;
    }

    // Save weaknesses
    let weaknessesCreated = 0;
    for (const weakness of weaknesses) {
      const { error } = await supabase
        .from('competitor_weaknesses')
        .upsert({
          competitor_product_id: competitorProductId,
          project_id: product.project_id,
          ...weakness,
        }, {
          onConflict: 'competitor_product_id,feature_name',
        });

      if (!error) weaknessesCreated++;
    }

    return {
      success: true,
      strengthsFound: strengthsCreated,
      weaknessesFound: weaknessesCreated,
    };
  } catch (error: any) {
    console.error('[External Scraper] Error analyzing strengths/weaknesses:', error);
    return {
      success: false,
      strengthsFound: 0,
      weaknessesFound: 0,
      error: error.message,
    };
  }
}

// Helper functions

function getPlatformUrl(product: any, platform: string): string | null {
  switch (platform) {
    case 'g2':
      return product.g2_url;
    case 'capterra':
      return product.capterra_url;
    case 'trustradius':
      return product.trustradius_url;
    default:
      return null;
  }
}

/**
 * Mock scraping function - replace with actual scraping in production
 */
async function mockScrapeReviews(
  platform: 'g2' | 'capterra' | 'trustradius',
  productName: string,
  limit: number
): Promise<ReviewData[]> {
  // In production, this would actually scrape the platform
  // For now, return empty array - you'll need to implement actual scraping
  console.log(`[Mock Scraper] Would scrape ${limit} reviews for ${productName} from ${platform}`);
  return [];
}

/**
 * Cluster pros into strengths using AI
 */
async function clusterStrengths(pros: string[], reviews: any[]): Promise<any[]> {
  if (pros.length === 0) return [];

  try {
    const prompt = `Analyze these positive feedback points from product reviews and cluster them into major strengths.
Each strength should represent a category of positive feedback.

Positive feedback points:
${pros.slice(0, 100).join('\n')}

Return as JSON array:
[
  {
    "feature_name": "Strength name",
    "strength_category": "Category (e.g., UI/UX, Performance, Support)",
    "description": "Brief description",
    "praise_count": ${Math.min(pros.length, 100)},
    "confidence_score": 0.85
  }
]`;

    const completion = await openAI.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"strengths":[]}');
    return result.strengths || [];
  } catch (error) {
    console.error('[Clustering] Error clustering strengths:', error);
    return [];
  }
}

/**
 * Cluster cons into weaknesses using AI
 */
async function clusterWeaknesses(cons: string[], reviews: any[]): Promise<any[]> {
  if (cons.length === 0) return [];

  try {
    const prompt = `Analyze these negative feedback points from product reviews and cluster them into major weaknesses.
Each weakness represents an opportunity for competing products.

Negative feedback points:
${cons.slice(0, 100).join('\n')}

Return as JSON array:
[
  {
    "feature_name": "Weakness name",
    "weakness_category": "Category (e.g., Pricing, Missing Feature, Support)",
    "description": "Brief description",
    "complaint_count": ${Math.min(cons.length, 100)},
    "severity_score": 0.75,
    "opportunity_score": 0.85,
    "strategic_importance": "high"
  }
]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"weaknesses":[]}');
    return result.weaknesses || [];
  } catch (error) {
    console.error('[Clustering] Error clustering weaknesses:', error);
    return [];
  }
}
