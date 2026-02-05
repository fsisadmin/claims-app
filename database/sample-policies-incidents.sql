-- Sample Policies and Incidents with VARIED content per client
-- Run this AFTER running sample-connected-data.sql
-- Each client gets unique carriers, premiums, limits, and incident descriptions

DO $$
DECLARE
    org_id UUID;
    client_rec RECORD;
    loc_rec RECORD;
    new_policy_id UUID;
    policy_counter INT := 0;
    incident_counter INT := 0;
    client_index INT := 0;

    -- Carrier arrays by policy type
    gl_carriers TEXT[] := ARRAY['Liberty Mutual', 'Travelers', 'The Hartford', 'CNA Insurance', 'Zurich', 'AIG', 'Chubb', 'Nationwide'];
    property_carriers TEXT[] := ARRAY['Travelers', 'FM Global', 'Zurich', 'AIG', 'Liberty Mutual', 'Chubb', 'Allianz', 'Swiss Re'];
    umbrella_carriers TEXT[] := ARRAY['Chubb', 'AIG', 'Zurich', 'Markel', 'Berkshire Hathaway', 'Everest Re', 'XL Catlin', 'Arch Insurance'];
    wc_carriers TEXT[] := ARRAY['The Hartford', 'Travelers', 'Liberty Mutual', 'AmTrust', 'Zenith Insurance', 'EMPLOYERS', 'Berkshire Hathaway', 'ICW Group'];
    auto_carriers TEXT[] := ARRAY['Progressive Commercial', 'Nationwide', 'Travelers', 'Liberty Mutual', 'GEICO Commercial', 'State Farm', 'Sentry Insurance', 'Great West'];

    -- Policy notes arrays
    gl_notes TEXT[] := ARRAY[
        'Commercial General Liability coverage for all operations.',
        'Includes products-completed operations coverage.',
        'Coverage extends to all named locations.',
        'Personal and advertising injury coverage included.',
        'Medical payments coverage at $10,000 per person.',
        'Blanket additional insured endorsement attached.',
        'Waiver of subrogation included for all contracts.',
        'Primary and non-contributory endorsement added.'
    ];
    property_notes TEXT[] := ARRAY[
        'All-risk property coverage including buildings and contents.',
        'Replacement cost valuation on all covered property.',
        'Business income coverage with 12-month extended period.',
        'Equipment breakdown coverage included.',
        'Flood coverage included for Zone X properties.',
        'Ordinance and law coverage at 25% of building limit.',
        'Debris removal coverage at $500,000.',
        'Tenant improvements coverage included.'
    ];
    umbrella_notes TEXT[] := ARRAY[
        'Umbrella liability coverage excess of primary GL.',
        'Follow-form coverage over underlying policies.',
        'Self-insured retention of $10,000.',
        'Includes drop-down coverage for certain exclusions.',
        'Defense costs outside the limit.',
        'Worldwide coverage territory.',
        'Employment practices liability excluded.',
        'Pollution liability excluded except hostile fire.'
    ];
    wc_notes TEXT[] := ARRAY[
        'Statutory workers compensation coverage.',
        'Employers liability limits at $1M/$1M/$1M.',
        'All states coverage endorsement.',
        'Voluntary compensation endorsement included.',
        'USL&H coverage included where applicable.',
        'Experience modification rate: 0.95',
        'Assigned risk pool - improving loss history.',
        'Return to work program discount applied.'
    ];
    auto_notes TEXT[] := ARRAY[
        'Commercial auto fleet coverage.',
        'Hired and non-owned auto coverage included.',
        'MCS-90 endorsement attached.',
        'Comprehensive and collision with $1,000 deductible.',
        'Uninsured/underinsured motorist coverage included.',
        'Medical payments at $5,000 per person.',
        'Rental reimbursement coverage included.',
        'Loading and unloading coverage extended.'
    ];

    -- Incident descriptions by type
    incident_slip TEXT[] := ARRAY[
        'Visitor slipped on wet floor near building entrance during storm.',
        'Resident fell on stairs due to worn carpet - ankle injury reported.',
        'Guest tripped over uneven sidewalk crack in parking area.',
        'Delivery person fell at loading dock - back strain reported.',
        'Child fell from playground equipment - minor scrapes.',
        'Elderly resident fell in hallway - hip injury suspected.',
        'Maintenance worker slipped in mechanical room.',
        'Pool deck slip and fall - guest hit head on concrete.'
    ];
    incident_water TEXT[] := ARRAY[
        'Water leak discovered from rooftop HVAC unit affecting two floors.',
        'Burst pipe in Unit 312 caused flooding to three units below.',
        'Washing machine hose failure flooded laundry room and hallway.',
        'Toilet overflow in penthouse damaged ceiling of unit below.',
        'Fire sprinkler accidentally discharged in storage room.',
        'Hot water heater failure caused significant basement flooding.',
        'Roof membrane failure during rain event - multiple leaks reported.',
        'HVAC condensate line backup caused ceiling damage in lobby.'
    ];
    incident_vehicle TEXT[] := ARRAY[
        'Vehicle struck building pillar in parking garage - structural check needed.',
        'Tree branch fell on parked car during storm - windshield broken.',
        'Hit and run in parking lot - tenant vehicle damaged.',
        'Delivery truck damaged awning over main entrance.',
        'Guest vehicle rolled into fence - no injuries.',
        'Trash truck damaged gate arm and access panel.',
        'Moving truck scraped building facade.',
        'Contractor vehicle leaked oil in parking lot.'
    ];
    incident_security TEXT[] := ARRAY[
        'Unauthorized access to pool area after hours - no damage.',
        'Package theft reported from mailroom - investigating.',
        'Graffiti discovered on building exterior.',
        'Broken window in common area - possible attempted entry.',
        'Suspicious person reported in parking garage - no incident.',
        'Key card system breach detected - access logs reviewed.',
        'Trespasser in vacant unit - police report filed.',
        'Vehicle break-ins reported in parking lot - 3 affected.'
    ];

    -- Reporter names
    reporters TEXT[] := ARRAY['John Smith', 'Maria Garcia', 'James Wilson', 'Sarah Johnson', 'Michael Brown', 'Jennifer Davis', 'Robert Martinez', 'Lisa Anderson'];

BEGIN
    -- Get the first organization
    SELECT id INTO org_id FROM organizations LIMIT 1;

    -- Loop through ALL clients and create policies and incidents
    FOR client_rec IN SELECT id, name FROM clients WHERE organization_id = org_id ORDER BY name
    LOOP
        RAISE NOTICE 'Creating policies and incidents for client: % (index %)', client_rec.name, client_index;

        -- Get the first location for this client (for incidents)
        SELECT id INTO loc_rec FROM locations WHERE client_id = client_rec.id LIMIT 1;

        -- ============================================
        -- POLICIES (varied by client)
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
            gl_carriers[(client_index % 8) + 1],
            'GL-' || LPAD((100000 + policy_counter)::text, 6, '0'),
            DATE_TRUNC('year', CURRENT_DATE)::DATE,
            (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE,
            25000.00 + (client_index * 5000),
            2500.00 + (client_index * 500),
            1000000.00 + (client_index * 250000),
            2000000.00 + (client_index * 500000),
            'active',
            gl_notes[(client_index % 8) + 1]
        ) RETURNING id INTO new_policy_id;

        -- Link GL policy to first 3 locations for this client
        INSERT INTO policy_locations (policy_id, location_id, organization_id, location_tiv, location_premium)
        SELECT new_policy_id, l.id, org_id, l.total_tiv, (25000.00 + (client_index * 5000)) / 3
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
            property_carriers[(client_index % 8) + 1],
            'PR-' || LPAD((200000 + policy_counter)::text, 6, '0'),
            DATE_TRUNC('year', CURRENT_DATE)::DATE,
            (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE,
            50000.00 + (client_index * 12000),
            10000.00 + (client_index * 2500),
            5000000.00 + (client_index * 1000000),
            10000000.00 + (client_index * 2000000),
            25000000.00 + (client_index * 10000000),
            'active',
            property_notes[(client_index % 8) + 1]
        ) RETURNING id INTO new_policy_id;

        -- Link Property policy to all locations for this client
        INSERT INTO policy_locations (policy_id, location_id, organization_id, location_tiv, location_premium)
        SELECT new_policy_id, l.id, org_id, l.total_tiv, (50000.00 + (client_index * 12000)) / COUNT(*) OVER ()
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
            umbrella_carriers[(client_index % 8) + 1],
            'UMB-' || LPAD((300000 + policy_counter)::text, 6, '0'),
            DATE_TRUNC('year', CURRENT_DATE)::DATE,
            (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE,
            12000.00 + (client_index * 3000),
            10000.00,
            5000000.00 + (client_index * 2500000),
            5000000.00 + (client_index * 2500000),
            'active',
            umbrella_notes[(client_index % 8) + 1]
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
            wc_carriers[(client_index % 8) + 1],
            'WC-' || LPAD((400000 + policy_counter)::text, 6, '0'),
            DATE_TRUNC('year', CURRENT_DATE)::DATE,
            (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE,
            30000.00 + (client_index * 6000),
            0.00,
            1000000.00,
            'active',
            wc_notes[(client_index % 8) + 1]
        ) RETURNING id INTO new_policy_id;

        policy_counter := policy_counter + 1;

        -- Policy 5: Auto Policy (Expiring Soon - varied timing)
        INSERT INTO policies (
            organization_id, client_id, policy_number, policy_type, carrier,
            carrier_policy_number, effective_date, expiration_date,
            premium, deductible, per_occurrence_limit, aggregate_limit,
            status, notes
        ) VALUES (
            org_id, client_rec.id,
            'AUTO-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(policy_counter::text, 3, '0'),
            'Commercial Auto',
            auto_carriers[(client_index % 8) + 1],
            'CA-' || LPAD((500000 + policy_counter)::text, 6, '0'),
            (CURRENT_DATE - ((10 + client_index) || ' months')::interval)::DATE,
            (CURRENT_DATE + ((20 - client_index) || ' days')::interval)::DATE,
            18000.00 + (client_index * 4000),
            500.00 + (client_index * 250),
            1000000.00,
            2000000.00,
            'active',
            auto_notes[(client_index % 8) + 1]
        ) RETURNING id INTO new_policy_id;

        policy_counter := policy_counter + 1;

        -- Policy 6: Expired Property Policy (previous year - varied)
        INSERT INTO policies (
            organization_id, client_id, policy_number, policy_type, carrier,
            carrier_policy_number, effective_date, expiration_date,
            premium, deductible, per_occurrence_limit, aggregate_limit,
            status, notes
        ) VALUES (
            org_id, client_rec.id,
            'PROP-' || TO_CHAR(NOW() - INTERVAL '1 year', 'YYYY') || '-' || LPAD(policy_counter::text, 3, '0'),
            'Property',
            property_carriers[((client_index + 4) % 8) + 1],
            'PR-' || LPAD((600000 + policy_counter)::text, 6, '0'),
            (DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 year')::DATE,
            (DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '1 day')::DATE,
            45000.00 + (client_index * 10000),
            10000.00 + (client_index * 2000),
            5000000.00 + (client_index * 800000),
            10000000.00 + (client_index * 1600000),
            'expired',
            'Previous year property policy - renewed with ' || property_carriers[(client_index % 8) + 1] || '.'
        ) RETURNING id INTO new_policy_id;

        policy_counter := policy_counter + 1;

        -- ============================================
        -- INCIDENTS (varied by client)
        -- ============================================

        -- Incident 1: Slip and fall (varied descriptions)
        INSERT INTO incidents (
            organization_id, client_id, location_id,
            incident_details, incident_type, property_name, incident_only,
            loss_date, report_date, event_description, status,
            reported_by, reported_by_email, reported_by_phone,
            cause_of_loss, injuries_reported, police_report_filed
        )
        SELECT
            org_id, client_rec.id, l.id,
            'Slip and fall incident - ' || CASE client_index % 4 WHEN 0 THEN 'minor' WHEN 1 THEN 'moderate' WHEN 2 THEN 'concerning' ELSE 'under investigation' END,
            'GL/Bodily Injury',
            l.location_name,
            TRUE,
            CURRENT_DATE - ((3 + client_index * 2) || ' days')::interval,
            CURRENT_DATE - ((2 + client_index * 2) || ' days')::interval,
            incident_slip[(client_index % 8) + 1],
            CASE client_index % 4 WHEN 0 THEN 'OPEN' WHEN 1 THEN 'UNDER_REVIEW' WHEN 2 THEN 'PENDING' ELSE 'OPEN' END,
            reporters[(client_index % 8) + 1],
            LOWER(REPLACE(reporters[(client_index % 8) + 1], ' ', '.')) || '@' || LOWER(REPLACE(client_rec.name, ' ', '')) || '.com',
            '555-01' || LPAD((client_index + 10)::text, 2, '0'),
            'Slip and Fall', TRUE, FALSE
        FROM locations l
        WHERE l.client_id = client_rec.id
        LIMIT 1;

        incident_counter := incident_counter + 1;

        -- Incident 2: Water/Property incident (varied)
        INSERT INTO incidents (
            organization_id, client_id, location_id,
            incident_details, incident_type, property_name, incident_only,
            loss_date, report_date, event_description, status,
            reported_by, reported_by_email,
            cause_of_loss, injuries_reported, police_report_filed
        )
        SELECT
            org_id, client_rec.id, l.id,
            'Water damage - ' || CASE client_index % 3 WHEN 0 THEN 'plumbing failure' WHEN 1 THEN 'HVAC related' ELSE 'storm damage' END,
            'Property Incident',
            l.location_name,
            TRUE,
            CURRENT_DATE - ((5 + client_index * 3) || ' days')::interval,
            CURRENT_DATE - ((4 + client_index * 3) || ' days')::interval,
            incident_water[(client_index % 8) + 1],
            CASE client_index % 3 WHEN 0 THEN 'UNDER_REVIEW' WHEN 1 THEN 'OPEN' ELSE 'PENDING' END,
            reporters[((client_index + 1) % 8) + 1],
            'maintenance@' || LOWER(REPLACE(client_rec.name, ' ', '')) || '.com',
            CASE client_index % 4 WHEN 0 THEN 'Water Damage' WHEN 1 THEN 'Equipment Failure' WHEN 2 THEN 'Weather' ELSE 'Plumbing' END,
            FALSE, FALSE
        FROM locations l
        WHERE l.client_id = client_rec.id
        OFFSET 1 LIMIT 1;

        incident_counter := incident_counter + 1;

        -- Incident 3: Vehicle/Property damage (varied)
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
            'Vehicle-related property damage',
            'Third Party Property Damage',
            l.location_name,
            TRUE,
            CURRENT_DATE - ((25 + client_index * 5) || ' days')::interval,
            CURRENT_DATE - ((24 + client_index * 5) || ' days')::interval,
            incident_vehicle[(client_index % 8) + 1],
            'CLOSED',
            reporters[((client_index + 2) % 8) + 1],
            'property@' || LOWER(REPLACE(client_rec.name, ' ', '')) || '.com',
            '555-02' || LPAD((client_index + 20)::text, 2, '0'),
            CASE client_index % 3 WHEN 0 THEN 'Vehicle Impact' WHEN 1 THEN 'Weather - Wind' ELSE 'Third Party Damage' END,
            FALSE, TRUE, 'PR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(incident_counter::text, 4, '0'),
            CASE client_index % 4
                WHEN 0 THEN 'Insurance claim filed by third party. No action required.'
                WHEN 1 THEN 'Damage repaired. Costs recovered from responsible party.'
                WHEN 2 THEN 'Minor damage. Absorbed as maintenance expense.'
                ELSE 'Claim denied by third party insurer. Under review.'
            END
        FROM locations l
        WHERE l.client_id = client_rec.id
        OFFSET 2 LIMIT 1;

        incident_counter := incident_counter + 1;

        -- Incident 4: Security incident (varied)
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
            'Security concern - ' || CASE client_index % 4 WHEN 0 THEN 'after hours access' WHEN 1 THEN 'suspicious activity' WHEN 2 THEN 'vandalism' ELSE 'theft report' END,
            'Security Incident',
            l.location_name,
            TRUE,
            CURRENT_DATE - ((12 + client_index * 4) || ' days')::interval,
            CURRENT_DATE - ((12 + client_index * 4) || ' days')::interval,
            incident_security[(client_index % 8) + 1],
            CASE client_index % 3 WHEN 0 THEN 'PENDING' WHEN 1 THEN 'OPEN' ELSE 'CLOSED' END,
            'Security Team',
            'security@' || LOWER(REPLACE(client_rec.name, ' ', '')) || '.com',
            CASE client_index % 4 WHEN 0 THEN 'Trespassing' WHEN 1 THEN 'Theft' WHEN 2 THEN 'Vandalism' ELSE 'Suspicious Activity' END,
            FALSE,
            CASE WHEN client_index % 2 = 0 THEN TRUE ELSE FALSE END,
            CASE WHEN client_index % 2 = 0 THEN 'PR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(incident_counter::text, 4, '0') ELSE NULL END,
            CASE client_index % 4
                WHEN 0 THEN 'Security cameras under review. Access controls being upgraded.'
                WHEN 1 THEN 'Working with local police on investigation.'
                WHEN 2 THEN 'Repairs completed. Incident closed.'
                ELSE 'Monitoring situation. No further action at this time.'
            END
        FROM locations l
        WHERE l.client_id = client_rec.id
        OFFSET 3 LIMIT 1;

        incident_counter := incident_counter + 1;

        client_index := client_index + 1;

    END LOOP;

    RAISE NOTICE 'Sample policies and incidents created successfully!';
    RAISE NOTICE 'Created % policies and % incidents across % clients.', policy_counter, incident_counter, client_index;
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

-- Show policy variety per client
SELECT
    cl.name as client_name,
    COUNT(DISTINCT p.id) as policy_count,
    COUNT(DISTINCT p.carrier) as unique_carriers,
    SUM(p.premium)::money as total_premium,
    COUNT(DISTINCT pl.location_id) as locations_covered
FROM clients cl
LEFT JOIN policies p ON p.client_id = cl.id
LEFT JOIN policy_locations pl ON pl.policy_id = p.id
GROUP BY cl.id, cl.name
ORDER BY cl.name;

-- Show carrier distribution
SELECT
    p.carrier,
    p.policy_type,
    COUNT(*) as policy_count
FROM policies p
GROUP BY p.carrier, p.policy_type
ORDER BY p.policy_type, p.carrier;

-- Show incident variety per client
SELECT
    cl.name as client_name,
    COUNT(i.id) as incident_count,
    STRING_AGG(DISTINCT i.incident_type, ', ') as incident_types,
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
