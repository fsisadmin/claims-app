-- Clear Sample Data
-- Run this in Supabase SQL Editor to delete all locations, claims, and incidents
-- WARNING: This will delete ALL data in these tables!

-- Delete in order of dependencies (children first)

-- Delete claim financials (depends on claims)
DELETE FROM claim_financials;

-- Delete claims
DELETE FROM claims;

-- Delete incidents
DELETE FROM incidents;

-- Delete locations
DELETE FROM locations;

-- Verify everything is cleared
SELECT 'claims' as table_name, COUNT(*) as count FROM claims
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'incidents', COUNT(*) FROM incidents
UNION ALL
SELECT 'claim_financials', COUNT(*) FROM claim_financials;
