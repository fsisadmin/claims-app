-- Locations table schema
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Core Location Info
    location_name TEXT,
    company TEXT,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    county TEXT,
    full_address TEXT,
    condensed_city_state_zip TEXT,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    latitude_python DECIMAL(10, 6),
    longitude_python DECIMAL(10, 6),
    zipcode_trimmed TEXT,
    region TEXT,
    state_from_state TEXT,

    -- Building Info
    num_buildings INTEGER,
    num_units INTEGER,
    square_footage INTEGER,
    num_stories INTEGER,
    current_buildings TEXT,

    -- Construction Details
    iso_const TEXT,
    construction_description TEXT,
    orig_year_built TEXT,
    yr_bldg_updated TEXT,
    occupancy TEXT,
    percent_sprinklered TEXT,
    iso_prot_class TEXT,
    sprinklered TEXT,

    -- Financial Values
    real_property_value DECIMAL(15, 2),
    personal_property_value DECIMAL(15, 2),
    other_value DECIMAL(15, 2),
    bi_rental_income DECIMAL(15, 2),
    total_tiv DECIMAL(15, 2),
    deductible TEXT,
    nws_deductible TEXT,
    wind_hail_deductible TEXT,
    self_insured_retention TEXT,
    tiv_if_tier_1_wind_yes DECIMAL(15, 2),

    -- Risk Assessment
    flood_zone TEXT,
    is_prop_within_1000ft_saltwater TEXT,
    tier_1_wind TEXT,
    coastal_flooding TEXT,
    coastal_flooding_risk TEXT,
    earthquake TEXT,
    earthquake_risk TEXT,
    strong_wind TEXT,
    tornado TEXT,
    tornado_risk TEXT,
    wildfire TEXT,
    wildfire_risk TEXT,

    -- Entity & Insurance
    entity_name TEXT,
    lenders TEXT,
    lender_name_rollup TEXT,
    policies TEXT,
    policy TEXT,
    policy_id TEXT,
    coverage TEXT,
    loss_run_summary TEXT,
    policies_25_26 TEXT,

    -- Certificates - EPI
    epi TEXT,
    epi_certificate TEXT,
    epi_certificate_recipients TEXT,
    epi_certificate_to_use TEXT,
    epi_certificate_to_use_name TEXT,
    location_epi_additional_remarks TEXT,
    is_commercial_coverage_blanket TEXT,

    -- Certificates - COI
    coi_certificate TEXT,
    coi_certificate_recipients TEXT,
    coi_certificate_to_use TEXT,
    coi_location_specific_additional_remarks TEXT,

    -- Claims Data
    claims TEXT,
    documents_for_location TEXT,
    open_claim_rollup INTEGER,
    total_open_claims_rollup DECIMAL(15, 2),
    total_incurred_five_years_prop DECIMAL(15, 2),
    total_incurred_five_years_gl DECIMAL(15, 2),

    -- Status & Dates
    status TEXT,
    date_sold DATE,
    projected_close_date DATE,

    -- Acquisition
    acquisitions_clients TEXT,
    acquisition_address TEXT,
    om TEXT,

    -- IDs from source
    source_id TEXT,
    id_location TEXT,
    user_client_name TEXT,
    client_name_source TEXT,
    distinct_id_rollup TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_modified_by TEXT,
    last_modified TIMESTAMP WITH TIME ZONE,
    created_source TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_locations_client_id ON locations(client_id);
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_location_name ON locations(location_name);
CREATE INDEX IF NOT EXISTS idx_locations_state ON locations(state);

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first if they exist)
DROP POLICY IF EXISTS "Users can view locations from their organization" ON locations;
DROP POLICY IF EXISTS "Users can insert locations for their organization" ON locations;
DROP POLICY IF EXISTS "Users can update locations from their organization" ON locations;
DROP POLICY IF EXISTS "Users can delete locations from their organization" ON locations;

CREATE POLICY "Users can view locations from their organization"
    ON locations FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert locations for their organization"
    ON locations FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update locations from their organization"
    ON locations FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete locations from their organization"
    ON locations FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));
