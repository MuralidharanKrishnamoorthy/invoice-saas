

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

UPDATE invoices SET currency = 'USD' WHERE currency IS NULL;

COMMENT ON COLUMN invoices.currency IS 'Currency code (USD, INR, EUR, GBP, etc.)';
