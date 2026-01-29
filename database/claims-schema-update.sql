-- Claims schema update
-- Run this in the Supabase SQL Editor to add new fields

-- Add new columns to claims table
ALTER TABLE claims ADD COLUMN IF NOT EXISTS manually_entered_claim BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS loss_summary_claim BOOLEAN DEFAULT FALSE;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS policy_name TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS policy_named_insured TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS wholesaler TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS carrier_policy_number TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS carrier_policy_effective_date DATE;

-- Create claim financials table for detailed financial tracking
CREATE TABLE IF NOT EXISTS claim_financials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Category (Bodily Injury, Expense, Property Damage, Legal, Other, Recovery, Subrogation)
    category TEXT NOT NULL CHECK (category IN ('Bodily Injury', 'Expense', 'Property Damage', 'Legal', 'Other', 'Recovery', 'Subrogation')),

    -- Financial amounts
    reserves DECIMAL(15, 2) DEFAULT 0,
    paid DECIMAL(15, 2) DEFAULT 0,
    outstanding DECIMAL(15, 2) DEFAULT 0,
    incurred DECIMAL(15, 2) DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one record per claim per category
    UNIQUE(claim_id, category)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_claim_financials_claim_id ON claim_financials(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_financials_organization_id ON claim_financials(organization_id);

-- Enable Row Level Security
ALTER TABLE claim_financials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view claim financials from their organization" ON claim_financials;
DROP POLICY IF EXISTS "Users can insert claim financials for their organization" ON claim_financials;
DROP POLICY IF EXISTS "Users can update claim financials from their organization" ON claim_financials;
DROP POLICY IF EXISTS "Users can delete claim financials from their organization" ON claim_financials;

CREATE POLICY "Users can view claim financials from their organization"
    ON claim_financials FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert claim financials for their organization"
    ON claim_financials FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update claim financials from their organization"
    ON claim_financials FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete claim financials from their organization"
    ON claim_financials FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

-- Update timestamp trigger for claim_financials
CREATE OR REPLACE FUNCTION update_claim_financials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS claim_financials_updated_at ON claim_financials;
CREATE TRIGGER claim_financials_updated_at
    BEFORE UPDATE ON claim_financials
    FOR EACH ROW
    EXECUTE FUNCTION update_claim_financials_updated_at();

-- Function to initialize financials for a new claim
CREATE OR REPLACE FUNCTION initialize_claim_financials()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO claim_financials (claim_id, organization_id, category)
    VALUES
        (NEW.id, NEW.organization_id, 'Bodily Injury'),
        (NEW.id, NEW.organization_id, 'Expense'),
        (NEW.id, NEW.organization_id, 'Property Damage'),
        (NEW.id, NEW.organization_id, 'Legal'),
        (NEW.id, NEW.organization_id, 'Other'),
        (NEW.id, NEW.organization_id, 'Recovery'),
        (NEW.id, NEW.organization_id, 'Subrogation');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS claims_initialize_financials ON claims;
CREATE TRIGGER claims_initialize_financials
    AFTER INSERT ON claims
    FOR EACH ROW
    EXECUTE FUNCTION initialize_claim_financials();
