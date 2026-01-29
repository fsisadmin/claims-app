-- Sample Incident Data for AVS
-- Run this in the Supabase SQL Editor

-- This script will insert sample incidents for the client named 'AVS'
-- It dynamically looks up the client_id and location_ids

DO $$
DECLARE
    v_org_id UUID;
    v_client_id UUID;
    v_location_id_1 UUID;
    v_location_id_2 UUID;
    v_location_id_3 UUID;
BEGIN
    -- Get the organization_id and client_id for AVS
    SELECT c.organization_id, c.id INTO v_org_id, v_client_id
    FROM clients c
    WHERE c.name ILIKE '%AVS%'
    LIMIT 1;

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Client AVS not found. Please check the client name.';
    END IF;

    -- Get some location IDs for this client (if available)
    SELECT id INTO v_location_id_1 FROM locations WHERE client_id = v_client_id LIMIT 1 OFFSET 0;
    SELECT id INTO v_location_id_2 FROM locations WHERE client_id = v_client_id LIMIT 1 OFFSET 1;
    SELECT id INTO v_location_id_3 FROM locations WHERE client_id = v_client_id LIMIT 1 OFFSET 2;

    -- Insert sample incidents
    INSERT INTO incidents (
        organization_id, client_id, location_id,
        incident_details, incident_type, property_name,
        loss_date, report_date, event_description, status,
        reported_by, reported_by_email, reported_by_phone,
        cause_of_loss, injuries_reported, police_report_filed, police_report_number,
        claimant, policy, accident_description, accident_state,
        loss_street_1, loss_city, loss_state, loss_postal_code,
        incident_only, notes
    ) VALUES
    -- Incident 1: Slip and Fall
    (
        v_org_id, v_client_id, v_location_id_1,
        'Customer slip and fall in lobby area',
        'GL/Bodily Injury',
        'AVS Main Office',
        '2025-01-15', '2025-01-15',
        'Customer slipped on wet floor near the main entrance. Floor had been recently mopped but wet floor signs were not placed. Customer complained of back pain and was helped to a chair. Paramedics were called as a precaution.',
        'OPEN',
        'Mike Johnson', 'mike.johnson@avs.com', '555-123-4567',
        'Wet Floor', TRUE, FALSE, NULL,
        'Sarah Williams', 'GL-2025-001', 'Customer slipped on wet floor near entrance', 'TX',
        '1234 Main Street', 'Houston', 'TX', '77001',
        FALSE,
        'Customer was offered medical assistance. Incident report filed with building management.'
    ),
    -- Incident 2: Property Damage - Vehicle
    (
        v_org_id, v_client_id, v_location_id_2,
        'Vehicle struck building column in parking garage',
        'Property Incident',
        'AVS Warehouse',
        '2025-01-10', '2025-01-11',
        'Delivery truck backed into support column in parking structure causing visible damage to the concrete column and the truck''s rear bumper. Structural engineer to be called for assessment.',
        'UNDER_REVIEW',
        'Tom Anderson', 'tom.anderson@avs.com', '555-234-5678',
        'Vehicle Impact', FALSE, TRUE, 'PR-2025-00145',
        'ABC Logistics LLC', 'PROP-2025-002', 'Delivery truck struck parking structure column', 'TX',
        '5678 Industrial Blvd', 'Dallas', 'TX', '75201',
        FALSE,
        'Awaiting structural assessment report. Photos documented.'
    ),
    -- Incident 3: Third Party Property Damage
    (
        v_org_id, v_client_id, v_location_id_1,
        'Water damage to neighboring tenant space',
        'Third Party Property Damage',
        'AVS Main Office',
        '2025-01-08', '2025-01-08',
        'Pipe burst in ceiling above AVS office space causing water to leak into neighboring tenant''s suite below. Neighboring tenant reported damage to ceiling tiles, carpet, and some office equipment.',
        'OPEN',
        'Lisa Chen', 'lisa.chen@avs.com', '555-345-6789',
        'Water Damage', FALSE, FALSE, NULL,
        'NextDoor Corp', 'GL-2025-001', 'Water leak from burst pipe damaged neighboring tenant', 'TX',
        '1234 Main Street Suite 200', 'Houston', 'TX', '77001',
        FALSE,
        'Plumber dispatched immediately. Water shut off within 30 minutes. Restoration company contacted.'
    ),
    -- Incident 4: Employee Injury
    (
        v_org_id, v_client_id, v_location_id_3,
        'Employee injured while lifting heavy equipment',
        'Workers Comp',
        'AVS Distribution Center',
        '2025-01-05', '2025-01-05',
        'Warehouse employee strained lower back while attempting to lift a 75lb box without assistance. Employee reported immediate pain and was sent to urgent care. Returned with lifting restrictions for 2 weeks.',
        'CLOSED',
        'David Park', 'david.park@avs.com', '555-456-7890',
        'Lifting Injury', TRUE, FALSE, NULL,
        'James Rodriguez', 'WC-2025-003', 'Employee back injury from lifting', 'TX',
        '9012 Logistics Way', 'Austin', 'TX', '78701',
        TRUE,
        'Employee followed proper return to work protocol. Additional lifting training scheduled for warehouse staff.'
    ),
    -- Incident 5: Customer Injury - Minor
    (
        v_org_id, v_client_id, v_location_id_1,
        'Customer cut hand on broken door handle',
        'GL/Bodily Injury',
        'AVS Main Office',
        '2024-12-20', '2024-12-20',
        'Customer cut their hand on a broken door handle at the main entrance. The handle had a sharp metal edge that had come loose. First aid was administered on site. Customer declined further medical attention.',
        'CLOSED',
        'Jennifer White', 'jennifer.white@avs.com', '555-567-8901',
        'Sharp Object', TRUE, FALSE, NULL,
        'Robert Martinez', 'GL-2025-001', 'Customer injured by broken door handle', 'TX',
        '1234 Main Street', 'Houston', 'TX', '77001',
        TRUE,
        'Door handle replaced same day. Maintenance checklist updated to include door hardware inspection.'
    ),
    -- Incident 6: Fire Alarm - False
    (
        v_org_id, v_client_id, v_location_id_2,
        'False fire alarm - smoke from cooking',
        'Property Incident',
        'AVS Warehouse',
        '2024-12-15', '2024-12-15',
        'Fire alarm triggered in break room due to smoke from burned food in microwave. Building was evacuated per protocol. Fire department responded and confirmed false alarm. No damage occurred.',
        'CLOSED',
        'Mark Thompson', 'mark.thompson@avs.com', '555-678-9012',
        'False Alarm', FALSE, FALSE, NULL,
        NULL, NULL, 'False fire alarm from break room cooking smoke', 'TX',
        '5678 Industrial Blvd', 'Dallas', 'TX', '75201',
        TRUE,
        'Reminder sent to all employees about microwave safety. No property damage.'
    ),
    -- Incident 7: Theft
    (
        v_org_id, v_client_id, v_location_id_3,
        'Theft of equipment from loading dock',
        'Property Incident',
        'AVS Distribution Center',
        '2024-12-10', '2024-12-11',
        'Two pallets of electronics equipment discovered missing during morning inventory. Security camera footage shows unauthorized vehicle at loading dock at 2:15 AM. Estimated value: $45,000.',
        'OPEN',
        'Carlos Ramirez', 'carlos.ramirez@avs.com', '555-789-0123',
        'Theft', FALSE, TRUE, 'PR-2024-08234',
        NULL, 'PROP-2025-002', 'Theft of electronics from loading dock', 'TX',
        '9012 Logistics Way', 'Austin', 'TX', '78701',
        FALSE,
        'Police investigation ongoing. Security protocols under review. Additional cameras being installed.'
    ),
    -- Incident 8: Vandalism
    (
        v_org_id, v_client_id, v_location_id_1,
        'Graffiti on building exterior',
        'Property Incident',
        'AVS Main Office',
        '2024-12-05', '2024-12-05',
        'Graffiti discovered on the east wall of the building exterior. Approximately 10ft x 6ft area affected. Professional cleaning service scheduled.',
        'CLOSED',
        'Nancy Brown', 'nancy.brown@avs.com', '555-890-1234',
        'Vandalism', FALSE, TRUE, 'PR-2024-07856',
        NULL, 'PROP-2025-002', 'Graffiti vandalism on building exterior', 'TX',
        '1234 Main Street', 'Houston', 'TX', '77001',
        TRUE,
        'Cleaned within 48 hours. Cost: $800. Additional lighting installed in area.'
    );

    RAISE NOTICE 'Successfully inserted 8 sample incidents for AVS (client_id: %)', v_client_id;
END $$;

-- Verify the inserted data
SELECT
    incident_number,
    incident_details,
    incident_type,
    status,
    loss_date,
    claimant,
    property_name
FROM incidents
WHERE client_id = (SELECT id FROM clients WHERE name ILIKE '%AVS%' LIMIT 1)
ORDER BY incident_number DESC;
