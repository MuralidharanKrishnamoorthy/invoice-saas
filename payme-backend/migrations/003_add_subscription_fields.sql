-- Add subscription and usage tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free'; -- 'active', 'past_due', 'canceled', 'free'
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type TEXT; -- 'pro', 'business'
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_email_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_email_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();
