ALTER TABLE invoices ADD COLUMN IF NOT EXISTS generated_emails JSONB DEFAULT '{}'::jsonb;
