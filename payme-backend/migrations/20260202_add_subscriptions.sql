-- Add subscription columns to users table for Razorpay
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_tier TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days';
ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;

-- Update existing column if needed or ensure defaults
ALTER TABLE users ALTER COLUMN subscription_status SET DEFAULT 'trial';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_trial_end ON users(trial_end);
