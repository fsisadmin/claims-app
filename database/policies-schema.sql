-- Policies Schema
-- Policies belong to clients, and locations are linked to policies

-- Create policies table
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

    -- Policy identification
    policy_number VARCHAR(100) NOT NULL,
    policy_type VARCHAR(100), -- Property, General Liability, Auto, Workers Comp, Umbrella, etc.

    -- Carrier/Insurer info
    carrier VARCHAR(255),
    carrier_policy_number VARCHAR(100),

    -- Dates
    effective_date DATE,
    expiration_date DATE,

    -- Financial
    premium DECIMAL(15, 2),
    deductible DECIMAL(15, 2),
    total_insured_value DECIMAL(15, 2),

    -- Coverage limits
    per_occurrence_limit DECIMAL(15, 2),
    aggregate_limit DECIMAL(15, 2),

    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending', 'renewed')),

    -- Notes
    notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    modified_by UUID REFERENCES auth.users(id)
);

-- Create policy_locations junction table (links locations to policies)
CREATE TABLE IF NOT EXISTS policy_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Location-specific coverage details for this policy
    location_tiv DECIMAL(15, 2), -- Total Insured Value for this location on this policy
    location_premium DECIMAL(15, 2),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate links
    UNIQUE(policy_id, location_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_policies_client_id ON policies(client_id);
CREATE INDEX IF NOT EXISTS idx_policies_organization_id ON policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_expiration_date ON policies(expiration_date);
CREATE INDEX IF NOT EXISTS idx_policy_locations_policy_id ON policy_locations(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_locations_location_id ON policy_locations(location_id);

-- Enable RLS
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for policies table
CREATE POLICY "Users can view policies in their organization"
    ON policies FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert policies in their organization"
    ON policies FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update policies in their organization"
    ON policies FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can delete policies in their organization"
    ON policies FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- RLS Policies for policy_locations table
CREATE POLICY "Users can view policy_locations in their organization"
    ON policy_locations FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert policy_locations in their organization"
    ON policy_locations FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update policy_locations in their organization"
    ON policy_locations FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete policy_locations in their organization"
    ON policy_locations FOR DELETE
    USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    ));

-- Trigger to update updated_at on policies
CREATE OR REPLACE FUNCTION update_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER policies_updated_at
    BEFORE UPDATE ON policies
    FOR EACH ROW
    EXECUTE FUNCTION update_policies_updated_at();
