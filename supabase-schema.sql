-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  ams_code VARCHAR(50),
  client_number VARCHAR(50),
  producer_name VARCHAR(255),
  account_manager VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for search performance
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_ams_code ON clients(ams_code);

-- Insert sample data
INSERT INTO clients (name, ams_code, client_number, producer_name, account_manager) VALUES
('Ally Capital Group LLC', 'AMS', '00002718', 'Matthew Harrell', 'Sean O''Hallaron'),
('Ancient City Capital', 'AMS', '00003739', 'Jered Kahhan', 'Nichole Webster'),
('AVS Communities', 'AMS', '00003954', 'Jered Kahhan', 'Rasha Jones'),
('Fairstead', 'AMS', NULL, NULL, NULL),
('Fitch Irick', 'AMS', NULL, NULL, NULL),
('Fresh Properties', 'AMS', NULL, NULL, NULL);
