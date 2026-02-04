-- Link Claims to Locations
-- This script helps match claims to locations based on property_name
-- Run this in Supabase SQL Editor

-- First, let's see what claims don't have a location_id
SELECT
    c.id,
    c.claim_number,
    c.property_name,
    c.client_id,
    cl.name as client_name
FROM claims c
LEFT JOIN clients cl ON c.client_id = cl.id
WHERE c.location_id IS NULL
ORDER BY c.property_name;

-- Option 1: Auto-match by exact property_name = location_name
-- Preview what would be matched:
SELECT
    c.claim_number,
    c.property_name,
    l.location_name,
    l.id as location_id
FROM claims c
JOIN locations l ON
    LOWER(TRIM(c.property_name)) = LOWER(TRIM(l.location_name))
    AND c.client_id = l.client_id
WHERE c.location_id IS NULL;

-- To actually update, uncomment and run this:
/*
UPDATE claims c
SET location_id = l.id
FROM locations l
WHERE LOWER(TRIM(c.property_name)) = LOWER(TRIM(l.location_name))
    AND c.client_id = l.client_id
    AND c.location_id IS NULL;
*/

-- Option 2: Match by partial name (contains)
-- Preview what would be matched:
SELECT
    c.claim_number,
    c.property_name,
    l.location_name,
    l.id as location_id
FROM claims c
JOIN locations l ON
    (LOWER(c.property_name) LIKE '%' || LOWER(l.location_name) || '%'
     OR LOWER(l.location_name) LIKE '%' || LOWER(c.property_name) || '%')
    AND c.client_id = l.client_id
WHERE c.location_id IS NULL
    AND c.property_name IS NOT NULL
    AND l.location_name IS NOT NULL;

-- Option 3: Match by company field
SELECT
    c.claim_number,
    c.property_name,
    l.company,
    l.location_name,
    l.id as location_id
FROM claims c
JOIN locations l ON
    LOWER(TRIM(c.property_name)) = LOWER(TRIM(l.company))
    AND c.client_id = l.client_id
WHERE c.location_id IS NULL;

-- Manual linking: If you know specific claims should link to specific locations
-- UPDATE claims SET location_id = 'LOCATION_UUID' WHERE id = 'CLAIM_UUID';
