-- Sample Locations Data
-- Run this AFTER creating the locations table

-- Insert 10 sample locations for each client
INSERT INTO locations (
    client_id,
    organization_id,
    location_name,
    company,
    street_address,
    city,
    state,
    zip,
    county,
    num_buildings,
    num_units,
    square_footage,
    num_stories,
    construction_description,
    orig_year_built,
    occupancy,
    sprinklered,
    real_property_value,
    personal_property_value,
    bi_rental_income,
    total_tiv,
    flood_zone,
    tier_1_wind,
    earthquake_risk,
    tornado_risk,
    wildfire_risk,
    entity_name
)
SELECT
    c.id as client_id,
    c.organization_id,
    loc.location_name,
    c.name as company,
    loc.street_address,
    loc.city,
    loc.state,
    loc.zip,
    loc.county,
    loc.num_buildings,
    loc.num_units,
    loc.square_footage,
    loc.num_stories,
    loc.construction_description,
    loc.orig_year_built,
    loc.occupancy,
    loc.sprinklered,
    loc.real_property_value,
    loc.personal_property_value,
    loc.bi_rental_income,
    loc.real_property_value + loc.personal_property_value + loc.bi_rental_income as total_tiv,
    loc.flood_zone,
    loc.tier_1_wind,
    loc.earthquake_risk,
    loc.tornado_risk,
    loc.wildfire_risk,
    loc.entity_name
FROM clients c
CROSS JOIN (
    VALUES
    ('Sunset Apartments', '100 Main Street', 'Austin', 'TX', '78701', 'Travis', 4, 48, 52000, 3, 'Frame', '2005', 'Apartments', 'Y', 8500000.00, 150000.00, 720000.00, 'X', 'No', 'Very Low', 'Relatively Low', 'Relatively Low', 'Sunset Holdings LLC'),
    ('Oak Ridge Tower', '250 Commerce Ave', 'Dallas', 'TX', '75201', 'Dallas', 1, 120, 145000, 12, 'Fire Resistive', '2018', 'Apartments', 'Y', 42000000.00, 500000.00, 3200000.00, 'X', 'No', 'Very Low', 'Relatively Moderate', 'Very Low', 'Oak Ridge Partners LP'),
    ('Riverside Commons', '789 River Road', 'San Antonio', 'TX', '78205', 'Bexar', 8, 96, 88000, 2, 'Frame', '1998', 'Apartments', 'Y', 12500000.00, 200000.00, 1100000.00, 'AE', 'No', 'Very Low', 'Relatively Low', 'Very Low', 'Riverside Management Inc'),
    ('Pine Valley Estates', '456 Pine Street', 'Houston', 'TX', '77002', 'Harris', 12, 180, 165000, 2, 'Frame', '1992', 'Apartments', 'N', 22000000.00, 350000.00, 2400000.00, 'X', 'Yes', 'Very Low', 'Relatively Moderate', 'Very Low', 'Pine Valley Apartments LLC'),
    ('Harbor View Place', '321 Harbor Blvd', 'Corpus Christi', 'TX', '78401', 'Nueces', 6, 72, 68000, 3, 'Joisted Masonry', '2001', 'Apartments', 'Y', 9800000.00, 175000.00, 850000.00, 'VE', 'Yes', 'Very Low', 'Relatively Low', 'Relatively Moderate', 'Harbor View Holdings'),
    ('Mountain Creek Villas', '555 Mountain View Dr', 'El Paso', 'TX', '79901', 'El Paso', 10, 140, 128000, 2, 'Frame', '2010', 'Apartments', 'Y', 18500000.00, 280000.00, 1650000.00, 'X', 'No', 'Relatively Low', 'Relatively Low', 'Relatively Low', 'Mountain Creek LP'),
    ('Lakeside Gardens', '888 Lakeshore Dr', 'Fort Worth', 'TX', '76102', 'Tarrant', 5, 60, 55000, 2, 'Frame', '2003', 'Apartments', 'Y', 7200000.00, 125000.00, 680000.00, 'X', 'No', 'Very Low', 'Relatively Low', 'Very Low', 'Lakeside Property Group'),
    ('Central Park Residences', '200 Central Pkwy', 'Plano', 'TX', '75024', 'Collin', 3, 84, 92000, 4, 'Modified Fire Resistive', '2015', 'Apartments', 'Y', 28000000.00, 420000.00, 2100000.00, 'X', 'No', 'Very Low', 'Relatively Low', 'Very Low', 'Central Park Investors LLC'),
    ('Willow Creek Apartments', '777 Willow Lane', 'Arlington', 'TX', '76010', 'Tarrant', 7, 108, 98000, 2, 'Frame', '1995', 'Apartments', 'N', 14200000.00, 220000.00, 1280000.00, 'X', 'No', 'Very Low', 'Relatively Moderate', 'Very Low', 'Willow Creek Associates'),
    ('Magnolia Heights', '999 Magnolia Blvd', 'Irving', 'TX', '75039', 'Dallas', 9, 156, 142000, 3, 'Frame', '2008', 'Apartments', 'Y', 24500000.00, 380000.00, 1920000.00, 'X', 'No', 'Very Low', 'Relatively Low', 'Very Low', 'Magnolia Heights Partners')
) AS loc(location_name, street_address, city, state, zip, county, num_buildings, num_units, square_footage, num_stories, construction_description, orig_year_built, occupancy, sprinklered, real_property_value, personal_property_value, bi_rental_income, flood_zone, tier_1_wind, earthquake_risk, tornado_risk, wildfire_risk, entity_name);

-- Verify the insert
SELECT
    c.name as client_name,
    COUNT(l.id) as location_count
FROM clients c
LEFT JOIN locations l ON l.client_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;
