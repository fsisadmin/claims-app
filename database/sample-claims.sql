-- Sample Claims Data
-- Run this in Supabase SQL Editor after creating the claims table
-- Replace 'YOUR_ORGANIZATION_ID' with your actual organization UUID

-- First, get your organization ID:
-- SELECT id FROM organizations LIMIT 1;

-- Then replace the placeholder and run:

DO $$
DECLARE
    org_id UUID;
    client_1 UUID;
    client_2 UUID;
    loc_1 UUID;
    loc_2 UUID;
    loc_3 UUID;
BEGIN
    -- Get the first organization
    SELECT id INTO org_id FROM organizations LIMIT 1;

    -- Get some client IDs (adjust if needed)
    SELECT id INTO client_1 FROM clients WHERE organization_id = org_id LIMIT 1;
    SELECT id INTO client_2 FROM clients WHERE organization_id = org_id OFFSET 1 LIMIT 1;

    -- Get some location IDs
    SELECT id INTO loc_1 FROM locations WHERE organization_id = org_id LIMIT 1;
    SELECT id INTO loc_2 FROM locations WHERE organization_id = org_id OFFSET 1 LIMIT 1;
    SELECT id INTO loc_3 FROM locations WHERE organization_id = org_id OFFSET 2 LIMIT 1;

    -- Insert sample claims
    INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, tpa_claim_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
    VALUES
    -- Claim 1: Open GL claim
    (org_id, client_1, loc_1, 'NHP153091/CR2370303384', 'Sierra Moore', 'General Liability', 'Hollybush', 'OPEN', '2023-12-02', '2025-12-22', 'CR00R6Y23', NULL, 'Hollybush Gardens - Claimant was attacked by two assailants in her apartment.', 0.00, 0.00, 0.00, 'Bodily Injury', 'Assault'),

    -- Claim 2: Closed Property claim
    (org_id, client_1, loc_2, 'Loss Fund (WD) Termites', 'NHP Foundation', 'Property', '88 - Washington Dodd', 'CLOSED', '2025-12-03', '2025-12-05', '061384270', NULL, 'Washington Dodd - Resident call stating that the wall kitchen wall was soft/weak upon the contractor checking the issue, he stated that the wall was weakened due to termite issue', 0.00, 0.00, 0.00, 'Property Damage', 'Termite Damage'),

    -- Claim 3: Open GL with high incurred
    (org_id, client_2, loc_3, 'L0350368', 'Leslie Murphy', 'General Liability', '1 - NHP', 'OPEN', '2024-12-01', '2025-12-02', '9131S56233', NULL, 'Foxwood Manor- Summons Served - Alleging exposure to excess moisture. Entity Names for Location: Foxwood Preservation Partners LP, Foxwood Affordable Housing, Inc. NHP sold the location on 12/11/2024', 30000.00, 15000.00, 15000.00, 'Bodily Injury', 'Water Damage'),

    -- Claim 4: Open GL auto damage
    (org_id, client_1, loc_1, 'NHP151162', 'Roseann Storo', 'General Liability', 'Curtis Cofield Estates', 'OPEN', '2025-10-29', '2025-10-29', 'JTI25PANN0326604', NULL, 'Curtis Cofield- Theft/Damage to auto 104 Tyler Street, New Haven, CT 06519 $50,000- SIR', 1800.00, 1000.00, 800.00, 'Property Damage', 'Theft'),

    -- Claim 5: Open GL shooting
    (org_id, client_2, loc_2, 'M45575/NHP150630', 'Unknown Male', 'General Liability', 'Cleme Manor', 'OPEN', '2025-10-16', '2025-10-17', 'JTI25PANN0326604', 'M45575', 'Cleme Manor - Individual was shot and killed', 555.00, 555.00, 0.00, 'Bodily Injury', 'Shooting'),

    -- Claim 6: Closed GL shooting
    (org_id, client_1, loc_3, '115', 'Boyfriend of Ronnisha Lindsey', 'General Liability', '7 - Forest Park', 'CLOSED', '2025-09-22', '2025-10-10', 'JTI25PANN0326604', NULL, 'Forest Park shooting in apartment', 0.00, 0.00, 0.00, 'Bodily Injury', 'Shooting'),

    -- Claim 7: Closed GL fatality
    (org_id, client_2, loc_1, 'INCIDENT', 'Jyran', 'General Liability', '7 - Forest Park', 'CLOSED', '2025-10-06', '2025-10-09', 'JTI25PANN0326604', NULL, 'Forest Park - fatality - shooting - We are not the named insured on this claim', 0.00, 0.00, 0.00, 'Bodily Injury', 'Shooting'),

    -- Claim 8: Open Property water damage
    (org_id, client_1, loc_2, 'PROP-2025-001', 'Building Management', 'Property', 'Riverside Apartments', 'OPEN', '2025-01-15', '2025-01-16', 'POL-2025-789', 'TPA-45678', 'Water pipe burst in basement causing flooding to storage units and mechanical room. Emergency repairs completed.', 45000.00, 20000.00, 25000.00, 'Property Damage', 'Water Damage'),

    -- Claim 9: Pending GL slip and fall
    (org_id, client_2, loc_3, 'GL-2025-042', 'Maria Gonzalez', 'General Liability', 'Sunset Gardens', 'PENDING', '2025-01-10', '2025-01-12', 'POL-2025-456', 'TPA-78901', 'Slip and fall in parking lot due to ice. Claimant alleges back injury. Medical records requested.', 12500.00, 5000.00, 7500.00, 'Bodily Injury', 'Slip and Fall'),

    -- Claim 10: Open Workers Comp
    (org_id, client_1, loc_1, 'WC-2025-008', 'James Wilson', 'Workers Comp', 'Main Office', 'OPEN', '2025-01-20', '2025-01-21', 'WC-POL-2025', 'TPA-WC-123', 'Employee injured while lifting heavy equipment. Lower back strain reported. Out of work for 2 weeks.', 8500.00, 3500.00, 5000.00, 'Workers Compensation', 'Lifting Injury'),

    -- Claim 11: Denied claim
    (org_id, client_2, loc_2, 'GL-2024-156', 'Robert Chen', 'General Liability', 'Oak Plaza', 'DENIED', '2024-11-05', '2024-11-10', 'POL-2024-321', 'TPA-65432', 'Alleged trip and fall on sidewalk. Investigation revealed claimant was intoxicated and tripped over own feet. Claim denied.', 0.00, 0.00, 0.00, 'Bodily Injury', 'Trip and Fall'),

    -- Claim 12: Large property claim
    (org_id, client_1, loc_3, 'PROP-2024-089', 'Property Management LLC', 'Property', 'Willowbrook Estates', 'OPEN', '2024-08-15', '2024-08-16', 'PROP-POL-2024', 'TPA-PROP-456', 'Fire damage to Unit 3B. Originated from kitchen. Extensive smoke damage to adjacent units. Total of 4 units affected.', 175000.00, 100000.00, 75000.00, 'Property Damage', 'Fire'),

    -- Claim 13: Auto claim
    (org_id, client_2, loc_1, 'AUTO-2025-003', 'David Thompson', 'Auto', 'Company Fleet', 'CLOSED', '2025-01-05', '2025-01-06', 'AUTO-POL-2025', 'TPA-AUTO-789', 'Company vehicle rear-ended at intersection. Minor damage to bumper and taillight. No injuries reported.', 3200.00, 3200.00, 0.00, 'Property Damage', 'Auto Accident'),

    -- Claim 14: Open GL dog bite
    (org_id, client_1, loc_2, 'GL-2025-018', 'Sarah Patterson', 'General Liability', 'Maple Grove Apartments', 'OPEN', '2025-01-18', '2025-01-19', 'POL-2025-654', 'TPA-33445', 'Resident bitten by neighbors dog in common area. Required medical attention and stitches. Dog owner identified.', 6800.00, 2800.00, 4000.00, 'Bodily Injury', 'Animal Bite'),

    -- Claim 15: Closed property theft
    (org_id, client_2, loc_3, 'PROP-2024-201', 'ABC Management', 'Property', 'Downtown Office Complex', 'CLOSED', '2024-12-20', '2024-12-21', 'PROP-POL-2024-B', 'TPA-PROP-999', 'Break-in at office suite 405. Laptops and equipment stolen. Police report filed. Security footage reviewed.', 15000.00, 15000.00, 0.00, 'Property Damage', 'Theft/Burglary');

    RAISE NOTICE 'Sample claims inserted successfully!';
END $$;
