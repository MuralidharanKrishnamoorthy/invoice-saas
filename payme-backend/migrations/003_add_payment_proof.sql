-- Add payment_proof_url column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
