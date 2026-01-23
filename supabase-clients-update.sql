-- Add image_url and state columns to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS state VARCHAR(2);

-- Create index for state lookups
CREATE INDEX IF NOT EXISTS idx_clients_state ON clients(state);
