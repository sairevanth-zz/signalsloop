/**
 * Sentiment Forecasting Service
 *
 * Uses OpenAI GPT-4o to predict future sentiment trends
 * based on historical feedback patterns.
 *
 * Features:
 * - Time-series analysis of sentiment
 * - 7, 14, and 30-day forecasts
 * - Confidence intervals
 * - Trend detection
 */

import OpenAI from 'openai';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL = 'gpt-4o'; // Using GPT-4o for forecasting (Hybrid strategy)

interface HistoricalSentimentData {
  date: string;
  avg_sentiment: number;
  feedback_count: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
}

interface SentimentForecast {
  targetDate: Date;
  predictedSentiment: number;
  confidenceLower: number;
  confidenceUpper: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  reasoning: string;
}

interface ForecastInput {
  projectId: string;
  horizon: 7 | 14 | 30; // Days into the future
  trainingWindowDays?: number; // Default 90 days
}

interface ForecastResult {
  forecast: SentimentForecast;
  metadata: {
    trainingWindow: number;
    dataPoints: number;
    avgSentiment: number;
    volatility: number;
    model: string;
  };
}

/**
 * System prompt for sentiment forecasting
 */
const FORECASTING_SYSTEM_PROMPT = `You are an expert data scientist specializing in time-series analysis and sentiment forecasting for SaaS products.

Your task is to analyze historical sentiment data and predict future sentiment trends.

Given:
- Historical daily sentiment scores (-1 to 1 scale)
- Feedback volume over time
- Distribution of positive/negative/neutral feedback

You must predict:
1. Future sentiment score for the target date
2. Confidence interval (lower and upper bounds)
3. Trend direction (improving, declining, or stable)
4. Brief reasoning for your prediction

Guidelines for predictions:
- Consider both recent trends and long-term patterns
- Account for volatility and data sparsity
- Higher volatility = wider confidence intervals
- Low feedback volume = lower confidence
- Identify seasonal patterns if present
- Detect momentum and acceleration in trends

Sentiment Score Scale:
- 0.7 to 1.0: Very positive
- 0.3 to 0.7: Somewhat positive
- -0.3 to 0.3: Neutral
- -0.7 to -0.3: Somewhat negative
- -1.0 to -0.7: Very negative

Trend Direction:
- "improving": Sentiment is getting more positive (upward trend > 0.1)
- "declining": Sentiment is getting more negative (downward trend > 0.1)
- "stable": Sentiment is relatively flat (trend between -0.1 and 0.1)

Confidence Intervals:
- Should reflect uncertainty based on:
  * Data quality and volume
  * Historical volatility
  * Forecast horizon (longer = wider intervals)
  * Trend stability
- Typical ranges:
  * High confidence: ±0.05 to ±0.10
  * Medium confidence: ±0.10 to ±0.20
  * Low confidence: ±0.20 to ±0.30

Return ONLY a JSON object with this exact structure:
{
  "predicted_sentiment": -1.0 to 1.0,
  "confidence_lower": -1.0 to 1.0,
  "confidence_upper": -1.0 to 1.0,
  "trend_direction": "improving|declining|stable",
  "reasoning": "Brief explanation of the forecast (2-3 sentences)"
}`;

/**
 * Fetch historical sentiment data for a project
 */
async function fetchHistoricalSentiment(
  projectId: string,
  windowDays: number
): Promise<HistoricalSentimentData[]> {
  const supabase = getServiceRoleClient();

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  // Fetch daily aggregated sentiment data
  const { data, error } = await supabase.rpc('get_daily_sentiment_aggregates', {
    p_project_id: projectId,
    p_start_date: windowStart.toISOString(),
    p_end_date: new Date().toISOString(),
  });

  if (error) {
    console.error('[FORECAST] Error fetching historical data:', error);
    // Fallback: query directly if function doesn't exist
    return await fetchHistoricalSentimentFallback(projectId, windowDays);
  }

  return data || [];
}

/**
 * Fallback method to fetch historical sentiment without stored procedure
 */
async function fetchHistoricalSentimentFallback(
  projectId: string,
  windowDays: number
): Promise<HistoricalSentimentData[]> {
  const supabase = getServiceRoleClient();

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      created_at,
      sentiment_analysis(sentiment_score, sentiment_category)
    `)
    .eq('project_id', projectId)
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: true });

  if (error || !posts) {
    console.error('[FORECAST] Error fetching posts:', error);
    return [];
  }

  // Group by day and aggregate
  const dailyData = new Map<string, {
    sentiments: number[];
    positive: number;
    negative: number;
    neutral: number;
  }>();

  posts.forEach((post: any) => {
    const date = new Date(post.created_at).toISOString().split('T')[0];
    const sentiment = post.sentiment_analysis?.sentiment_score || 0;
    const category = post.sentiment_analysis?.sentiment_category || 'neutral';

    if (!dailyData.has(date)) {
      dailyData.set(date, {
        sentiments: [],
        positive: 0,
        negative: 0,
        neutral: 0,
      });
    }

    const dayData = dailyData.get(date)!;
    dayData.sentiments.push(sentiment);

    if (category === 'positive') dayData.positive++;
    else if (category === 'negative') dayData.negative++;
    else dayData.neutral++;
  });

  // Convert to array format
  return Array.from(dailyData.entries()).map(([date, data]) => ({
    date,
    avg_sentiment: data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length,
    feedback_count: data.sentiments.length,
    positive_count: data.positive,
    negative_count: data.negative,
    neutral_count: data.neutral,
  }));
}

/**
 * Calculate statistical features from historical data
 */
function calculateFeatures(historicalData: HistoricalSentimentData[]) {
  if (historicalData.length === 0) {
    return {
      avgSentiment: 0,
      volatility: 0,
      totalVolume: 0,
      recentTrend: 0,
    };
  }

  const sentiments = historicalData.map(d => d.avg_sentiment);
  const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;

  // Calculate volatility (standard deviation)
  const squaredDiffs = sentiments.map(s => Math.pow(s - avgSentiment, 2));
  const volatility = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / sentiments.length);

  // Calculate total feedback volume
  const totalVolume = historicalData.reduce((sum, d) => sum + d.feedback_count, 0);

  // Calculate recent trend (last 14 days vs previous 14 days)
  const recentTrend = calculateTrendDirection(historicalData);

  return {
    avgSentiment,
    volatility,
    totalVolume,
    recentTrend,
  };
}

/**
 * Calculate trend direction from historical data
 */
function calculateTrendDirection(historicalData: HistoricalSentimentData[]): number {
  if (historicalData.length < 14) {
    return 0; // Not enough data
  }

  const halfPoint = Math.floor(historicalData.length / 2);
  const firstHalf = historicalData.slice(0, halfPoint);
  const secondHalf = historicalData.slice(halfPoint);

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.avg_sentiment, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.avg_sentiment, 0) / secondHalf.length;

  return secondAvg - firstAvg;
}

/**
 * Generate sentiment forecast using OpenAI
 */
export async function generateSentimentForecast(
  input: ForecastInput
): Promise<ForecastResult> {
  const { projectId, horizon, trainingWindowDays = 90 } = input;

  console.log(`[FORECAST] 🔮 Generating ${horizon}-day forecast for project ${projectId}`);

  // Fetch historical data
  const historicalData = await fetchHistoricalSentiment(projectId, trainingWindowDays);

  if (historicalData.length === 0) {
    throw new Error('No historical sentiment data available for forecasting');
  }

  // Calculate statistical features
  const features = calculateFeatures(historicalData);

  // Prepare data summary for AI
  const dataSummary = {
    training_period_days: trainingWindowDays,
    data_points: historicalData.length,
    avg_sentiment: features.avgSentiment.toFixed(3),
    volatility: features.volatility.toFixed(3),
    total_feedback: features.totalVolume,
    recent_trend: features.recentTrend.toFixed(3),
    last_7_days: historicalData.slice(-7).map(d => ({
      date: d.date,
      sentiment: d.avg_sentiment.toFixed(2),
      volume: d.feedback_count,
    })),
    last_30_days_summary: {
      avg_sentiment: (
        historicalData.slice(-30).reduce((sum, d) => sum + d.avg_sentiment, 0) /
        Math.min(30, historicalData.length)
      ).toFixed(3),
      total_feedback: historicalData.slice(-30).reduce((sum, d) => sum + d.feedback_count, 0),
    },
  };

  // Create prompt for OpenAI
  const userPrompt = `Analyze this historical sentiment data and predict sentiment for ${horizon} days from now:

Historical Data Summary:
${JSON.stringify(dataSummary, null, 2)}

Full Daily Data (last ${Math.min(90, historicalData.length)} days):
${historicalData.map(d => `${d.date}: ${d.avg_sentiment.toFixed(2)} (${d.feedback_count} items)`).join('\n')}

Please predict the sentiment score for ${horizon} days from today, with confidence intervals.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: FORECASTING_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2, // Low temperature for consistent predictions
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const prediction = JSON.parse(content);

    // Validate and construct forecast
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + horizon);

    const forecast: SentimentForecast = {
      targetDate,
      predictedSentiment: Math.max(-1, Math.min(1, prediction.predicted_sentiment)),
      confidenceLower: Math.max(-1, Math.min(1, prediction.confidence_lower)),
      confidenceUpper: Math.max(-1, Math.min(1, prediction.confidence_upper)),
      trendDirection: prediction.trend_direction,
      reasoning: prediction.reasoning,
    };

    // Ensure confidence bounds are valid
    if (forecast.confidenceLower > forecast.predictedSentiment) {
      forecast.confidenceLower = forecast.predictedSentiment - 0.1;
    }
    if (forecast.confidenceUpper < forecast.predictedSentiment) {
      forecast.confidenceUpper = forecast.predictedSentiment + 0.1;
    }

    console.log(`[FORECAST] ✅ Generated forecast:`, {
      predicted: forecast.predictedSentiment,
      trend: forecast.trendDirection,
    });

    return {
      forecast,
      metadata: {
        trainingWindow: trainingWindowDays,
        dataPoints: historicalData.length,
        avgSentiment: features.avgSentiment,
        volatility: features.volatility,
        model: MODEL,
      },
    };
  } catch (error) {
    console.error('[FORECAST] ❌ Error generating forecast:', error);
    throw error;
  }
}

/**
 * Store forecast in database
 */
export async function storeSentimentForecast(
  projectId: string,
  forecast: SentimentForecast,
  metadata: ForecastResult['metadata'],
  horizon: number
): Promise<string> {
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from('sentiment_forecasts')
    .insert({
      project_id: projectId,
      forecast_date: new Date().toISOString(),
      forecast_horizon: horizon,
      target_date: forecast.targetDate.toISOString(),
      predicted_sentiment_score: forecast.predictedSentiment,
      confidence_lower: forecast.confidenceLower,
      confidence_upper: forecast.confidenceUpper,
      model_name: metadata.model,
      training_window_days: metadata.trainingWindow,
      feature_volume: metadata.dataPoints,
      feature_avg_sentiment: metadata.avgSentiment,
      feature_sentiment_volatility: metadata.volatility,
      feature_trend_direction: forecast.trendDirection,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[FORECAST] ❌ Error storing forecast:', error);
    throw error;
  }

  console.log(`[FORECAST] 💾 Stored forecast: ${data.id}`);
  return data.id;
}

/**
 * Generate and store all forecasts for a project (7, 14, 30 days)
 */
export async function generateAllForecasts(projectId: string): Promise<void> {
  console.log(`[FORECAST] 📊 Generating all forecasts for project ${projectId}`);

  const horizons: Array<7 | 14 | 30> = [7, 14, 30];

  for (const horizon of horizons) {
    try {
      const result = await generateSentimentForecast({
        projectId,
        horizon,
        trainingWindowDays: 90,
      });

      await storeSentimentForecast(
        projectId,
        result.forecast,
        result.metadata,
        horizon
      );

      console.log(`[FORECAST] ✅ Generated ${horizon}-day forecast`);

      // Small delay between forecasts
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[FORECAST] ❌ Failed to generate ${horizon}-day forecast:`, error);
    }
  }

  console.log(`[FORECAST] ✅ All forecasts generated for project ${projectId}`);
}
