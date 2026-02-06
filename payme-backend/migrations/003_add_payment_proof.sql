
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
