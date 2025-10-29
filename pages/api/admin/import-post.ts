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
      title,
      description,
      status = 'open',
      author_name,
      author_email,
      created_at
    } = req.body;

    // Validate required fields
    if (!board_id || !title) {
      return res.status(400).json({ error: 'board_id and title are required' });
    }

    // Validate status
    const validStatuses = ['open', 'planned', 'in_progress', 'done', 'declined'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Create post
    const postData: any = {
      board_id,
      title: title.substring(0, 200), // Limit title length
      status,
    };

    if (description) {
      postData.description = description.substring(0, 2000); // Limit description
    }

    if (author_name) {
      const trimmedName = String(author_name).trim();
      if (trimmedName) {
        postData.author_name = trimmedName.substring(0, 120);
      }
    }

    if (author_email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(author_email)) {
        postData.author_email = String(author_email).trim().toLowerCase();
      }
    }

    if (created_at) {
      // Validate and use provided date
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
