import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      board_id,
      project_id,
      project_slug,
      title,
      description,
      status = 'open',
      votes,
      author_name,
      author_email,
      created_at
    } = req.body;

    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    if (!normalizedTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const validStatuses = ['open', 'planned', 'in_progress', 'done', 'declined'];
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : 'open';
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const normalizedVotesRaw =
      typeof votes === 'number'
        ? votes
        : typeof votes === 'string' && votes.trim() !== ''
        ? Number.parseInt(votes, 10)
        : 0;
    const normalizedVotes = Number.isFinite(normalizedVotesRaw)
      ? Math.max(0, Math.min(1000, Math.round(normalizedVotesRaw)))
      : 0;

    let resolvedProjectId = typeof project_id === 'string' ? project_id.trim() : project_id ?? undefined;
    if (typeof resolvedProjectId === 'string' && resolvedProjectId.length === 0) {
      resolvedProjectId = undefined;
    }

    let resolvedBoardId = typeof board_id === 'string' ? board_id.trim() : board_id ?? undefined;
    if (typeof resolvedBoardId === 'string' && resolvedBoardId.length === 0) {
      resolvedBoardId = undefined;
    }

    const normalizedProjectSlug = typeof project_slug === 'string' ? project_slug.trim() : undefined;

    if (!resolvedProjectId && normalizedProjectSlug) {
      const { data: projectRecord, error: projectLookupError } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', normalizedProjectSlug)
        .single();

      if (projectLookupError || !projectRecord) {
        return res.status(400).json({ error: 'Invalid project slug provided.' });
      }

      resolvedProjectId = projectRecord.id;
    }

    if (resolvedBoardId && !resolvedProjectId) {
      const { data: boardRecord, error: boardLookupError } = await supabase
        .from('boards')
        .select('project_id')
        .eq('id', resolvedBoardId)
        .single();

      if (boardLookupError || !boardRecord) {
        return res.status(400).json({ error: 'Invalid board_id provided.' });
      }

      resolvedProjectId = boardRecord.project_id;
    }

    if (!resolvedBoardId && resolvedProjectId) {
      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select('id')
        .eq('project_id', resolvedProjectId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (boardsError) {
        console.error('Error resolving board for project:', boardsError);
        return res.status(500).json({ error: 'Failed to resolve board for project' });
      }

      resolvedBoardId = boards?.[0]?.id;

      if (!resolvedBoardId) {
        return res.status(400).json({ error: 'No boards found for the provided project.' });
      }
    }

    if (!resolvedBoardId) {
      return res.status(400).json({ error: 'board_id or project identifier is required' });
    }

    if (!resolvedProjectId) {
      const { data: boardRecord, error: boardLookupError } = await supabase
        .from('boards')
        .select('project_id')
        .eq('id', resolvedBoardId)
        .single();

      if (boardLookupError || !boardRecord) {
        return res.status(400).json({ error: 'Unable to determine project for board' });
      }

      resolvedProjectId = boardRecord.project_id;
    }

    const normalizedDescription = typeof description === 'string' ? description.trim() : '';

    const postData: any = {
      board_id: resolvedBoardId,
      project_id: resolvedProjectId,
      title: normalizedTitle.substring(0, 200),
      description: normalizedDescription.substring(0, 2000),
      status: normalizedStatus,
      vote_count: normalizedVotes
    };

    if (author_name) {
      const trimmedName = String(author_name).trim();
      if (trimmedName) {
        postData.author_name = trimmedName.substring(0, 120);
      }
    }

    if (author_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(author_email)) {
        postData.author_email = String(author_email).trim().toLowerCase();
      }
    }

    if (created_at) {
      const date = new Date(created_at);
      if (!isNaN(date.getTime())) {
        postData.created_at = date.toISOString();
      }
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert([postData])
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return res.status(500).json({ error: 'Failed to create post' });
    }

    res.status(201).json(post);

  } catch (error) {
    console.error('Import post error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
