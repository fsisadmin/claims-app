-- Sample Connected Data with VARIED content per client
-- Run this AFTER clearing the sample data
-- Each client gets unique location names, cities, amounts, and claim descriptions

DO $$
DECLARE
    org_id UUID;
    client_rec RECORD;
    loc_id UUID;
    client_index INT := 0;
    loc_counter INT := 0;

    -- Location name arrays (8 options per type)
    loc_names_residential TEXT[] := ARRAY[
        'Parkview Apartments', 'Sunset Gardens', 'The Residences at Oak Hill', 'Harbor Point Condos',
        'Lakeview Terrace', 'Magnolia Heights', 'The Metropolitan', 'Riverside Commons'
    ];
    loc_names_townhomes TEXT[] := ARRAY[
        'Cedar Creek Townhomes', 'Willow Brook Village', 'Stonegate Crossing', 'Foxwood Estates',
        'Pinewood Commons', 'Ashford Place', 'Brookside Manor', 'Meadowview Terraces'
    ];
    loc_names_commercial TEXT[] := ARRAY[
        'Commerce Center Plaza', 'Business Park Tower', 'Market Square', 'Executive Suites',
        'Trade Center West', 'Corporate Commons', 'Gateway Office Park', 'Midtown Plaza'
    ];
    loc_names_senior TEXT[] := ARRAY[
        'Golden Years Living', 'Sunrise Senior Care', 'Peaceful Pines Retirement', 'Heritage House',
        'Autumn Leaves Community', 'Silver Lake Senior Living', 'Serenity Gardens', 'Comfort Care Living'
    ];
    loc_names_luxury TEXT[] := ARRAY[
        'The Pinnacle Tower', 'Grand Heights', 'Skyline Residences', 'The Monarch',
        'Prestige Place', 'Elevation Tower', 'Crown Point', 'Summit View'
    ];
    loc_names_garden TEXT[] := ARRAY[
        'Garden District Flats', 'Bloom Court Apartments', 'Greenway Village', 'Flora Heights',
        'Botanical Gardens Apts', 'Ivy Lane Commons', 'Rose Park Residences', 'Orchard View'
    ];
    loc_names_suburban TEXT[] := ARRAY[
        'Countryside Estates', 'Valley Ridge', 'Rolling Hills', 'Prairie View',
        'Timber Creek', 'Shadow Glen', 'Autumn Ridge', 'Westfield Commons'
    ];

    -- City arrays by region
    cities_tx TEXT[] := ARRAY['Dallas', 'Houston', 'Austin', 'San Antonio', 'Fort Worth', 'Plano', 'Irving', 'Frisco'];
    cities_fl TEXT[] := ARRAY['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Fort Lauderdale', 'Naples', 'Sarasota', 'West Palm Beach'];
    cities_ca TEXT[] := ARRAY['Los Angeles', 'San Diego', 'San Francisco', 'San Jose', 'Sacramento', 'Fresno', 'Oakland', 'Irvine'];
    cities_ny TEXT[] := ARRAY['New York', 'Buffalo', 'Rochester', 'Albany', 'Syracuse', 'White Plains', 'Yonkers', 'New Rochelle'];

    states TEXT[] := ARRAY['TX', 'FL', 'CA', 'NY', 'TX', 'FL', 'CA', 'NY'];
    zips_tx TEXT[] := ARRAY['75201', '77002', '78701', '78205', '76102', '75024', '75038', '75034'];
    zips_fl TEXT[] := ARRAY['33101', '33602', '32801', '32202', '33301', '34102', '34236', '33401'];
    zips_ca TEXT[] := ARRAY['90001', '92101', '94102', '95101', '95814', '93701', '94601', '92602'];
    zips_ny TEXT[] := ARRAY['10001', '14201', '14604', '12207', '13202', '10601', '10701', '10801'];

    counties_tx TEXT[] := ARRAY['Dallas', 'Harris', 'Travis', 'Bexar', 'Tarrant', 'Collin', 'Dallas', 'Collin'];
    counties_fl TEXT[] := ARRAY['Miami-Dade', 'Hillsborough', 'Orange', 'Duval', 'Broward', 'Collier', 'Sarasota', 'Palm Beach'];
    counties_ca TEXT[] := ARRAY['Los Angeles', 'San Diego', 'San Francisco', 'Santa Clara', 'Sacramento', 'Fresno', 'Alameda', 'Orange'];
    counties_ny TEXT[] := ARRAY['New York', 'Erie', 'Monroe', 'Albany', 'Onondaga', 'Westchester', 'Westchester', 'Westchester'];

    -- Construction types
    construction_types TEXT[] := ARRAY['Fire Resistive', 'Masonry', 'Wood Frame', 'Steel Frame', 'Reinforced Concrete', 'Masonry Non-Combustible', 'Heavy Timber', 'Light Metal'];

    -- Loss descriptions arrays
    loss_desc_slip TEXT[] := ARRAY[
        'Slip and fall in lobby area during rainy weather.',
        'Guest fell on wet floor near pool entrance.',
        'Resident tripped over loose carpet in hallway.',
        'Visitor fell on icy sidewalk near main entrance.',
        'Employee slipped in stairwell, injured ankle.',
        'Delivery person fell in loading dock area.',
        'Child fell from playground equipment.',
        'Senior resident fell in dining room.'
    ];
    loss_desc_water TEXT[] := ARRAY[
        'Water damage from burst pipe in Unit 205.',
        'Flooding from broken water heater in basement.',
        'Roof leak caused ceiling damage in multiple units.',
        'Sprinkler malfunction flooded two floors.',
        'Toilet overflow damaged downstairs unit.',
        'HVAC condensation leak damaged ceilings.',
        'Storm surge flooded ground floor units.',
        'Washing machine hose burst, flooded laundry room.'
    ];
    loss_desc_fire TEXT[] := ARRAY[
        'Kitchen fire spread to adjacent units.',
        'Electrical fire in utility closet.',
        'Grill fire on balcony damaged exterior.',
        'Dryer fire in laundry facility.',
        'Candle fire in bedroom, contained quickly.',
        'HVAC unit caught fire on rooftop.',
        'Vehicle fire in parking garage.',
        'Trash chute fire caused smoke damage.'
    ];
    loss_desc_property TEXT[] := ARRAY[
        'Hail damage to multiple roofs after severe storm.',
        'Wind damage to siding and windows.',
        'Vandalism to common area and pool furniture.',
        'Vehicle struck building, damaged entrance.',
        'Tree fell on carport, damaged 3 vehicles.',
        'Lightning strike damaged electrical systems.',
        'Tornado damage to multiple buildings.',
        'Foundation crack caused structural concerns.'
    ];
    loss_desc_liability TEXT[] := ARRAY[
        'Dog bite incident in common area.',
        'Assault in parking lot after hours.',
        'Trip and fall on uneven pavement.',
        'Food poisoning at community event.',
        'Security guard used excessive force.',
        'Swimming pool injury - diving accident.',
        'Elevator malfunction trapped residents.',
        'Exercise equipment failure caused injury.'
    ];

    -- Claimant types
    claimants TEXT[] := ARRAY['Resident', 'Visitor', 'Employee', 'Contractor', 'Tenant', 'Guest', 'Delivery Person', 'Maintenance Staff'];

    -- Cause of loss
    causes TEXT[] := ARRAY['Slip and Fall', 'Water Damage', 'Fire', 'Hail', 'Wind', 'Vandalism', 'Equipment Failure', 'Weather'];

    -- Variables for current client
    region_idx INT;
    city_arr TEXT[];
    zip_arr TEXT[];
    county_arr TEXT[];
    current_state TEXT;

BEGIN
    -- Get the first organization
    SELECT id INTO org_id FROM organizations LIMIT 1;

    -- Loop through ALL clients and create locations for each
    FOR client_rec IN SELECT id, name FROM clients WHERE organization_id = org_id ORDER BY name
    LOOP
        RAISE NOTICE 'Creating locations for client: % (index %)', client_rec.name, client_index;

        -- Determine region for this client (cycles through TX, FL, CA, NY)
        region_idx := client_index % 4;
        current_state := states[region_idx + 1];

        IF region_idx = 0 THEN
            city_arr := cities_tx; zip_arr := zips_tx; county_arr := counties_tx;
        ELSIF region_idx = 1 THEN
            city_arr := cities_fl; zip_arr := zips_fl; county_arr := counties_fl;
        ELSIF region_idx = 2 THEN
            city_arr := cities_ca; zip_arr := zips_ca; county_arr := counties_ca;
        ELSE
            city_arr := cities_ny; zip_arr := zips_ny; county_arr := counties_ny;
        END IF;

        -- Location 1: Main Office/HQ (unique per client)
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            client_rec.name || ' - Corporate Headquarters', client_rec.name, client_rec.name,
            (100 + client_index * 100)::text || ' ' || CASE client_index % 4 WHEN 0 THEN 'Commerce' WHEN 1 THEN 'Business' WHEN 2 THEN 'Corporate' ELSE 'Executive' END || ' Drive',
            city_arr[(client_index % 8) + 1], current_state, zip_arr[(client_index % 8) + 1], county_arr[(client_index % 8) + 1],
            1 + (client_index % 3), 20 + (client_index * 5), 50000 + (client_index * 10000),
            construction_types[(client_index % 8) + 1], 2010 + (client_index % 15),
            10000000 + (client_index * 2000000), 250000 + (client_index * 50000), 10250000 + (client_index * 2050000),
            CASE WHEN region_idx = 1 THEN 'Yes' ELSE 'No' END,
            CASE WHEN region_idx = 1 THEN 'High' WHEN region_idx = 2 THEN 'Moderate' ELSE 'Low' END,
            CASE WHEN region_idx = 2 THEN 'Moderate' ELSE 'Very Low' END,
            CASE WHEN region_idx = 2 THEN 'High' ELSE 'Very Low' END,
            CASE WHEN region_idx = 1 THEN 'AE' ELSE 'X' END
        ) RETURNING id INTO loc_id;

        -- Claim for HQ
        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES (
            org_id, client_rec.id, loc_id,
            'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(loc_counter::text, 4, '0'),
            claimants[(client_index % 8) + 1], 'General Liability',
            client_rec.name || ' - Corporate Headquarters',
            CASE WHEN client_index % 3 = 0 THEN 'OPEN' WHEN client_index % 3 = 1 THEN 'CLOSED' ELSE 'PENDING' END,
            CURRENT_DATE - ((client_index * 15 + 30) || ' days')::interval,
            CURRENT_DATE - ((client_index * 15 + 28) || ' days')::interval,
            'GL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
            loss_desc_slip[(client_index % 8) + 1],
            8000 + (client_index * 2500),
            3000 + (client_index * 1000),
            5000 + (client_index * 1500),
            'Bodily Injury', 'Slip and Fall'
        );
        loc_counter := loc_counter + 1;

        -- Location 2: Residential Complex A (varied names)
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            loc_names_residential[(client_index % 8) + 1], client_rec.name || ' Properties LLC', client_rec.name || ' Properties LLC',
            (200 + client_index * 50)::text || ' ' || CASE client_index % 4 WHEN 0 THEN 'Oak' WHEN 1 THEN 'Palm' WHEN 2 THEN 'Pine' ELSE 'Maple' END || ' Street',
            city_arr[((client_index + 1) % 8) + 1], current_state, zip_arr[((client_index + 1) % 8) + 1], county_arr[((client_index + 1) % 8) + 1],
            3 + (client_index % 5), 80 + (client_index * 20), 100000 + (client_index * 25000),
            construction_types[((client_index + 1) % 8) + 1], 2000 + (client_index % 20),
            18000000 + (client_index * 3000000), 400000 + (client_index * 75000), 18400000 + (client_index * 3075000),
            CASE WHEN region_idx = 1 THEN 'Yes' ELSE 'No' END,
            CASE WHEN region_idx = 1 THEN 'Moderate' ELSE 'Low' END,
            'Very Low',
            CASE WHEN region_idx = 2 THEN 'Moderate' ELSE 'Very Low' END,
            'X'
        ) RETURNING id INTO loc_id;

        -- Claims for Residential A
        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(loc_counter::text, 4, '0'),
         'Resident', 'Property', loc_names_residential[(client_index % 8) + 1],
         'CLOSED', CURRENT_DATE - ((60 + client_index * 10) || ' days')::interval, CURRENT_DATE - ((58 + client_index * 10) || ' days')::interval,
         'PROP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
         loss_desc_water[(client_index % 8) + 1],
         25000 + (client_index * 5000), 25000 + (client_index * 5000), 0, 'Property Damage', 'Water Damage'),
        (org_id, client_rec.id, loc_id, 'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((loc_counter + 1)::text, 4, '0'),
         claimants[((client_index + 2) % 8) + 1], 'General Liability', loc_names_residential[(client_index % 8) + 1],
         'OPEN', CURRENT_DATE - ((20 + client_index * 5) || ' days')::interval, CURRENT_DATE - ((18 + client_index * 5) || ' days')::interval,
         'GL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
         loss_desc_liability[(client_index % 8) + 1],
         6000 + (client_index * 1500), 2000 + (client_index * 500), 4000 + (client_index * 1000), 'Bodily Injury', causes[((client_index + 3) % 8) + 1]);
        loc_counter := loc_counter + 2;

        -- Location 3: Townhomes (varied names)
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            loc_names_townhomes[(client_index % 8) + 1], client_rec.name || ' Holdings', client_rec.name || ' Holdings',
            (300 + client_index * 75)::text || ' ' || CASE client_index % 4 WHEN 0 THEN 'Creek' WHEN 1 THEN 'Lake' WHEN 2 THEN 'River' ELSE 'Brook' END || ' Road',
            city_arr[((client_index + 2) % 8) + 1], current_state, zip_arr[((client_index + 2) % 8) + 1], county_arr[((client_index + 2) % 8) + 1],
            5 + (client_index % 4), 150 + (client_index * 30), 180000 + (client_index * 35000),
            construction_types[((client_index + 2) % 8) + 1], 1995 + (client_index % 25),
            24000000 + (client_index * 4000000), 500000 + (client_index * 100000), 24500000 + (client_index * 4100000),
            'No', 'Low', 'Very Low', 'Very Low',
            CASE WHEN client_index % 4 = 0 THEN 'AE' ELSE 'X' END
        ) RETURNING id INTO loc_id;

        -- Claim for Townhomes
        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES (
            org_id, client_rec.id, loc_id,
            'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(loc_counter::text, 4, '0'),
            client_rec.name || ' Holdings', 'Property', loc_names_townhomes[(client_index % 8) + 1],
            'OPEN', CURRENT_DATE - ((45 + client_index * 8) || ' days')::interval, CURRENT_DATE - ((43 + client_index * 8) || ' days')::interval,
            'PROP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
            loss_desc_property[(client_index % 8) + 1],
            60000 + (client_index * 15000), 20000 + (client_index * 5000), 40000 + (client_index * 10000),
            'Property Damage', causes[((client_index + 4) % 8) + 1]
        );
        loc_counter := loc_counter + 1;

        -- Location 4: Commercial Property (varied names)
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            loc_names_commercial[(client_index % 8) + 1], client_rec.name || ' Commercial', client_rec.name || ' Commercial',
            (400 + client_index * 60)::text || ' ' || CASE client_index % 4 WHEN 0 THEN 'Commerce' WHEN 1 THEN 'Trade' WHEN 2 THEN 'Market' ELSE 'Business' END || ' Boulevard',
            city_arr[((client_index + 3) % 8) + 1], current_state, zip_arr[((client_index + 3) % 8) + 1], county_arr[((client_index + 3) % 8) + 1],
            1, 15 + (client_index * 5), 40000 + (client_index * 8000),
            construction_types[((client_index + 3) % 8) + 1], 2005 + (client_index % 18),
            14000000 + (client_index * 2500000), 350000 + (client_index * 60000), 14350000 + (client_index * 2560000),
            'No', 'Low', 'Very Low', CASE WHEN region_idx = 2 THEN 'Moderate' ELSE 'Very Low' END, 'X'
        ) RETURNING id INTO loc_id;

        -- Claim for Commercial
        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES (
            org_id, client_rec.id, loc_id,
            'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(loc_counter::text, 4, '0'),
            'Tenant', 'General Liability', loc_names_commercial[(client_index % 8) + 1],
            'CLOSED', CURRENT_DATE - ((120 + client_index * 12) || ' days')::interval, CURRENT_DATE - ((118 + client_index * 12) || ' days')::interval,
            'GL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
            loss_desc_slip[((client_index + 2) % 8) + 1],
            12000 + (client_index * 3000), 12000 + (client_index * 3000), 0, 'Bodily Injury', 'Trip and Fall'
        );
        loc_counter := loc_counter + 1;

        -- Location 5: Senior Living (varied names)
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            loc_names_senior[(client_index % 8) + 1], client_rec.name || ' Senior Care LLC', client_rec.name || ' Senior Care LLC',
            (500 + client_index * 80)::text || ' ' || CASE client_index % 4 WHEN 0 THEN 'Sunset' WHEN 1 THEN 'Golden' WHEN 2 THEN 'Serene' ELSE 'Peaceful' END || ' Way',
            city_arr[((client_index + 4) % 8) + 1], current_state, zip_arr[((client_index + 4) % 8) + 1], county_arr[((client_index + 4) % 8) + 1],
            2 + (client_index % 3), 70 + (client_index * 15), 90000 + (client_index * 20000),
            'Fire Resistive', 2015 + (client_index % 10),
            28000000 + (client_index * 5000000), 550000 + (client_index * 100000), 28550000 + (client_index * 5100000),
            'No', 'Very Low', 'Very Low', 'Very Low', 'X'
        ) RETURNING id INTO loc_id;

        -- Claim for Senior Living
        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES (
            org_id, client_rec.id, loc_id,
            'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(loc_counter::text, 4, '0'),
            'Resident Family', 'General Liability', loc_names_senior[(client_index % 8) + 1],
            'OPEN', CURRENT_DATE - ((15 + client_index * 4) || ' days')::interval, CURRENT_DATE - ((13 + client_index * 4) || ' days')::interval,
            'GL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
            loss_desc_slip[((client_index + 4) % 8) + 1],
            18000 + (client_index * 4000), 6000 + (client_index * 1500), 12000 + (client_index * 2500),
            'Bodily Injury', 'Fall'
        );
        loc_counter := loc_counter + 1;

        -- Location 6: Garden Apartments (varied names)
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            loc_names_garden[(client_index % 8) + 1], client_rec.name || ' Residential', client_rec.name || ' Residential',
            (600 + client_index * 70)::text || ' ' || CASE client_index % 4 WHEN 0 THEN 'Garden' WHEN 1 THEN 'Bloom' WHEN 2 THEN 'Flora' ELSE 'Green' END || ' Lane',
            city_arr[((client_index + 5) % 8) + 1], current_state, zip_arr[((client_index + 5) % 8) + 1], county_arr[((client_index + 5) % 8) + 1],
            4 + (client_index % 4), 160 + (client_index * 25), 200000 + (client_index * 30000),
            construction_types[((client_index + 5) % 8) + 1], 1990 + (client_index % 30),
            16000000 + (client_index * 2800000), 320000 + (client_index * 55000), 16320000 + (client_index * 2855000),
            'No', 'Low', 'Very Low', 'Very Low', 'X'
        ) RETURNING id INTO loc_id;

        -- Claims for Garden Apartments
        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(loc_counter::text, 4, '0'),
         'Building Management', 'Property', loc_names_garden[(client_index % 8) + 1],
         'OPEN', CURRENT_DATE - ((90 + client_index * 7) || ' days')::interval, CURRENT_DATE - ((88 + client_index * 7) || ' days')::interval,
         'PROP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
         loss_desc_fire[(client_index % 8) + 1],
         95000 + (client_index * 20000), 40000 + (client_index * 8000), 55000 + (client_index * 12000), 'Property Damage', 'Fire'),
        (org_id, client_rec.id, loc_id, 'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((loc_counter + 1)::text, 4, '0'),
         'Resident', 'General Liability', loc_names_garden[(client_index % 8) + 1],
         'CLOSED', CURRENT_DATE - ((180 + client_index * 10) || ' days')::interval, CURRENT_DATE - ((178 + client_index * 10) || ' days')::interval,
         'GL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
         loss_desc_liability[((client_index + 6) % 8) + 1],
         7000 + (client_index * 1200), 7000 + (client_index * 1200), 0, 'Bodily Injury', causes[((client_index + 5) % 8) + 1]);
        loc_counter := loc_counter + 2;

        -- Location 7: Luxury High Rise (varied names)
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            loc_names_luxury[(client_index % 8) + 1], client_rec.name || ' Urban LLC', client_rec.name || ' Urban LLC',
            (700 + client_index * 50)::text || ' ' || CASE client_index % 4 WHEN 0 THEN 'Main' WHEN 1 THEN 'Central' WHEN 2 THEN 'Grand' ELSE 'First' END || ' Street',
            city_arr[((client_index + 6) % 8) + 1], current_state, zip_arr[((client_index + 6) % 8) + 1], county_arr[((client_index + 6) % 8) + 1],
            1, 250 + (client_index * 40), 300000 + (client_index * 50000),
            'Reinforced Concrete', 2018 + (client_index % 8),
            70000000 + (client_index * 12000000), 1000000 + (client_index * 200000), 71000000 + (client_index * 12200000),
            CASE WHEN region_idx = 1 THEN 'Yes' ELSE 'No' END,
            CASE WHEN region_idx = 1 THEN 'High' ELSE 'Very Low' END,
            'Very Low',
            CASE WHEN region_idx = 2 THEN 'High' ELSE 'Very Low' END,
            CASE WHEN region_idx = 1 THEN 'VE' ELSE 'X' END
        ) RETURNING id INTO loc_id;

        -- Claim for Luxury
        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES (
            org_id, client_rec.id, loc_id,
            'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(loc_counter::text, 4, '0'),
            'Condo Owner', 'Property', loc_names_luxury[(client_index % 8) + 1],
            'OPEN', CURRENT_DATE - ((35 + client_index * 6) || ' days')::interval, CURRENT_DATE - ((33 + client_index * 6) || ' days')::interval,
            'PROP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
            loss_desc_water[((client_index + 3) % 8) + 1],
            150000 + (client_index * 30000), 60000 + (client_index * 12000), 90000 + (client_index * 18000),
            'Property Damage', 'Equipment Failure'
        );
        loc_counter := loc_counter + 1;

        -- Location 8: Suburban Complex (varied names)
        INSERT INTO locations (
            organization_id, client_id, location_name, company, entity_name,
            street_address, city, state, zip, county,
            num_buildings, num_units, square_footage,
            construction_description, orig_year_built,
            real_property_value, personal_property_value, total_tiv,
            tier_1_wind, coastal_flooding_risk, wildfire_risk, earthquake_risk, flood_zone
        ) VALUES (
            org_id, client_rec.id,
            loc_names_suburban[(client_index % 8) + 1], client_rec.name || ' Suburban Properties', client_rec.name || ' Suburban Properties',
            (800 + client_index * 90)::text || ' ' || CASE client_index % 4 WHEN 0 THEN 'Country' WHEN 1 THEN 'Valley' WHEN 2 THEN 'Prairie' ELSE 'Meadow' END || ' Drive',
            city_arr[((client_index + 7) % 8) + 1], current_state, zip_arr[((client_index + 7) % 8) + 1], county_arr[((client_index + 7) % 8) + 1],
            6 + (client_index % 5), 200 + (client_index * 35), 260000 + (client_index * 40000),
            construction_types[((client_index + 7) % 8) + 1], 2005 + (client_index % 18),
            30000000 + (client_index * 5500000), 650000 + (client_index * 120000), 30650000 + (client_index * 5620000),
            'No', 'Low', 'Very Low', 'Very Low', 'X'
        ) RETURNING id INTO loc_id;

        -- Claims for Suburban
        INSERT INTO claims (organization_id, client_id, location_id, claim_number, claimant, coverage, property_name, status, loss_date, report_date, policy_number, loss_description, total_incurred, total_paid, total_reserved, claim_type, cause_of_loss)
        VALUES
        (org_id, client_rec.id, loc_id, 'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(loc_counter::text, 4, '0'),
         'HOA', 'Property', loc_names_suburban[(client_index % 8) + 1],
         'CLOSED', CURRENT_DATE - ((200 + client_index * 15) || ' days')::interval, CURRENT_DATE - ((198 + client_index * 15) || ' days')::interval,
         'PROP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
         loss_desc_property[((client_index + 5) % 8) + 1],
         38000 + (client_index * 8000), 38000 + (client_index * 8000), 0, 'Property Damage', 'Wind'),
        (org_id, client_rec.id, loc_id, 'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((loc_counter + 1)::text, 4, '0'),
         'Visitor', 'General Liability', loc_names_suburban[(client_index % 8) + 1],
         'OPEN', CURRENT_DATE - ((55 + client_index * 5) || ' days')::interval, CURRENT_DATE - ((53 + client_index * 5) || ' days')::interval,
         'GL-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(client_index::text, 3, '0'),
         loss_desc_slip[((client_index + 6) % 8) + 1],
         14000 + (client_index * 3500), 5000 + (client_index * 1200), 9000 + (client_index * 2300), 'Bodily Injury', 'Slip and Fall');
        loc_counter := loc_counter + 2;

        client_index := client_index + 1;

    END LOOP;

    RAISE NOTICE 'Sample data created successfully!';
    RAISE NOTICE 'Created % total locations with claims across % clients.', loc_counter, client_index;
END $$;

-- Verify the data is linked and varied
SELECT
    cl.name as client_name,
    l.state,
    COUNT(DISTINCT l.id) as location_count,
    COUNT(c.id) as claim_count,
    COALESCE(SUM(c.total_incurred), 0)::money as total_incurred
FROM clients cl
LEFT JOIN locations l ON l.client_id = cl.id
LEFT JOIN claims c ON c.location_id = l.id
GROUP BY cl.id, cl.name, l.state
ORDER BY cl.name;

-- Show location variety
SELECT
    cl.name as client,
    l.location_name,
    l.city,
    l.state
FROM clients cl
JOIN locations l ON l.client_id = cl.id
ORDER BY cl.name, l.location_name
LIMIT 30;
