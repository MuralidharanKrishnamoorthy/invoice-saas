-- Add late_fee to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS late_fee DECIMAL(10, 2) DEFAULT 0;
