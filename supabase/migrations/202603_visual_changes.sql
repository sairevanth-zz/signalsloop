-- =====================================================
-- Visual Changes Extension for Experiments
-- Adds DOM change storage for no-code A/B testing
-- =====================================================

-- Add visual_changes column to experiment_variants if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiment_variants' AND column_name = 'visual_changes') THEN
    ALTER TABLE experiment_variants ADD COLUMN visual_changes JSONB DEFAULT '[]';
    COMMENT ON COLUMN experiment_variants.visual_changes IS 'Array of DOM changes: [{selector, action, property, value}]';
  END IF;
END $$;

-- Add page_url column to track which page the changes apply to
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiment_variants' AND column_name = 'page_url') THEN
    ALTER TABLE experiment_variants ADD COLUMN page_url TEXT;
  END IF;
END $$;

-- Add Bayesian stats columns to experiment_results
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiment_results' AND column_name = 'probability_to_beat_control') THEN
    ALTER TABLE experiment_results ADD COLUMN probability_to_beat_control DECIMAL(10, 6) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiment_results' AND column_name = 'expected_loss') THEN
    ALTER TABLE experiment_results ADD COLUMN expected_loss DECIMAL(10, 6) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiment_results' AND column_name = 'credible_interval_low') THEN
    ALTER TABLE experiment_results ADD COLUMN credible_interval_low DECIMAL(10, 6) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiment_results' AND column_name = 'credible_interval_high') THEN
    ALTER TABLE experiment_results ADD COLUMN credible_interval_high DECIMAL(10, 6) DEFAULT 0;
  END IF;
END $$;

-- Add metadata to experiments table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'experiments' AND column_name = 'sdk_key') THEN
    ALTER TABLE experiments ADD COLUMN sdk_key TEXT;
  END IF;
END $$;

-- Generate SDK key for experiments on insert
CREATE OR REPLACE FUNCTION generate_experiment_sdk_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sdk_key IS NULL THEN
    NEW.sdk_key := 'exp_' || encode(gen_random_bytes(8), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_experiment_sdk_key') THEN
    CREATE TRIGGER set_experiment_sdk_key
      BEFORE INSERT ON experiments
      FOR EACH ROW
      EXECUTE FUNCTION generate_experiment_sdk_key();
  END IF;
END $$;
