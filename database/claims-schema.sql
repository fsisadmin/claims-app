-- Claims table schema
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- References
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

    -- Core Claim Info
    claim_number TEXT NOT NULL,
    claimant TEXT,
    coverage TEXT, -- General Liability, Property, etc.
    property_name TEXT,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'PENDING', 'DENIED')),

    -- Dates
    loss_date DATE,
    report_date DATE,
    closed_date DATE,

    -- Policy Info
    policy_number TEXT,
    tpa_claim_number TEXT,

    -- Description
    loss_description TEXT,

    -- Financial
    total_incurred DECIMAL(15, 2) DEFAULT 0,
    total_paid DECIMAL(15, 2) DEFAULT 0,
    total_reserved DECIMAL(15, 2) DEFAULT 0,
    deductible DECIMAL(15, 2),
    sir DECIMAL(15, 2), -- Self-Insured Retention

    -- Additional Details
    adjuster_name TEXT,
    adjuster_email TEXT,
    adjuster_phone TEXT,
    attorney_name TEXT,
    attorney_firm TEXT,

    -- Categorization
    claim_type TEXT, -- Bodily Injury, Property Damage, etc.
    cause_of_loss TEXT,

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_claims_organization_id ON claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_claims_client_id ON claims(client_id);
CREATE INDEX IF NOT EXISTS idx_claims_location_id ON claims(location_id);
CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_loss_date ON claims(loss_date DESC);
CREATE INDEX IF NOT EXISTS idx_claims_report_date ON claims(report_date DESC);

-- Enable Row Level Security
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if they exist)
DROP POLICY IF EXISTS "Users can view claims from their organization" ON claims;
DROP POLICY IF EXISTS "Users can insert claims for their organization" ON claims;
DROP POLICY IF EXISTS "Users can update claims from their organization" ON claims;
DROP POLICY IF EXISTS "Users can delete claims from their organization" ON claims;

CREATE POLICY "Users can view claims from their organization"
    ON claims FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert claims for their organization"
    ON claims FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update claims from their organization"
    ON claims FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete claims from their organization"
    ON claims FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS claims_updated_at ON claims;
CREATE TRIGGER claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_claims_updated_at();
