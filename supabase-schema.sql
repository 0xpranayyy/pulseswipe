-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet TEXT NOT NULL,
  market_id TEXT NOT NULL,
  question TEXT NOT NULL,
  slug TEXT,
  image TEXT,
  probability_at_save REAL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wallet, market_id)
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet TEXT NOT NULL,
  type TEXT NOT NULL,
  market_id TEXT,
  question TEXT,
  amount REAL,
  side TEXT,
  price REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS preferences (
  wallet TEXT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_watchlist_wallet ON watchlist(wallet);
CREATE INDEX IF NOT EXISTS idx_activity_wallet ON activity(wallet);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);

-- Row Level Security (RLS) — users can only access their own data
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (anon key) — in production, add proper auth
CREATE POLICY "Allow all on watchlist" ON watchlist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activity" ON activity FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on preferences" ON preferences FOR ALL USING (true) WITH CHECK (true);
