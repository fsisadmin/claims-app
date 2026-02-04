-- Sample Connected Data
-- Run this AFTER clearing the sample data
-- This creates locations and claims that are properly linked for ALL clients

DO $$
DECLARE
    org_id UUID;
    client_rec RECORD;
    loc_id UUID;
    loc_counter INT := 0;
BEGIN
    -- Get the first organization
    SELECT id INTO org_id FROM organizations LIMIT 1;

    -- Loop through ALL clients and create locations for each
    FOR client_rec IN SELECT id, name FROM clients WHERE organization_id = org_id
    LOOP
        RAISE NOTICE 'Creating locations for client: %', client_rec.name;

        -- Location 1: Main Office/HQ
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            client_rec.name || ' - Main Campus', client_rec.name, client_rec.name,
            (100 + loc_counter * 10)::text || ' Corporate Drive', 'Dallas', 'TX', '75201', 'Dallas',
            2, 50, 75000,
            'Fire Resistive', 2015,
            15000000, 350000, 15350000,
            'No', 'Very Low', 'Very Low', 'Very Low', 'X'
        ) RETURNING id INTO loc_id;

        -- Add claims for this location
        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-001', 'Employee', 'General Liability', client_rec.name || ' - Main Campus', 'OPEN', '2024-08-15', '2024-08-16', 'GL-2024-001', 'Slip and fall in lobby area.', 12000, 4000, 8000, 'Bodily Injury', 'Slip and Fall');

        loc_counter := loc_counter + 1;

        -- Location 2: Residential Complex A
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            'Oakwood Apartments', client_rec.name || ' Properties LLC', client_rec.name || ' Properties LLC',
            (200 + loc_counter * 10)::text || ' Oak Street', 'Plano', 'TX', '75024', 'Collin',
            4, 120, 145000,
            'Masonry', 2008,
            22000000, 450000, 22450000,
            'No', 'Low', 'Very Low', 'Very Low', 'X'
        ) RETURNING id INTO loc_id;

        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-002', 'Resident', 'Property', 'Oakwood Apartments', 'CLOSED', '2024-02-10', '2024-02-11', 'PROP-2024-001', 'Water damage from burst pipe in Unit 205.', 35000, 35000, 0, 'Property Damage', 'Water Damage'),
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-003', 'Visitor', 'General Liability', 'Oakwood Apartments', 'OPEN', '2024-10-05', '2024-10-06', 'GL-2024-001', 'Dog bite in common area.', 8500, 3000, 5500, 'Bodily Injury', 'Animal Bite');

        loc_counter := loc_counter + 1;

        -- Location 3: Residential Complex B
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            'Maple Ridge Townhomes', client_rec.name || ' Holdings', client_rec.name || ' Holdings',
            (300 + loc_counter * 10)::text || ' Maple Avenue', 'Fort Worth', 'TX', '76102', 'Tarrant',
            6, 180, 210000,
            'Wood Frame', 2001,
            28000000, 550000, 28550000,
            'No', 'Moderate', 'Very Low', 'Very Low', 'AE'
        ) RETURNING id INTO loc_id;

        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-004', client_rec.name || ' Holdings', 'Property', 'Maple Ridge Townhomes', 'OPEN', '2024-11-20', '2024-11-21', 'PROP-2024-001', 'Hail damage to multiple roofs after storm.', 85000, 30000, 55000, 'Property Damage', 'Hail');

        loc_counter := loc_counter + 1;

        -- Location 4: Commercial Property
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            'Riverside Plaza', client_rec.name || ' Commercial', client_rec.name || ' Commercial',
            (400 + loc_counter * 10)::text || ' River Road', 'Irving', 'TX', '75038', 'Dallas',
            1, 25, 55000,
            'Steel Frame', 2012,
            18000000, 400000, 18400000,
            'No', 'Low', 'Very Low', 'Very Low', 'X'
        ) RETURNING id INTO loc_id;

        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-005', 'Tenant', 'General Liability', 'Riverside Plaza', 'CLOSED', '2023-09-15', '2023-09-16', 'GL-2024-001', 'Trip and fall on uneven pavement.', 15000, 15000, 0, 'Bodily Injury', 'Trip and Fall');

        loc_counter := loc_counter + 1;

        -- Location 5: Senior Living
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            'Sunset Senior Living', client_rec.name || ' Senior Care LLC', client_rec.name || ' Senior Care LLC',
            (500 + loc_counter * 10)::text || ' Sunset Boulevard', 'Arlington', 'TX', '76010', 'Tarrant',
            3, 95, 120000,
            'Fire Resistive', 2019,
            32000000, 600000, 32600000,
            'No', 'Very Low', 'Very Low', 'Very Low', 'X'
        ) RETURNING id INTO loc_id;

        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-006', 'Resident Family', 'General Liability', 'Sunset Senior Living', 'OPEN', '2024-12-01', '2024-12-02', 'GL-2024-001', 'Fall in dining area. Resident injured.', 25000, 10000, 15000, 'Bodily Injury', 'Fall');

        loc_counter := loc_counter + 1;

        -- Location 6: Garden Apartments
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            'Garden View Apartments', client_rec.name || ' Residential', client_rec.name || ' Residential',
            (600 + loc_counter * 10)::text || ' Garden Lane', 'Richardson', 'TX', '75080', 'Dallas',
            5, 200, 240000,
            'Masonry', 1995,
            20000000, 380000, 20380000,
            'No', 'Low', 'Very Low', 'Very Low', 'X'
        ) RETURNING id INTO loc_id;

        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-007', 'Building Management', 'Property', 'Garden View Apartments', 'OPEN', '2024-07-20', '2024-07-21', 'PROP-2024-001', 'Fire damage in Unit 412. Kitchen fire spread to adjacent units.', 120000, 50000, 70000, 'Property Damage', 'Fire'),
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-008', 'Resident', 'General Liability', 'Garden View Apartments', 'CLOSED', '2024-04-10', '2024-04-11', 'GL-2024-001', 'Assault in parking lot.', 8000, 8000, 0, 'Bodily Injury', 'Assault');

        loc_counter := loc_counter + 1;

        -- Location 7: Luxury High Rise
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            'Downtown Tower', client_rec.name || ' Urban LLC', client_rec.name || ' Urban LLC',
            (700 + loc_counter * 10)::text || ' Main Street', 'Dallas', 'TX', '75202', 'Dallas',
            1, 300, 350000,
            'Reinforced Concrete', 2020,
            85000000, 1200000, 86200000,
            'No', 'Very Low', 'Very Low', 'Very Low', 'X'
        ) RETURNING id INTO loc_id;

        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-009', 'Condo Owner', 'Property', 'Downtown Tower', 'OPEN', '2024-09-30', '2024-10-01', 'PROP-2024-001', 'HVAC failure caused water damage to multiple floors.', 175000, 75000, 100000, 'Property Damage', 'Equipment Failure');

        loc_counter := loc_counter + 1;

        -- Location 8: Suburban Complex
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            'Willow Creek Estates', client_rec.name || ' Suburban Properties', client_rec.name || ' Suburban Properties',
            (800 + loc_counter * 10)::text || ' Willow Creek Drive', 'Frisco', 'TX', '75034', 'Collin',
            8, 250, 300000,
            'Wood Frame', 2010,
            35000000, 700000, 35700000,
            'No', 'Low', 'Very Low', 'Very Low', 'X'
        ) RETURNING id INTO loc_id;

        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-010', 'HOA', 'Property', 'Willow Creek Estates', 'CLOSED', '2023-12-15', '2023-12-16', 'PROP-2024-001', 'Wind damage to community center roof.', 45000, 45000, 0, 'Property Damage', 'Wind'),
        (org_id, client_rec.id, loc_id, 'CLM-' || loc_counter || '-011', 'Visitor', 'General Liability', 'Willow Creek Estates', 'OPEN', '2024-06-25', '2024-06-26', 'GL-2024-001', 'Pool area slip and fall.', 18000, 6000, 12000, 'Bodily Injury', 'Slip and Fall');

        loc_counter := loc_counter + 1;

    END LOOP;

    RAISE NOTICE 'Sample data created successfully!';
    RAISE NOTICE 'Created % total locations with claims.', loc_counter;
END $$;

-- Verify the data is linked
SELECT
    cl.name as client_name,
    COUNT(DISTINCT l.id) as location_count,
    COUNT(c.id) as claim_count,
    COALESCE(SUM(c.total_incurred), 0)::money as total_incurred
FROM clients cl
LEFT JOIN locations l ON l.client_id = cl.id
LEFT JOIN claims c ON c.location_id = l.id
GROUP BY cl.id, cl.name
ORDER BY cl.name;
