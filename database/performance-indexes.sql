-- Performance Optimization Indexes for Claims App
-- Run this in Supabase SQL Editor to improve query performance

-- ============================================
-- CLIENTS TABLE INDEXES
-- ============================================

-- Index for filtering clients by organization (most common query)
CREATE INDEX IF NOT EXISTS idx_clients_organization_id
ON clients(organization_id);

-- Index for sorting by name
CREATE INDEX IF NOT EXISTS idx_clients_name
ON clients(name);

-- Full-text search index for client search functionality
CREATE INDEX IF NOT EXISTS idx_clients_search
ON clients
USING gin(to_tsvector('english',
  COALESCE(name, '') || ' ' ||
  COALESCE(ams_code, '') || ' ' ||
  COALESCE(client_number, '') || ' ' ||
  COALESCE(producer_name, '') || ' ' ||
  COALESCE(account_manager, '')
));

-- Composite index for organization + name (optimizes filtered sorting)
CREATE INDEX IF NOT EXISTS idx_clients_org_name
ON clients(organization_id, name);

-- ============================================
-- USER_PROFILES TABLE INDEXES
-- ============================================

-- Index for organization lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id
ON user_profiles(organization_id);

-- Index for role-based queries (admin/manager filtering)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role
ON user_profiles(role);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email
ON user_profiles(email);

-- ============================================
-- ORGANIZATIONS TABLE INDEXES
-- ============================================

-- Index for organization name searches
CREATE INDEX IF NOT EXISTS idx_organizations_name
ON organizations(name);

-- ============================================
-- OPTIONAL: ANALYZE TABLES
-- ============================================
-- Update table statistics for better query planning

ANALYZE clients;
ANALYZE user_profiles;
ANALYZE organizations;
