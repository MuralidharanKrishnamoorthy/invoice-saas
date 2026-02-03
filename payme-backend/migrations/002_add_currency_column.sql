-- Add currency column to invoices table
-- Run this in your Supabase SQL Editor

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

-- Update existing records to have a default currency
UPDATE invoices SET currency = 'USD' WHERE currency IS NULL;

-- Add comment
COMMENT ON COLUMN invoices.currency IS 'Currency code (USD, INR, EUR, GBP, etc.)';
