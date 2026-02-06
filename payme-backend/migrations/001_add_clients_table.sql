

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    address TEXT,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    total_invoices INTEGER DEFAULT 0,
    total_amount_due DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, email)
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
BEGIN

    UPDATE clients
    SET
        total_invoices = (
            SELECT COUNT(*)
            FROM invoices
            WHERE client_id = NEW.client_id AND status != 'paid'
        ),
        total_amount_due = (
            SELECT COALESCE(SUM(amount), 0)
            FROM invoices
            WHERE client_id = NEW.client_id AND status != 'paid'
        )
    WHERE id = NEW.client_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_client_stats();

INSERT INTO clients (user_id, name, email, company)
SELECT DISTINCT
    i.user_id,
    i.client_name,
    i.client_email,
    i.client_name
FROM invoices i
WHERE NOT EXISTS (
    SELECT 1 FROM clients c
    WHERE c.user_id = i.user_id
    AND c.email = i.client_email
)
ON CONFLICT (user_id, email) DO NOTHING;

UPDATE invoices i
SET client_id = c.id
FROM clients c
WHERE i.user_id = c.user_id
AND i.client_email = c.email
AND i.client_id IS NULL;
