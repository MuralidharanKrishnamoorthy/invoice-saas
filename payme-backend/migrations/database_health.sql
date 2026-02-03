-- PayMe.ai Database Health & Sync Script
-- Run this in your Supabase SQL Editor to ensure all columns and functions exist.

-- 1. Ensure lifetime_invoices column exists on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_invoices INT DEFAULT 0;

-- 2. Ensure plan_type column exists (replaces plan_tier)
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';

-- 3. Create or Update the increment_lifetime_invoices RPC function
-- This allows safe, concurrent incrementing of the invoice count
CREATE OR REPLACE FUNCTION increment_lifetime_invoices(row_id UUID, val INT)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET lifetime_invoices = COALESCE(lifetime_invoices, 0) + val
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure invoices table has currency column
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

-- 5. Backfill any NULL lifetime_invoices
UPDATE users SET lifetime_invoices = 0 WHERE lifetime_invoices IS NULL;

-- 6. Verify and Fix any inconsistent plan_type values
UPDATE users SET plan_type = 'free' WHERE plan_type IS NULL OR plan_type = '';

-- 7. Verification Queries (Run these to see current status)
-- SELECT id, email, lifetime_invoices, plan_type FROM users;
-- SELECT COUNT(*) FROM invoices WHERE user_id = 'YOUR_USER_ID_HERE';
