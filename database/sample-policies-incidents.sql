-- Sample Policies and Incidents
-- Run this AFTER running sample-connected-data.sql
-- This creates policies linked to locations and incidents for each client

DO $$
DECLARE
    org_id UUID;
    client_rec RECORD;
    loc_rec RECORD;
    new_policy_id UUID;
    policy_counter INT := 0;
    incident_counter INT := 0;
BEGIN
    -- Get the first organization
    SELECT id INTO org_id FROM organizations LIMIT 1;

    -- Loop through ALL clients and create policies and incidents
    FOR client_rec IN SELECT id, name FROM clients WHERE organization_id = org_id
    LOOP
        RAISE NOTICE 'Creating policies and incidents for client: %', client_rec.name;

        -- Get the first location for this client (for incidents)
        SELECT id INTO loc_rec FROM locations WHERE client_id = client_rec.id LIMIT 1;

        -- ============================================
        -- POLICIES
        -- ============================================

        -- Policy 1: General Liability Policy (Active)
        INSERT INTO policies (
            organization_id, client_id, policy_number, policy_type, carrier,
            carrier_policy_number, effective_date, expiration_date,
            premium, deductible, per_occurrence_limit, aggregate_limit,
            status, notes
        ) VALUES (
            org_id, client_rec.id,
            'GL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(policy_counter::text, 3, '0'),
            'General Liability',
            'Liberty Mutual Insurance',
            'LM-GL-' || LPAD((100000 + policy_counter)::text, 6, '0'),
            DATE_TRUNC('year', CURRENT_DATE)::DATE,
            (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE,
            35000.00, 5000.00, 1000000.00, 2000000.00,
            'active',
            'Commercial General Liability coverage for all operations.'
        ) RETURNING id INTO new_policy_id;

        -- Link GL policy to first 3 locations for this client
        INSERT INTO policy_locations (policy_id, location_id, organization_id, location_tiv, location_premium)
        SELECT new_policy_id, l.id, org_id, l.total_tiv, 35000.00 / 3
        FROM locations l
        WHERE l.client_id = client_rec.id
        ORDER BY l.created_at
        LIMIT 3;

        policy_counter := policy_counter + 1;

        -- Policy 2: Property Policy (Active)
        INSERT INTO policies (
            organization_id, client_id, policy_number, policy_type, carrier,
            carrier_policy_number, effective_date, expiration_date,
            premium, deductible, per_occurrence_limit, aggregate_limit, total_insured_value,
            status, notes
        ) VALUES (
            org_id, client_rec.id,
            'PROP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(policy_counter::text, 3, '0'),
            'Property',
            'Travelers Insurance',
            'TR-PR-' || LPAD((200000 + policy_counter)::text, 6, '0'),
            DATE_TRUNC('year', CURRENT_DATE)::DATE,
            (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE,
            75000.00, 25000.00, 5000000.00, 10000000.00, 50000000.00,
            'active',
            'All-risk property coverage including buildings and contents.'
        ) RETURNING id INTO new_policy_id;

        -- Link Property policy to all locations for this client
        INSERT INTO policy_locations (policy_id, location_id, organization_id, location_tiv, location_premium)
        SELECT new_policy_id, l.id, org_id, l.total_tiv, 75000.00 / COUNT(*) OVER ()
        FROM locations l
        WHERE l.client_id = client_rec.id;

        policy_counter := policy_counter + 1;

        -- Policy 3: Umbrella Policy (Active)
        INSERT INTO policies (
            organization_id, client_id, policy_number, policy_type, carrier,
            carrier_policy_number, effective_date, expiration_date,
            premium, deductible, per_occurrence_limit, aggregate_limit,
            status, notes
        ) VALUES (
            org_id, client_rec.id,
            'UMB-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(policy_counter::text, 3, '0'),
            'Umbrella/Excess',
            'Chubb Insurance',
            'CB-UMB-' || LPAD((300000 + policy_counter)::text, 6, '0'),
            DATE_TRUNC('year', CURRENT_DATE)::DATE,
            (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE,
            18000.00, 10000.00, 5000000.00, 5000000.00,
            'active',
            'Umbrella liability coverage excess of primary GL.'
        ) RETURNING id INTO new_policy_id;

        policy_counter := policy_counter + 1;

        -- Policy 4: Workers Compensation (Active)
        INSERT INTO policies (
            organization_id, client_id, policy_number, policy_type, carrier,
            carrier_policy_number, effective_date, expiration_date,
            premium, deductible, per_occurrence_limit,
            status, notes
        ) VALUES (
            org_id, client_rec.id,
            'WC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(policy_counter::text, 3, '0'),
            'Workers Compensation',
            'Hartford Insurance',
            'HI-WC-' || LPAD((400000 + policy_counter)::text, 6, '0'),
            DATE_TRUNC('year', CURRENT_DATE)::DATE,
            (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE,
            42000.00, 0.00, 1000000.00,
            'active',
            'Statutory workers compensation coverage.'
        ) RETURNING id INTO new_policy_id;

        policy_counter := policy_counter + 1;

        -- Policy 5: Auto Policy (Expiring Soon)
        INSERT INTO policies (
            organization_id, client_id, policy_number, policy_type, carrier,
            carrier_policy_number, effective_date, expiration_date,
            premium, deductible, per_occurrence_limit, aggregate_limit,
            status, notes
        ) VALUES (
            org_id, client_rec.id,
            'AUTO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(policy_counter::text, 3, '0'),
            'Commercial Auto',
            'Progressive Commercial',
            'PC-CA-' || LPAD((500000 + policy_counter)::text, 6, '0'),
            (CURRENT_DATE - INTERVAL '11 months')::DATE,
            (CURRENT_DATE + INTERVAL '15 days')::DATE,
            28000.00, 1000.00, 1000000.00, 2000000.00,
            'active',
            'Commercial auto fleet coverage. RENEWAL NEEDED.'
        ) RETURNING id INTO new_policy_id;

        policy_counter := policy_counter + 1;

        -- Policy 6: Expired Property Policy (previous year)
        INSERT INTO policies (
            organization_id, client_id, policy_number, policy_type, carrier,
            carrier_policy_number, effective_date, expiration_date,
            premium, deductible, per_occurrence_limit, aggregate_limit,
            status, notes
        ) VALUES (
            org_id, client_rec.id,
            'PROP-' || TO_CHAR(NOW() - INTERVAL '1 year', 'YYYY') || '-' || LPAD(policy_counter::text, 3, '0'),
            'Property',
            'Travelers Insurance',
            'TR-PR-' || LPAD((600000 + policy_counter)::text, 6, '0'),
            (DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year')::DATE,
            (DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 day')::DATE,
            68000.00, 25000.00, 5000000.00, 10000000.00,
            'expired',
            'Previous year property policy - renewed.'
        ) RETURNING id INTO new_policy_id;

        policy_counter := policy_counter + 1;

        -- ============================================
        -- INCIDENTS
        -- ============================================

        -- Incident 1: Open incident - Slip and fall (not yet a claim)
        INSERT INTO incidents (
            organization_id, client_id, location_id,
            incident_details, incident_type, property_name, incident_only,
            loss_date, report_date, event_description, status,
            reported_by, reported_by_email, reported_by_phone,
            cause_of_loss, injuries_reported, police_report_filed
        )
        SELECT
            org_id, client_rec.id, l.id,
            'Minor slip in lobby area',
            'GL/Bodily Injury',
            l.location_name,
            TRUE,
            CURRENT_DATE - INTERVAL '5 days',
            CURRENT_DATE - INTERVAL '4 days',
            'Visitor reported slipping on wet floor in the main lobby. No visible injuries at time of report. Employee witnessed the incident and helped the visitor up. Visitor declined medical attention but requested incident be documented.',
            'OPEN',
            'John Smith', 'jsmith@' || LOWER(REPLACE(client_rec.name, ' ', '')) || '.com', '555-0101',
            'Slip and Fall', TRUE, FALSE
        FROM locations l
        WHERE l.client_id = client_rec.id
        LIMIT 1;

        incident_counter := incident_counter + 1;

        -- Incident 2: Under review - Property damage
        INSERT INTO incidents (
            organization_id, client_id, location_id,
            incident_details, incident_type, property_name, incident_only,
            loss_date, report_date, event_description, status,
            reported_by, reported_by_email,
            cause_of_loss, injuries_reported, police_report_filed
        )
        SELECT
            org_id, client_rec.id, l.id,
            'Water leak from HVAC unit',
            'Property Incident',
            l.location_name,
            TRUE,
            CURRENT_DATE - INTERVAL '3 days',
            CURRENT_DATE - INTERVAL '2 days',
            'Maintenance discovered water leaking from rooftop HVAC unit. Water damage to ceiling tiles in units below. Extent of damage still being assessed. HVAC contractor scheduled to evaluate unit.',
            'UNDER_REVIEW',
            'Mike Johnson', 'maintenance@' || LOWER(REPLACE(client_rec.name, ' ', '')) || '.com',
            'Equipment Failure', FALSE, FALSE
        FROM locations l
        WHERE l.client_id = client_rec.id
        OFFSET 1 LIMIT 1;

        incident_counter := incident_counter + 1;

        -- Incident 3: Closed incident - Vehicle damage in parking lot
        INSERT INTO incidents (
            organization_id, client_id, location_id,
            incident_details, incident_type, property_name, incident_only,
            loss_date, report_date, event_description, status,
            reported_by, reported_by_email, reported_by_phone,
            cause_of_loss, injuries_reported, police_report_filed, police_report_number,
            notes
        )
        SELECT
            org_id, client_rec.id, l.id,
            'Vehicle damaged by falling tree branch',
            'Third Party Property Damage',
            l.location_name,
            TRUE,
            CURRENT_DATE - INTERVAL '30 days',
            CURRENT_DATE - INTERVAL '29 days',
            'Large tree branch fell during storm and damaged a tenant vehicle in the parking lot. Vehicle sustained dents to hood and broken windshield. Tree has been trimmed by landscaping company.',
            'CLOSED',
            'Sarah Davis', 'property@' || LOWER(REPLACE(client_rec.name, ' ', '')) || '.com', '555-0202',
            'Weather - Wind', FALSE, TRUE, 'PR-' || incident_counter || '-2024',
            'Tenant filed claim with their own auto insurance. No further action required from property.'
        FROM locations l
        WHERE l.client_id = client_rec.id
        OFFSET 2 LIMIT 1;

        incident_counter := incident_counter + 1;

        -- Incident 4: Pending incident - Security concern
        INSERT INTO incidents (
            organization_id, client_id, location_id,
            incident_details, incident_type, property_name, incident_only,
            loss_date, report_date, event_description, status,
            reported_by, reported_by_email,
            cause_of_loss, injuries_reported, police_report_filed, police_report_number,
            notes
        )
        SELECT
            org_id, client_rec.id, l.id,
            'Unauthorized access to pool area after hours',
            'Security Incident',
            l.location_name,
            TRUE,
            CURRENT_DATE - INTERVAL '10 days',
            CURRENT_DATE - INTERVAL '10 days',
            'Security cameras captured individuals accessing the pool area after posted hours (11 PM). Gate lock appears to have been bypassed. No damage reported. Security has been increased in the area.',
            'PENDING',
            'Security Team', 'security@' || LOWER(REPLACE(client_rec.name, ' ', '')) || '.com',
            'Trespassing', FALSE, TRUE, 'PR-' || incident_counter || '-2024',
            'Reviewing security footage to identify individuals. Considering additional access controls.'
        FROM locations l
        WHERE l.client_id = client_rec.id
        OFFSET 3 LIMIT 1;

        incident_counter := incident_counter + 1;

    END LOOP;

    RAISE NOTICE 'Sample policies and incidents created successfully!';
    RAISE NOTICE 'Created % policies and % incidents.', policy_counter, incident_counter;
END $$;

-- ============================================
-- INITIALIZE CLAIM FINANCIALS FOR ALL CLAIMS
-- ============================================
-- This adds financial records for any claims that don't have them yet

INSERT INTO claim_financials (claim_id, organization_id, category, reserves, paid, outstanding, incurred)
SELECT
    c.id as claim_id,
    c.organization_id,
    cat.category,
    CASE
        WHEN cat.category = 'Bodily Injury' AND c.claim_type = 'Bodily Injury' THEN COALESCE(c.total_reserved, 0) * 0.7
        WHEN cat.category = 'Property Damage' AND c.claim_type = 'Property Damage' THEN COALESCE(c.total_reserved, 0) * 0.8
        WHEN cat.category = 'Expense' THEN COALESCE(c.total_reserved, 0) * 0.1
        WHEN cat.category = 'Legal' AND c.total_incurred > 50000 THEN COALESCE(c.total_reserved, 0) * 0.15
        ELSE 0
    END as reserves,
    CASE
        WHEN cat.category = 'Bodily Injury' AND c.claim_type = 'Bodily Injury' THEN COALESCE(c.total_paid, 0) * 0.7
        WHEN cat.category = 'Property Damage' AND c.claim_type = 'Property Damage' THEN COALESCE(c.total_paid, 0) * 0.8
        WHEN cat.category = 'Expense' THEN COALESCE(c.total_paid, 0) * 0.1
        ELSE 0
    END as paid,
    CASE
        WHEN cat.category = 'Bodily Injury' AND c.claim_type = 'Bodily Injury' THEN (COALESCE(c.total_reserved, 0) * 0.7) - (COALESCE(c.total_paid, 0) * 0.7)
        WHEN cat.category = 'Property Damage' AND c.claim_type = 'Property Damage' THEN (COALESCE(c.total_reserved, 0) * 0.8) - (COALESCE(c.total_paid, 0) * 0.8)
        WHEN cat.category = 'Expense' THEN (COALESCE(c.total_reserved, 0) * 0.1) - (COALESCE(c.total_paid, 0) * 0.1)
        WHEN cat.category = 'Legal' AND c.total_incurred > 50000 THEN COALESCE(c.total_reserved, 0) * 0.15
        ELSE 0
    END as outstanding,
    CASE
        WHEN cat.category = 'Bodily Injury' AND c.claim_type = 'Bodily Injury' THEN COALESCE(c.total_reserved, 0) * 0.7
        WHEN cat.category = 'Property Damage' AND c.claim_type = 'Property Damage' THEN COALESCE(c.total_reserved, 0) * 0.8
        WHEN cat.category = 'Expense' THEN COALESCE(c.total_reserved, 0) * 0.1
        WHEN cat.category = 'Legal' AND c.total_incurred > 50000 THEN COALESCE(c.total_reserved, 0) * 0.15
        ELSE 0
    END as incurred
FROM claims c
CROSS JOIN (
    SELECT 'Bodily Injury' as category UNION ALL
    SELECT 'Expense' UNION ALL
    SELECT 'Property Damage' UNION ALL
    SELECT 'Legal' UNION ALL
    SELECT 'Other' UNION ALL
    SELECT 'Recovery' UNION ALL
    SELECT 'Subrogation'
) cat
WHERE NOT EXISTS (
    SELECT 1 FROM claim_financials cf
    WHERE cf.claim_id = c.id AND cf.category = cat.category
)
ON CONFLICT (claim_id, category) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show policy counts per client
SELECT
    cl.name as client_name,
    COUNT(DISTINCT p.id) as policy_count,
    SUM(p.premium)::money as total_premium,
    COUNT(DISTINCT pl.location_id) as locations_covered
FROM clients cl
LEFT JOIN policies p ON p.client_id = cl.id
LEFT JOIN policy_locations pl ON pl.policy_id = p.id
GROUP BY cl.id, cl.name
ORDER BY cl.name;

-- Show incident counts per client
SELECT
    cl.name as client_name,
    COUNT(i.id) as incident_count,
    COUNT(CASE WHEN i.status = 'OPEN' THEN 1 END) as open_incidents,
    COUNT(CASE WHEN i.status = 'CLOSED' THEN 1 END) as closed_incidents
FROM clients cl
LEFT JOIN incidents i ON i.client_id = cl.id
GROUP BY cl.id, cl.name
ORDER BY cl.name;

-- Show claim financials summary
SELECT
    c.claim_number,
    c.total_incurred as claim_total_incurred,
    SUM(cf.incurred) as financials_total_incurred,
    COUNT(cf.id) as financial_categories
FROM claims c
LEFT JOIN claim_financials cf ON cf.claim_id = c.id
GROUP BY c.id, c.claim_number, c.total_incurred
ORDER BY c.claim_number
LIMIT 10;
