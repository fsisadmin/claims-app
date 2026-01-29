-- Fix Security Warnings: Function Search Path Mutable
-- Run this in the Supabase SQL Editor
-- This sets a fixed search_path for all functions to prevent search path injection attacks

-- Fix update_claims_updated_at
CREATE OR REPLACE FUNCTION public.update_claims_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_incidents_updated_at
CREATE OR REPLACE FUNCTION public.update_incidents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_claim_financials_updated_at
CREATE OR REPLACE FUNCTION public.update_claim_financials_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix initialize_claim_financials
CREATE OR REPLACE FUNCTION public.initialize_claim_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Insert default financial rows for each category
    INSERT INTO public.claim_financials (claim_id, organization_id, category, reserves, paid, outstanding, incurred)
    VALUES
        (NEW.id, NEW.organization_id, 'Bodily Injury', 0, 0, 0, 0),
        (NEW.id, NEW.organization_id, 'Expense', 0, 0, 0, 0),
        (NEW.id, NEW.organization_id, 'Property Damage', 0, 0, 0, 0),
        (NEW.id, NEW.organization_id, 'Legal', 0, 0, 0, 0),
        (NEW.id, NEW.organization_id, 'Other', 0, 0, 0, 0),
        (NEW.id, NEW.organization_id, 'Recovery', 0, 0, 0, 0),
        (NEW.id, NEW.organization_id, 'Subrogation', 0, 0, 0, 0);
    RETURN NEW;
END;
$$;

-- Fix update_entity_tasks_updated_at
CREATE OR REPLACE FUNCTION public.update_entity_tasks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_entity_contacts_updated_at
CREATE OR REPLACE FUNCTION public.update_entity_contacts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix handle_new_user (if it exists - this is typically for user profile creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    RETURN NEW;
END;
$$;

-- Fix generate_invitation_token
-- Drop and recreate with proper search_path (returns TEXT, not TRIGGER)
DROP FUNCTION IF EXISTS public.generate_invitation_token();

CREATE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Note: For "auth_leaked_password_protection" warning:
-- This must be enabled in the Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Under "Password Protection", enable "Leaked password protection"
-- This checks passwords against HaveIBeenPwned.org database
