

ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_invoices INT DEFAULT 0;

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';

CREATE OR REPLACE FUNCTION increment_lifetime_invoices(row_id UUID, val INT)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET lifetime_invoices = COALESCE(lifetime_invoices, 0) + val
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

UPDATE users SET lifetime_invoices = 0 WHERE lifetime_invoices IS NULL;

UPDATE users SET plan_type = 'free' WHERE plan_type IS NULL OR plan_type = '';

