-- Add missing columns to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS secondary_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state VARCHAR(2),
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS producer_name TEXT,
ADD COLUMN IF NOT EXISTS account_manager TEXT,
ADD COLUMN IF NOT EXISTS ams_code TEXT,
ADD COLUMN IF NOT EXISTS client_number TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_clients_city ON clients(city);
CREATE INDEX IF NOT EXISTS idx_clients_state ON clients(state);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_ams_code ON clients(ams_code);
CREATE INDEX IF NOT EXISTS idx_clients_client_number ON clients(client_number);
CREATE INDEX IF NOT EXISTS idx_clients_producer_name ON clients(producer_name);
CREATE INDEX IF NOT EXISTS idx_clients_account_manager ON clients(account_manager);
