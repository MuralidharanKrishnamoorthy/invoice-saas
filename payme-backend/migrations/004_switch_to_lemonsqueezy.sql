-- Add Lemon Squeezy ID and remove Stripe ID (if exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id TEXT;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id;
