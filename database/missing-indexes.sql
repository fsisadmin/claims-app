-- Missing Indexes for Query Optimization
-- Run this in Supabase SQL Editor to improve query performance
-- These indexes are based on actual query patterns in the application

-- ============================================================
-- COMMENTS & ATTACHMENTS (CommentSidebar.js queries heavily)
-- ============================================================

-- Comments are filtered by entity_type + entity_id + organization_id
-- and sorted by created_at DESC
CREATE INDEX IF NOT EXISTS idx_comments_entity_lookup
ON comments(entity_type, entity_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_comments_created_at
ON comments(created_at DESC);

-- Comment attachments are fetched using IN clause on comment_id
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id
ON comment_attachments(comment_id);

-- Entity attachments filtered similarly to comments
CREATE INDEX IF NOT EXISTS idx_entity_attachments_entity_lookup
ON entity_attachments(entity_type, entity_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_entity_attachments_created_at
ON entity_attachments(created_at DESC);

-- ============================================================
-- CLAIM FINANCIALS (fetched on claim detail page)
-- ============================================================

-- Financials queried by claim_id and sorted by category
CREATE INDEX IF NOT EXISTS idx_claim_financials_claim_id
ON claim_financials(claim_id);

CREATE INDEX IF NOT EXISTS idx_claim_financials_claim_category
ON claim_financials(claim_id, category);

-- ============================================================
-- USER INVITATIONS (lib/auth.js queries)
-- ============================================================

-- Invitations looked up by token with date filtering
CREATE INDEX IF NOT EXISTS idx_user_invitations_token
ON user_invitations(token) WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_invitations_org_status
ON user_invitations(organization_id, used_at, expires_at);

-- ============================================================
-- CLAIMS - Additional indexes for common query patterns
-- ============================================================

-- Claims filtered by client_id + organization_id, sorted by report_date
CREATE INDEX IF NOT EXISTS idx_claims_client_org_report
ON claims(client_id, organization_id, report_date DESC);

-- Claims filtered by location_id (for location detail claims tab)
CREATE INDEX IF NOT EXISTS idx_claims_location_org
ON claims(location_id, organization_id) WHERE location_id IS NOT NULL;

-- ============================================================
-- INCIDENTS - Common query patterns
-- ============================================================

-- Incidents filtered by client_id + organization_id
CREATE INDEX IF NOT EXISTS idx_incidents_client_org
ON incidents(client_id, organization_id);

-- Incidents sorted by incident_number for client detail
CREATE INDEX IF NOT EXISTS idx_incidents_client_org_number
ON incidents(client_id, organization_id, incident_number DESC);

-- ============================================================
-- LOCATIONS - Common query patterns
-- ============================================================

-- Locations filtered by client_id + organization_id (client detail page)
CREATE INDEX IF NOT EXISTS idx_locations_client_org
ON locations(client_id, organization_id);

-- Locations sorted by name for client detail
CREATE INDEX IF NOT EXISTS idx_locations_client_org_name
ON locations(client_id, organization_id, location_name);

-- ============================================================
-- CLIENTS - Common query patterns
-- ============================================================

-- Clients filtered by organization_id and sorted by name (home page)
CREATE INDEX IF NOT EXISTS idx_clients_org_name
ON clients(organization_id, name);

-- ============================================================
-- CLAIMS - Location detail page
-- ============================================================

-- Claims for location detail with loss_date sorting
CREATE INDEX IF NOT EXISTS idx_claims_location_org_date
ON claims(location_id, organization_id, loss_date DESC) WHERE location_id IS NOT NULL;

-- ============================================================
-- Verify indexes were created
-- ============================================================
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
