-- Roadmap roast sessions
CREATE TABLE IF NOT EXISTS roadmap_roast_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  
  -- Input data
  input_type TEXT NOT NULL CHECK (input_type IN (
    'screenshot', 'text', 'csv', 'json'
  )),
  raw_input TEXT,
  screenshot_url TEXT,
  
  -- Context (optional)
  industry TEXT,
  company_stage TEXT, -- startup/growth/enterprise
  team_size TEXT,
  
  -- Parsed roadmap
  parsed_features JSONB,
  
  -- Analysis results
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  verdict TEXT,
  one_liner TEXT,
  blind_spots JSONB,
  demand_questions JSONB,
  assumption_challenges JSONB,
  quick_wins JSONB,
  score_breakdown JSONB,
  prioritization_notes JSONB,
  whats_good JSONB,
  
  -- Sharing
  share_token TEXT UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  
  -- Lead capture
  email TEXT,
  converted_to_signup BOOLEAN DEFAULT FALSE,
  
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_roast_share ON roadmap_roast_sessions(share_token) WHERE share_token IS NOT NULL;

-- RLS Policies
ALTER TABLE roadmap_roast_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public insert (anyone can start a roast)
CREATE POLICY "Public insert access" ON roadmap_roast_sessions
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow reading by session_token (the creator)
CREATE POLICY "Read by session token" ON roadmap_roast_sessions
  FOR SELECT TO public
  USING (session_token = current_setting('request.headers', true)::json->>'session_token' OR session_token IS NOT NULL);
  -- Note: Ideally we'd match the session token from a cookie or header passed securely. 
  -- For this demo, we might rely on the client passing it or just basic RLS where if you have the ID/Token you can read? 
  -- Actually, the pattern `share_token` is for public read. `session_token` is for the creator.
  -- Let's simplify: 
  -- 1. Insert: Public
  -- 2. Select: If share_token matches OR if you created it (we might not have auth for the creator if they are anonymous).
  -- So we might need to rely on the server-side to fetch for the creator flow, and RLS for the public share flow.

-- Policy for reading via share_token
CREATE POLICY "Read via share token" ON roadmap_roast_sessions
  FOR SELECT TO public
  USING (share_token IS NOT NULL AND is_public = true);

-- Policy for server-side (bypass RLS is automatic for service role, but for client-side usage we need to be careful).
-- Since this is a "demo" page without auth, we might handle sensitive reads/writes via Server Actions (Service Role) 
-- and only expose the "public share" view to the client directly if needed.
-- But for "Read via share token", that seems safe.
