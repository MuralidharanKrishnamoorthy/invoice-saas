
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS reminder_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS reminders_paused_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pause_reason TEXT;

UPDATE invoices SET reminder_status = 'active' WHERE reminder_status IS NULL;
