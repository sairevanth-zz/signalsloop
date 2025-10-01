import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { project_id, board_id, title, description, author_name, author_email } = req.body;

    // Validate required fields
    if (!project_id || !board_id || !title || !author_name) {
      return res.status(400).json({
        error: 'Missing required fields: project_id, board_id, title, author_name'
      });
    }

    // Check post limits for free accounts
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('plan')
      .eq('id', project_id)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      return res.status(500).json({ error: 'Failed to validate project' });
    }

    // Enforce 50 post limit for free accounts
    if (projectData.plan === 'free') {
      const { data: existingPosts, error: countError } = await supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .eq('project_id', project_id);

      if (!countError && existingPosts && existingPosts.length >= 50) {
        return res.status(403).json({
          error: 'Free accounts are limited to 50 posts. Upgrade to Pro for unlimited posts.'
        });
      }
    }

    // Create the post
    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        project_id,
        board_id,
        title: title.trim(),
        description: description?.trim() || null,
        author_name: author_name.trim(),
        author_email: author_email?.trim() || null,
        status: 'open',
        category: null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating post:', insertError);
      return res.status(500).json({ error: 'Failed to create post' });
    }

    return res.status(200).json({
      postId: newPost.id,
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('Error in posts API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
