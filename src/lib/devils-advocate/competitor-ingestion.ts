/**
 * Competitor Intelligence Ingestion Pipeline
 *
 * Scrapes competitor data and stores with vector embeddings.
 */

import { createServerClient } from '@/lib/supabase-client';
import OpenAI from 'openai';
import type {
  CompetitorEvent,
  CompetitorScrapeResult,
} from '@/types/devils-advocate';
import { CompetitorEventSchema } from '@/types/devils-advocate';
import { summarizeCompetitorEvent } from './prompts/summarize-event';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Ingests competitor data for a project
 * For MVP, this focuses on manual event creation with AI enhancement
 */
export async function ingestCompetitorData(
  projectId: string
): Promise<CompetitorScrapeResult> {
  const supabase = await createServerClient();
  const errors: Array<{ competitor_id: string; error: string }> = [];
  let eventsCreated = 0;

  try {
    // Get all active competitors for the project
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('id, name, website, metadata')
      .eq('project_id', projectId)
      .eq('status', 'active');

    if (competitorsError) {
      throw competitorsError;
    }

    if (!competitors || competitors.length === 0) {
      return {
        success: true,
        events_created: 0,
        errors: [],
      };
    }

    console.log(`[CompetitorIngestion] Found ${competitors.length} active competitors`);

    // For MVP: Process changelog URLs if available
    for (const competitor of competitors) {
      try {
        const changelogUrl = competitor.metadata?.changelog_url;

        if (!changelogUrl) {
          console.log(
            `[CompetitorIngestion] No changelog URL for ${competitor.name}, skipping`
          );
          continue;
        }

        // Scrape and process (simplified for MVP - would use Firecrawl in production)
        const events = await scrapeCompetitorChangelog(
          competitor.id,
          projectId,
          competitor.name,
          changelogUrl
        );

        eventsCreated += events;
      } catch (error) {
        console.error(
          `[CompetitorIngestion] Error processing ${competitor.name}:`,
          error
        );
        errors.push({
          competitor_id: competitor.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: errors.length === 0,
      events_created: eventsCreated,
      errors,
    };
  } catch (error) {
    console.error('[CompetitorIngestion] Fatal error:', error);
    throw error;
  }
}

/**
 * Scrapes a competitor's changelog and creates events
 * MVP version - would use Firecrawl in production
 */
async function scrapeCompetitorChangelog(
  competitorId: string,
  projectId: string,
  competitorName: string,
  changelogUrl: string
): Promise<number> {
  // For MVP, this is a placeholder that demonstrates the flow
  // In production, this would use Firecrawl to scrape the changelog
  console.log(
    `[CompetitorIngestion] Would scrape ${changelogUrl} for ${competitorName}`
  );

  // Return 0 for now - actual scraping would be implemented with Firecrawl
  return 0;
}

/**
 * Creates a competitor event from raw content
 */
export async function createCompetitorEvent(
  competitorId: string,
  projectId: string,
  rawContent: {
    title: string;
    content: string;
    url?: string;
    date?: string;
  }
): Promise<CompetitorEvent> {
  const supabase = await createServerClient();

  try {
    // Get competitor name for context
    const { data: competitor } = await supabase
      .from('competitors')
      .select('name')
      .eq('id', competitorId)
      .single();

    if (!competitor) {
      throw new Error('Competitor not found');
    }

    // Use GPT-4o to summarize and classify the event
    const analysis = await summarizeCompetitorEvent(
      competitor.name,
      rawContent.url || '',
      rawContent.content
    );

    // Validate the analysis
    const validated = CompetitorEventSchema.parse(analysis);

    // Generate embedding for semantic search
    const embedding = await generateEmbedding(
      `${validated.event_title}\n\n${validated.event_summary}`
    );

    // Create the event in the database
    const { data: event, error } = await supabase
      .from('competitor_events')
      .insert({
        project_id: projectId,
        competitor_id: competitorId,
        event_type: validated.event_type,
        event_title: validated.event_title,
        event_summary: validated.event_summary,
        event_date: validated.event_date,
        source_url: rawContent.url || null,
        source_type: validated.source_type || null,
        impact_assessment: validated.impact_assessment,
        strategic_implications: validated.strategic_implications,
        embedding: embedding,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return event as CompetitorEvent;
  } catch (error) {
    console.error('[createCompetitorEvent] Error:', error);
    throw error;
  }
}

/**
 * Generates OpenAI embedding for semantic search
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('[generateEmbedding] Error:', error);
    throw error;
  }
}

/**
 * Searches competitor events by semantic similarity
 */
export async function searchCompetitorEventsBySimilarity(
  queryText: string,
  projectId: string,
  limit: number = 10
): Promise<Array<CompetitorEvent & { similarity: number }>> {
  const supabase = await createServerClient();

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText);

    // Use the database function for similarity search
    const { data, error } = await supabase.rpc(
      'search_competitor_events_by_similarity',
      {
        p_embedding: queryEmbedding,
        p_project_id: projectId,
        p_limit: limit,
      }
    );

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[searchCompetitorEventsBySimilarity] Error:', error);
    throw error;
  }
}
