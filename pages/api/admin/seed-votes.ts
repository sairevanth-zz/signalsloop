import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { postId, count } = req.body;

    if (!postId || !count || count < 1 || count > 1000) {
      return res.status(400).json({ 
        error: 'postId and count (1-1000) are required' 
      });
    }

    // Generate realistic fake votes
    const votes = [];
    for (let i = 0; i < count; i++) {
      // Create unique voter hash for each vote
      const voterHash = createHash('md5')
        .update(`${postId}_seed_${i}_${Date.now()}`)
        .digest('hex');

      // Random timestamp within last 30 days
      const randomDaysAgo = Math.floor(Math.random() * 30);
      const voteDate = new Date();
      voteDate.setDate(voteDate.getDate() - randomDaysAgo);

      votes.push({
        post_id: postId,
        voter_hash: voterHash,
        created_at: voteDate.toISOString()
      });
    }

    // Insert votes in batches of 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < votes.length; i += batchSize) {
      const batch = votes.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('votes')
        .insert(batch);

      if (error) {
        console.error('Error inserting vote batch:', error);
        // Continue with next batch instead of failing completely
        continue;
      }

      insertedCount += batch.length;
    }

    res.status(201).json({ 
      success: true, 
      insertedVotes: insertedCount,
      requestedVotes: count 
    });

  } catch (error) {
    console.error('Seed votes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
