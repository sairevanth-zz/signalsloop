import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOpenAI } from '@/lib/openai-client';

// Lazy getter for Supabase client to avoid build-time initialization
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Learning {
  learning_type: 'insight' | 'recommendation' | 'mistake' | 'success';
  title: string;
  description: string;
  impact_score: number;
  tags: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const experimentId = params.id;

    // Fetch experiment with results
    const { data: experimentData, error: fetchError } = await supabase.rpc(
      'get_experiment_full',
      { p_experiment_id: experimentId }
    );

    if (fetchError || !experimentData) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      );
    }

    const experiment = experimentData.experiment;
    const results = experimentData.results || [];

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No results available to analyze' },
        { status: 400 }
      );
    }

    // Extract learnings using AI
    const learnings = await extractLearningsWithAI(experiment, results);

    // Generate embeddings for semantic search
    const embeddingPromises = learnings.map(async (learning) => {
      const embeddingResponse = await getOpenAI().embeddings.create({
        model: 'text-embedding-ada-002',
        input: `${learning.title} ${learning.description}`,
      });
      return embeddingResponse.data[0].embedding;
    });

    const embeddings = await Promise.all(embeddingPromises);

    // Save learnings to database
    const learningsToInsert = learnings.map((learning, idx) => ({
      experiment_id: experimentId,
      learning_type: learning.learning_type,
      title: learning.title,
      description: learning.description,
      impact_score: learning.impact_score,
      tags: learning.tags,
      embedding: embeddings[idx],
    }));

    const { data: insertedLearnings, error: insertError } = await supabase
      .from('experiment_learnings')
      .insert(learningsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting learnings:', insertError);
      return NextResponse.json(
        { error: 'Failed to save learnings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ learnings: insertedLearnings });
  } catch (error) {
    console.error('Error in POST /api/experiments/[id]/learnings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function extractLearningsWithAI(
  experiment: any,
  results: any[]
): Promise<Learning[]> {
  const primaryResults = results.filter(
    (r) => r.metric_name === experiment.primary_metric
  );
  const secondaryResults = results.filter(
    (r) => r.metric_name !== experiment.primary_metric
  );

  const prompt = `You are an experiment analysis expert. Analyze this A/B test and extract key learnings.

EXPERIMENT:
Name: ${experiment.name}
Hypothesis: ${experiment.hypothesis}
Expected Outcome: ${experiment.expected_outcome}
Primary Metric: ${experiment.primary_metric}

RESULTS:
Primary Metric Results:
${JSON.stringify(primaryResults, null, 2)}

Secondary Metrics Results:
${JSON.stringify(secondaryResults, null, 2)}

Please extract 4-8 learnings from this experiment. For each learning, provide:
1. learning_type: "insight" (data-driven observation), "recommendation" (actionable next step), "mistake" (what went wrong), or "success" (what worked well)
2. title: A concise title (5-10 words)
3. description: 2-3 sentence detailed explanation
4. impact_score: 1-10 rating of how impactful this learning is
5. tags: 2-4 relevant tags (e.g., "conversion", "ux", "targeting", "metrics")

Focus on:
- Statistical significance and what it means
- Unexpected findings
- Actionable recommendations for future experiments
- Technical or methodological improvements
- User behavior insights

Return ONLY a JSON array of learnings, no other text.`;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert at analyzing A/B test results and extracting actionable learnings. Always return valid JSON arrays.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content || '[]';

  try {
    const learnings = JSON.parse(content);
    return learnings;
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse learnings from AI response');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabase();
    const experimentId = params.id;

    const { data, error } = await supabase
      .from('experiment_learnings')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('impact_score', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch learnings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ learnings: data });
  } catch (error) {
    console.error('Error in GET /api/experiments/[id]/learnings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
