import { complete } from '@/lib/ai/router';
import { getServiceRoleClient } from '@/lib/supabase-singleton';

export type ReleaseTriggerSource = 'api' | 'agent' | 'manual';

export interface ReleaseGenerationOptions {
  lookbackDays?: number;
  maxFeatures?: number;
  triggeredBy?: ReleaseTriggerSource;
  includeSuggestionIds?: string[];
  reuseDraft?: boolean;
}

export interface ReleaseGenerationResult {
  success: boolean;
  message?: string;
  release?: any;
  entries?: any[];
  communications?: {
    email?: string;
    blog?: string;
  };
  detectedFeatures?: number;
  skippedSuggestions?: string[];
  rawModelOutput?: string;
}

interface FeatureContext {
  id: string;
  title: string;
  themeId?: string;
  priority: string;
  priorityScore?: number;
  summary?: string;
  whyMatters?: string;
  recommendation?: string;
  feedbackNotes: {
    id: string;
    text: string;
    sentiment?: number;
    votes?: number;
  }[];
  userStories: {
    id: string;
    title: string;
    full_story?: string;
    story_points?: number;
    sprint_status?: string;
  }[];
  impactNotes: string[];
}

interface ParsedReleasePlan {
  release_title: string;
  excerpt?: string;
  release_type?: string;
  tags?: string[];
  version?: string;
  entries: Array<{
    title: string;
    summary?: string;
    entry_type?: string;
    priority?: string;
    feedback_ids?: string[];
  }>;
  customer_email?: string;
  blog_post?: string;
  release_markdown?: string;
}

const SYSTEM_PROMPT = `
You are the Release Planning Agent for SignalsLoop. Create concise, customer-ready release notes from product signals.
Return a valid JSON object with this exact shape:
{
  "release_title": "string",
  "excerpt": "1-2 sentence summary",
  "release_type": "major|minor|patch|hotfix",
  "tags": ["string"],
  "version": "optional version",
  "entries": [
    {
      "title": "Feature title",
      "summary": "What changed and why it matters",
      "entry_type": "feature|improvement|fix|security|breaking",
      "priority": "low|medium|high|critical",
      "feedback_ids": ["optional feedback ids to link"]
    }
  ],
  "customer_email": "short customer email draft in markdown",
  "blog_post": "concise blog-style release note in markdown",
  "release_markdown": "full markdown for the release detail page"
}
Do not include any explanations outside the JSON.
`;

const DEFAULT_LOOKBACK_DAYS = 30;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80) || `release-${Date.now()}`;
}

function normalizeEntryType(entryType?: string): 'feature' | 'improvement' | 'fix' | 'security' | 'breaking' {
  if (!entryType) return 'feature';
  const value = entryType.toLowerCase();
  if (['feature', 'improvement', 'fix', 'security', 'breaking'].includes(value)) {
    return value as any;
  }
  return 'feature';
}

function normalizePriority(priority?: string): 'low' | 'medium' | 'high' | 'critical' {
  if (!priority) return 'medium';
  const value = priority.toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(value)) {
    return value as any;
  }
  return 'medium';
}

function normalizeReleaseType(releaseType?: string): 'major' | 'minor' | 'patch' | 'hotfix' {
  if (!releaseType) return 'minor';
  const value = releaseType.toLowerCase();
  if (['major', 'minor', 'patch', 'hotfix'].includes(value)) {
    return value as any;
  }
  return 'minor';
}

function buildFallbackMarkdown(title: string, excerpt: string, entries: ParsedReleasePlan['entries']): string {
  const lines = [`# ${title}`, '', excerpt || 'Highlights from completed work.', ''];
  if (entries.length > 0) {
    lines.push('## What shipped');
    entries.forEach((entry) => {
      lines.push(`- **${entry.title}** — ${entry.summary || 'Update included in this release.'}`);
    });
  }
  return lines.join('\n');
}

async function ensureUniqueSlug(projectId: string, desiredSlug: string): Promise<string> {
  const supabase = getServiceRoleClient();
  let candidate = desiredSlug;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from('changelog_releases')
      .select('id')
      .eq('project_id', projectId)
      .eq('slug', candidate)
      .limit(1);

    if (!data || data.length === 0) {
      return candidate;
    }

    candidate = `${desiredSlug}-${counter}`;
    counter += 1;
  }
}

function parseModelOutput(content: string, fallbackTitle: string): ParsedReleasePlan {
  try {
    const parsed = JSON.parse(content) as ParsedReleasePlan;
    const releaseTitle = parsed.release_title?.trim() || fallbackTitle;
    return {
      ...parsed,
      release_title: releaseTitle,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch (error) {
    return {
      release_title: fallbackTitle,
      entries: [],
    };
  }
}

function buildPrompt(features: FeatureContext[]): string {
  const featureBlocks = features.map((feature, index) => {
    const feedback = feature.feedbackNotes
      .slice(0, 3)
      .map((f) => `• ${f.text}${f.votes ? ` (${f.votes} votes)` : ''}${typeof f.sentiment === 'number' ? ` | sentiment ${f.sentiment.toFixed(2)}` : ''}`)
      .join('\n') || '• No direct feedback linked';

    const stories = feature.userStories
      .slice(0, 2)
      .map((story) => `• ${story.title}${story.story_points ? ` (${story.story_points} pts)` : ''}`)
      .join('\n') || '• No user stories linked';

    const impact = feature.impactNotes.length > 0 ? feature.impactNotes.map((note) => `• ${note}`).join('\n') : '• Impact signals not yet captured';

    return [
      `Feature ${index + 1}: ${feature.title}`,
      `Priority: ${feature.priority}${feature.priorityScore ? ` (${feature.priorityScore.toFixed(1)})` : ''}`,
      `Why now: ${feature.whyMatters || feature.summary || 'Completed feature ready for release.'}`,
      `Recommendation: ${feature.recommendation || 'Align release note with customer value.'}`,
      `Feedback highlights:\n${feedback}`,
      `User stories:\n${stories}`,
      `Impact signals:\n${impact}`,
    ].join('\n');
  });

  return [
    'Use the provided completed features to draft concise release notes.',
    'Focus on customer outcomes and clarity. Keep marketing claims grounded in the supplied data.',
    'Features:',
    featureBlocks.join('\n\n'),
  ].join('\n\n');
}

async function fetchExistingReleasedSuggestionIds(projectId: string): Promise<Set<string>> {
  const supabase = getServiceRoleClient();
  const released = new Set<string>();

  const { data } = await supabase
    .from('changelog_releases')
    .select('metadata')
    .eq('project_id', projectId);

  (data || []).forEach((release: any) => {
    const ids = release?.metadata?.source_suggestions;
    if (Array.isArray(ids)) {
      ids.forEach((id: string) => released.add(id));
    }
  });

  return released;
}

async function fetchFeatureContext(
  projectId: string,
  options: ReleaseGenerationOptions
): Promise<FeatureContext[]> {
  const supabase = getServiceRoleClient();
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const updatedAfter = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const alreadyReleased = await fetchExistingReleasedSuggestionIds(projectId);

  let query = supabase
    .from('roadmap_suggestions')
    .select(
      `
        id,
        project_id,
        theme_id,
        priority_level,
        priority_score,
        status,
        reasoning_text,
        why_matters,
        recommendation_text,
        implementation_strategy,
        risks_dependencies,
        updated_at,
        themes (
          id,
          theme_name,
          frequency,
          avg_sentiment
        )
      `
    )
    .eq('project_id', projectId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false });

  if (options.includeSuggestionIds && options.includeSuggestionIds.length > 0) {
    query = query.in('id', options.includeSuggestionIds);
  } else {
    query = query.gte('updated_at', updatedAfter);
  }

  if (options.maxFeatures) {
    query = query.limit(options.maxFeatures);
  } else {
    query = query.limit(6);
  }

  const { data: suggestions, error } = await query;

  if (error || !suggestions) {
    console.error('[Release Planner] Failed to load completed suggestions:', error);
    return [];
  }

  const filtered = suggestions.filter((suggestion: any) => !alreadyReleased.has(suggestion.id));

  const featureContexts = await Promise.all(
    filtered.map(async (suggestion: any) => {
      const themeId = suggestion.theme_id;

      const [feedbackRes, storiesRes, impactRes] = await Promise.all([
        supabase
          .from('feedback_themes')
          .select(
            `
            feedback_id,
            confidence,
            posts:feedback_id (
              id,
              title,
              description,
              content,
              vote_count,
              sentiment_analysis ( sentiment_score )
            )
          `
          )
          .eq('theme_id', themeId)
          .order('confidence', { ascending: false })
          .limit(5),
        supabase
          .from('user_stories')
          .select('id, title, full_story, story_points, sprint_status')
          .eq('project_id', projectId)
          .eq('theme_id', themeId)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('feature_impact_history')
          .select('feature_name, post_adoption_rate, sentiment_impact, churn_impact, success_rating')
          .eq('project_id', projectId)
          .eq('suggestion_id', suggestion.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      const feedbackNotes =
        feedbackRes.data?.map((item: any) => {
          const post = item.posts;
          return {
            id: post?.id,
            text: post?.description || post?.content || post?.title || 'Customer request',
            sentiment: post?.sentiment_analysis?.[0]?.sentiment_score,
            votes: post?.vote_count,
          };
        }) || [];

      const userStories = storiesRes.data || [];

      const impactNotes: string[] = [];
      const impactRecord = impactRes.data?.[0];
      if (impactRecord?.post_adoption_rate) {
        impactNotes.push(`Adoption rate: ${(impactRecord.post_adoption_rate * 100).toFixed(1)}%`);
      }
      if (impactRecord?.sentiment_impact) {
        impactNotes.push(`Sentiment change: ${impactRecord.sentiment_impact.toFixed(2)}`);
      }
      if (impactRecord?.churn_impact) {
        impactNotes.push(`Churn improvement: ${impactRecord.churn_impact.toFixed(4)}`);
      }
      if (impactRecord?.success_rating) {
        impactNotes.push(`Success rating: ${impactRecord.success_rating}/5 from retrospective`);
      }

      const title = suggestion.themes?.theme_name || 'Completed Feature';

      const whyMatters = suggestion.why_matters || suggestion.reasoning_text;
      const recommendation = suggestion.recommendation_text || suggestion.implementation_strategy;

      return {
        id: suggestion.id,
        title,
        themeId,
        priority: suggestion.priority_level || 'medium',
        priorityScore: suggestion.priority_score,
        summary: suggestion.reasoning_text,
        whyMatters,
        recommendation,
        feedbackNotes,
        userStories,
        impactNotes,
      } as FeatureContext;
    })
  );

  return featureContexts;
}

export async function generateAutoReleaseNotes(
  projectId: string,
  options: ReleaseGenerationOptions = {}
): Promise<ReleaseGenerationResult> {
  const supabase = getServiceRoleClient();
  const features = await fetchFeatureContext(projectId, options);

  if (features.length === 0) {
    return {
      success: false,
      message: 'No completed roadmap items found to generate release notes.',
      detectedFeatures: 0,
      skippedSuggestions: [],
    };
  }

  const prompt = buildPrompt(features);

  const completion = await complete({
    type: 'generation',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    options: { temperature: 0.5, maxTokens: 1200 },
    priority: 'high',
  });

  const fallbackTitle = `Release - ${new Date().toISOString().slice(0, 10)}`;
  const parsed = parseModelOutput(completion.content || '', fallbackTitle);
  const entries = parsed.entries && parsed.entries.length > 0
    ? parsed.entries
    : features.map((feature) => ({
        title: feature.title,
        summary: feature.whyMatters || feature.summary || 'Completed feature.',
        entry_type: 'feature',
        priority: feature.priority,
      }));

  const releaseMarkdown = parsed.release_markdown || buildFallbackMarkdown(parsed.release_title, parsed.excerpt || '', entries);

  const metadata = {
    auto_generated: true,
    auto_generated_at: new Date().toISOString(),
    source_suggestions: features.map((f) => f.id),
    feedback_sample_count: features.reduce((sum, f) => sum + f.feedbackNotes.length, 0),
    entry_sources: features.map((f) => ({
      suggestion_id: f.id,
      feedback_ids: f.feedbackNotes.map((fb) => fb.id).filter(Boolean),
      user_story_ids: f.userStories.map((s) => s.id).filter(Boolean),
    })),
    triggered_by: options.triggeredBy || 'manual',
    model: completion.model,
    provider: completion.provider,
    customer_email_draft: parsed.customer_email,
    customer_blog_draft: parsed.blog_post,
  };

  const reuseDraft = options.reuseDraft !== false;
  let existingDraft: any = null;

  if (reuseDraft) {
    const { data } = await supabase
      .from('changelog_releases')
      .select('id, slug, metadata')
      .eq('project_id', projectId)
      .eq('is_published', false)
      .contains('metadata', { auto_generated: true })
      .order('created_at', { ascending: false })
      .limit(1);

    existingDraft = data && data.length > 0 ? data[0] : null;
  }

  const desiredSlug = slugify(parsed.release_title);
  const slug = existingDraft?.slug || (await ensureUniqueSlug(projectId, desiredSlug));
  const releaseType = normalizeReleaseType(parsed.release_type);
  const excerpt = parsed.excerpt || (entries[0]?.summary || '').slice(0, 200);

  let releaseRecord: any = null;

  if (existingDraft) {
    const { data: updated, error: updateError } = await supabase
      .from('changelog_releases')
      .update({
        title: parsed.release_title,
        slug,
        content: releaseMarkdown,
        excerpt,
        release_type: releaseType,
        tags: parsed.tags,
        version: parsed.version,
        metadata: { ...(existingDraft.metadata || {}), ...metadata },
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingDraft.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Release Planner] Failed to update auto draft:', updateError);
      return { success: false, message: 'Failed to update release draft', detectedFeatures: features.length };
    }

    releaseRecord = updated;

    // Replace entries for the existing draft
    await supabase.from('changelog_entries').delete().eq('release_id', existingDraft.id);
  } else {
    const { data: created, error: insertError } = await supabase
      .from('changelog_releases')
      .insert({
        project_id: projectId,
        title: parsed.release_title,
        slug,
        content: releaseMarkdown,
        excerpt,
        release_type: releaseType,
        tags: parsed.tags,
        version: parsed.version,
        is_published: false,
        is_featured: false,
        metadata,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Release Planner] Failed to create release draft:', insertError);
      return { success: false, message: 'Failed to create release draft', detectedFeatures: features.length };
    }

    releaseRecord = created;
  }

  // Insert changelog entries
  let createdEntries: any[] = [];
  if (entries.length > 0) {
    const entryPayload = entries.map((entry, index) => ({
      release_id: releaseRecord.id,
      title: entry.title || `Update ${index + 1}`,
      description: entry.summary || 'Update included in this release.',
      entry_type: normalizeEntryType(entry.entry_type),
      priority: normalizePriority(entry.priority),
      order_index: index,
    }));

    const { data: insertedEntries, error: entryError } = await supabase
      .from('changelog_entries')
      .insert(entryPayload)
      .select();

    if (entryError) {
      console.error('[Release Planner] Failed to create release entries:', entryError);
    } else {
      createdEntries = insertedEntries || [];
    }
  }

  // Link feedback to entries for traceability
  const feedbackLinks =
    createdEntries.flatMap((entry, index) => {
      const source = metadata.entry_sources[index];
      const feedbackIds: string[] = source?.feedback_ids || [];
      return feedbackIds.slice(0, 5).map((postId) => ({
        release_id: releaseRecord.id,
        entry_id: entry.id,
        post_id: postId,
      }));
    }) || [];

  if (feedbackLinks.length > 0) {
    const { error: linkError } = await supabase
      .from('changelog_feedback_links')
      .upsert(feedbackLinks, { onConflict: 'release_id,post_id' });

    if (linkError) {
      console.error('[Release Planner] Failed to link feedback to release entries:', linkError);
    }
  }

  return {
    success: true,
    release: releaseRecord,
    entries: createdEntries,
    communications: {
      email: parsed.customer_email,
      blog: parsed.blog_post,
    },
    detectedFeatures: features.length,
    skippedSuggestions: [],
    rawModelOutput: completion.content,
  };
}
