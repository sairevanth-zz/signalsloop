-- Competitive intel sessions (no auth required for demo)
CREATE TABLE IF NOT EXISTS competitive_intel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  
  -- Products being analyzed
  user_product_name TEXT,
  competitor_names TEXT[],
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'collecting', 'analyzing', 'completed', 'failed'
  )),
  
  -- Results
  results JSONB,
  
  -- Lead capture
  email TEXT,
  converted_to_signup BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Reviews collected (from any source)
CREATE TABLE IF NOT EXISTS collected_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES competitive_intel_sessions(id) ON DELETE CASCADE,
  
  -- Review data
  product_name TEXT NOT NULL,
  product_name_normalized TEXT NOT NULL,
  review_text TEXT NOT NULL,
  rating DECIMAL(2,1), -- 1.0 to 5.0, nullable if not available
  review_date DATE,
  author TEXT,
  
  -- Source tracking
  source TEXT NOT NULL CHECK (source IN (
    'reddit', 'app_store', 'play_store', 'hacker_news',
    'pasted', 'csv_upload'
  )),
  source_url TEXT,
  
  -- AI-generated
  sentiment DECIMAL(3,2), -- -1.00 to 1.00
  themes TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache for auto-scraped data (24hr TTL)
CREATE TABLE IF NOT EXISTS scrape_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name_normalized TEXT NOT NULL,
  source TEXT NOT NULL,
  reviews JSONB NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  UNIQUE(product_name_normalized, source)
);

CREATE INDEX IF NOT EXISTS idx_collected_reviews_session ON collected_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_collected_reviews_product ON collected_reviews(product_name_normalized);
CREATE INDEX IF NOT EXISTS idx_scrape_cache_lookup ON scrape_cache(product_name_normalized, source);

-- RLS Policies (Public access for demo)
ALTER TABLE competitive_intel_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collected_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert sessions" ON competitive_intel_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select sessions" ON competitive_intel_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public update sessions" ON competitive_intel_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow public insert reviews" ON collected_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select reviews" ON collected_reviews FOR SELECT USING (true);

CREATE POLICY "Allow public insert cache" ON scrape_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select cache" ON scrape_cache FOR SELECT USING (true);
